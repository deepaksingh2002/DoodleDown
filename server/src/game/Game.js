import { GAME_PHASE, SOCKET_EVENTS, SCORING, WORD_MODES, ROOM_STATE } from '../config/constants.js';
import WordBank from '../utils/wordBank.js';
import wordService from '../services/word.service.js';
import gameHistoryService from '../services/gameHistory.service.js';
import roomLogService from '../services/roomLog.service.js';
import logger from '../utils/logger.js';
import env from '../config/env.js';


class Game {
  constructor(room) {
    this.room = room; // back-reference (for player list, settings, emit helper)
    this.settings = room.settings;

    this.totalRounds = this.settings.rounds;
    this.currentRoundNumber = 0; // increments each time every player has drawn once
    this.turnOrder = []; // array of player IDs
    this.turnIndex = -1; // pointer into turnOrder for current drawer within the round

    this.phase = null;
    this.currentDrawerId = null;
    this.currentWord = null;
    this.wordOptions = [];
    this.revealedIndices = new Set();
    this.guessOrder = []; // player IDs in the order they guessed correctly this round

    this.strokes = []; // stroke history for the CURRENT round (for late joiners / replay)

    this._timers = { wordChoice: null, roundEnd: null, hintReveals: [], intermission: null };
  }

  /** Helper to broadcast to every socket in this room */
  emitToRoom(event, payload) {
    this.room.io.to(this.room.id).emit(event, payload);
  }

  emitToPlayer(playerId, event, payload) {
    const player = this.room.getPlayer(playerId);
    if (player) this.room.io.to(player.socketId).emit(event, payload);
  }

  // Lifecycle

  async start() {
    this.turnOrder = this.room.listPlayers().map((p) => p.id);
    this.currentRoundNumber = 1;
    this.turnIndex = -1;
    this.gameStartedAt = Date.now();
    await this.startNextTurn();
  }

  /** Advances to the next drawer; rolls into a new round when the cycle completes */
  async startNextTurn() {
    this.clearAllTimers();
    this.turnIndex += 1;

    if (this.turnIndex >= this.turnOrder.length) {
      // Everyone has drawn once -> new round
      this.turnIndex = 0;
      this.currentRoundNumber += 1;
    }

    if (this.currentRoundNumber > this.totalRounds) {
      return this.endGame();
    }

    // Skip disconnected players
    const drawerId = this._findNextConnectedDrawer();
    if (!drawerId) {
      return this.endGame(); // nobody left to draw
    }

    this.currentDrawerId = drawerId;
    this.currentWord = null;
    this.revealedIndices = new Set();
    this.guessOrder = [];
    this.strokes = [];
    this.room.players.forEach((p) => p.resetRoundState());

    this.phase = GAME_PHASE.CHOOSING_WORD;
    // Combination mode: each round randomly behaves like Normal (hints shown) or
    // Hidden (no hints at all) - this is what distinguishes it from plain Normal/Hidden.
    this.roundIsHidden =
      this.settings.wordMode === WORD_MODES.COMBINATION
        ? Math.random() < 0.5
        : this.settings.wordMode === WORD_MODES.HIDDEN;

    // DB-backed word service (falls back to local JSON automatically if Mongo is down)
    this.wordOptions = await wordService.getRandomWords(
      this.settings.wordCount,
      this.settings.categories,
      this.settings.customWords
    );

    this.emitToRoom(SOCKET_EVENTS.ROUND_START, {
      round: this.currentRoundNumber,
      totalRounds: this.totalRounds,
      drawerId: this.currentDrawerId,
      drawTime: this.settings.drawTime,
    });

    // Only the drawer receives the actual word choices
    this.emitToPlayer(this.currentDrawerId, SOCKET_EVENTS.GAME_STATE, this.getState());
    this.emitToPlayer(this.currentDrawerId, 'word_options', { words: this.wordOptions });

    // Broadcast masked state to everyone else
    this.room.players.forEach((p) => {
      if (p.id !== this.currentDrawerId) {
        this.emitToPlayer(p.id, SOCKET_EVENTS.GAME_STATE, this.getState());
      }
    });

    // Auto-pick a word if the drawer doesn't choose in time
    this._timers.wordChoice = setTimeout(() => {
      this.chooseWord(this.wordOptions[0]);
    }, env.WORD_CHOICE_TIME_MS);

    return null;
  }

  _findNextConnectedDrawer() {
    for (let i = 0; i < this.turnOrder.length; i++) {
      const idx = (this.turnIndex + i) % this.turnOrder.length;
      const candidateId = this.turnOrder[idx];
      const player = this.room.getPlayer(candidateId);
      if (player && player.isConnected) {
        this.turnIndex = idx;
        return candidateId;
      }
    }
    return null;
  }

  /** Called when the drawer chooses a word (or auto-chosen on timeout) */
  chooseWord(word) {
    if (this.phase !== GAME_PHASE.CHOOSING_WORD) return;
    if (!this.wordOptions.includes(word)) {
      // guard against tampering - fall back to first option
      word = this.wordOptions[0];
    }

    clearTimeout(this._timers.wordChoice);
    this.currentWord = word;
    this.phase = GAME_PHASE.DRAWING;
    this.roundStartedAt = Date.now();

    // Broadcast updated (masked) state to everyone
    this.room.players.forEach((p) => {
      this.emitToPlayer(p.id, SOCKET_EVENTS.GAME_STATE, this.getState());
    });

    // Schedule hint reveals evenly spaced across draw time
    const hintCount = this.settings.hints;
    if (hintCount > 0) {
      const drawTimeMs = this.settings.drawTime * 1000;
      const revealableIndices = Array.from({ length: word.length }, (_, i) => i).filter(
        (i) => word[i] !== ' '
      );
      const shuffledIdx = revealableIndices.sort(() => Math.random() - 0.5);
      const maxHints = Math.min(hintCount, Math.max(revealableIndices.length - 1, 0));

      for (let h = 0; h < maxHints; h++) {
        const delay = Math.floor((drawTimeMs * (h + 1)) / (maxHints + 1));
        const timer = setTimeout(() => {
          this.revealedIndices.add(shuffledIdx[h]);
          this.room.players.forEach((p) => {
            if (p.id !== this.currentDrawerId) {
              this.emitToPlayer(p.id, SOCKET_EVENTS.GAME_STATE, this.getState());
            }
          });
        }, delay);
        this._timers.hintReveals.push(timer);
      }
    }

    this._timers.roundEnd = setTimeout(() => {
      this.endRound('time_up');
    }, this.settings.drawTime * 1000);
  }

  
  checkGuess(playerId, text) {
    const player = this.room.getPlayer(playerId);
    if (!player || playerId === this.currentDrawerId || player.hasGuessedCorrectly) {
      return { correct: false, close: false, points: 0, ignored: true };
    }
    if (this.phase !== GAME_PHASE.DRAWING || !this.currentWord) {
      return { correct: false, close: false, points: 0, ignored: true };
    }

    const { exact, close } = WordBank.compareGuess(text, this.currentWord);
    if (!exact) {
      return { correct: false, close, points: 0 };
    }

    // Scoring: earlier + faster guesses score higher
    const elapsedMs = Date.now() - this.roundStartedAt;
    const drawTimeMs = this.settings.drawTime * 1000;
    const timeRatio = Math.max(0, 1 - elapsedMs / drawTimeMs); // 1 = instant, 0 = last second
    const orderPenalty = this.guessOrder.length * 10; // each subsequent guesser scores a bit less
    const points = Math.max(
      SCORING.MIN_POINTS,
      Math.round(SCORING.BASE_POINTS * (0.4 + 0.6 * timeRatio) - orderPenalty)
    );

    player.hasGuessedCorrectly = true;
    player.addScore(points);
    this.guessOrder.push(playerId);

    // Drawer earns points too, for each correct guesser
    const drawer = this.room.getPlayer(this.currentDrawerId);
    if (drawer) drawer.addScore(SCORING.DRAWER_POINTS_PER_CORRECT_GUESSER);

    const guessers = this.room.listPlayers().filter((p) => p.id !== this.currentDrawerId);
    const allGuessed = guessers.length > 0 && guessers.every((p) => p.hasGuessedCorrectly);

    if (allGuessed) {
      // slight delay so the final guess_result reaches clients before round_end
      setTimeout(() => this.endRound('all_guessed'), 800);
    }

    return { correct: true, close: false, points, allGuessed };
  }

  endRound(reason = 'time_up') {
    if (this.phase === GAME_PHASE.ROUND_END || this.phase === GAME_PHASE.GAME_END) return;
    this.clearAllTimers();
    this.phase = GAME_PHASE.ROUND_END;

    const isLastTurnOfGame =
      this.currentRoundNumber >= this.totalRounds &&
      this.turnIndex >= this.turnOrder.length - 1;

    this.emitToRoom(SOCKET_EVENTS.ROUND_END, {
      reason,
      word: this.currentWord,
      scores: this.room.listPlayers().map((p) => p.toJSON()),
      nextDrawer: isLastTurnOfGame ? null : this._peekNextDrawerId(),
    });

    this._timers.intermission = setTimeout(() => {
      this.startNextTurn().catch((err) =>
        logger.error(`startNextTurn failed for room ${this.room.id}: ${err.message}`)
      );
    }, env.ROUND_INTERMISSION_MS);
  }

  _peekNextDrawerId() {
    const nextIdx = (this.turnIndex + 1) % this.turnOrder.length;
    return this.turnOrder[nextIdx];
  }

  endGame() {
    this.clearAllTimers();
    this.phase = GAME_PHASE.GAME_END;
    this.room.state = ROOM_STATE.ENDED;

    const leaderboard = this.room
      .listPlayers()
      .map((p) => p.toJSON())
      .sort((a, b) => b.score - a.score);
    const winner = leaderboard[0] || null;

    this.emitToRoom(SOCKET_EVENTS.GAME_OVER, { winner, leaderboard });

    logger.info(`Game ended for room ${this.room.id}. Winner: ${winner?.name}`);

    // Fire-and-forget persistence - never blocks or delays the game_over broadcast above.
    // Both services internally no-op (and log) if MongoDB isn't connected.
    roomLogService.logStateChange(this.room);
    gameHistoryService.recordGameEnd({
      room: this.room,
      leaderboard,
      winner,
      startedAt: this.gameStartedAt ? new Date(this.gameStartedAt) : null,
    });
  }

  // Drawing stroke history (for late joiners/spectators)

  recordStroke(stroke) {
    this.strokes.push(stroke);
  }

  clearStrokes() {
    this.strokes = [];
  }

  undoLastStroke() {
    this.strokes.pop();
  }

  // State serialization

  /** Word representation sent to non-drawers, respecting wordMode */
  getMaskedWord() {
    if (!this.currentWord) return null;
    if (this.roundIsHidden) return null;
    return WordBank.buildHintMask(this.currentWord, this.revealedIndices);
  }

  getState() {
    return {
      phase: this.phase,
      round: this.currentRoundNumber,
      totalRounds: this.totalRounds,
      drawerId: this.currentDrawerId,
      wordLength: this.currentWord ? this.currentWord.replace(/ /g, '').length : 0,
      hint: this.getMaskedWord(),
      isHidden: Boolean(this.roundIsHidden),
      timeRemainingMs:
        this.phase === GAME_PHASE.DRAWING
          ? Math.max(0, this.settings.drawTime * 1000 - (Date.now() - this.roundStartedAt))
          : null,
    };
  }

  clearAllTimers() {
    clearTimeout(this._timers.wordChoice);
    clearTimeout(this._timers.roundEnd);
    clearTimeout(this._timers.intermission);
    this._timers.hintReveals.forEach(clearTimeout);
    this._timers.hintReveals = [];
  }
}

export default Game;
