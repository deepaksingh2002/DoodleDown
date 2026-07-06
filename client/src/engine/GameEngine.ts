import { Emitter } from "../lib/emitter";
import { createSocket } from "../lib/socket";
import { Player } from "./Player";
import { pickBotName } from "./botNames";
import { randomWords, parseCustomWords } from "../lib/wordbank";
import type { Socket } from "socket.io-client";
import {
  DEFAULT_SETTINGS,
  MARKER_COLORS,
  type ChatMessage,
  type GameOverResult,
  type GameState,
  type Phase,
  type Player as PlayerData,
  type RoomSettings,
  type RoundResult,
  type Stroke,
  type StrokePoint,
} from "../types";
import { nextId } from "./Player";

type EngineEvents = {
  state: GameState;
  chat_message: ChatMessage;
  guess_result: { correct: boolean; playerId: string; playerName: string; points: number };
  round_end: RoundResult;
  game_over: GameOverResult;
};

const HINT_MIN_INTERVAL_SEC = 6;

type BackendRoomPlayer = {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
  hasGuessedCorrectly: boolean;
  isConnected: boolean;
};

type BackendRoomState = {
  id: string;
  isPrivate: boolean;
  settings: {
    maxPlayers: number;
    rounds: number;
    drawTime: number;
    wordCount: number;
    hints: number;
    wordMode: RoomSettings["wordMode"];
  };
  state: "waiting" | "playing" | "ended";
  players: BackendRoomPlayer[];
};

type RemoteSession = {
  roomId: string;
  playerName: string;
  hostToken?: string;
};

export class GameEngine {
  private emitter = new Emitter<EngineEvents>();
  readonly roomId: string;
  settings: RoomSettings;
  players: Player[] = [];
  meId: string;
  isRemote = false;

  phase: Phase = "lobby";
  round = 0;
  drawOrder: Player[] = [];
  drawerIndex = 0;
  strokes: Stroke[] = [];
  chat: ChatMessage[] = [];
  wordOptions: string[] = [];
  currentWord: string | null = null;
  revealedIndices: number[] = [];
  timeLeft = 0;
  lastRoundResult: RoundResult | null = null;
  gameOverResult: GameOverResult | null = null;

  private timerHandle: number | null = null;
  private hintHandles: number[] = [];
  private botTimeouts: number[] = [];
  private socket: Socket | null = null;
  private remoteDrawerId: string | null = null;
  private remoteWordLength: number | null = null;
  private remoteHintPattern: (string | null)[] = [];
  private seenEventIds = new Set<string>();
  private remotePlayerNames = new Map<string, string>();

  constructor(hostName: string, settings: RoomSettings = DEFAULT_SETTINGS, roomId?: string) {
    this.roomId = roomId ?? nextId("room").slice(0, 8).toUpperCase();
    this.settings = settings;
    const host = new Player(hostName, MARKER_COLORS[0], { isHost: true });
    this.meId = host.id;
    this.players.push(host);
  }

  async attachRemoteSession(socketUrl: string, session: RemoteSession): Promise<void> {
    this.isRemote = true;
    this.clearTimers();
    this.socket?.disconnect();
    this.socket = createSocket(socketUrl);
    this.seenEventIds.clear();
    this.remotePlayerNames.clear();

    const socket = this.socket;
    const markSeen = (eventId?: string) => {
      if (eventId) this.seenEventIds.add(eventId);
    };
    const alreadySeen = (eventId?: string) => !!eventId && this.seenEventIds.has(eventId);

    socket.on("connect", () => {
      socket.emit("join_room", { roomId: session.roomId, playerName: session.playerName, hostToken: session.hostToken }, (response: { success?: boolean; playerId?: string; room?: BackendRoomState } = {}) => {
        if (response.playerId) this.meId = response.playerId;
        if (response.room) this.syncFromRoom(response.room, response.playerId ?? this.meId);
      });
    });

    socket.on("game_state", (payload: { room?: BackendRoomState; you?: BackendRoomPlayer; phase?: string; round?: number; totalRounds?: number; drawerId?: string | null; wordLength?: number; hint?: string | null; timeRemainingMs?: number | null } = {}) => {
      if (payload.room) {
        this.syncFromRoom(payload.room, payload.you?.id ?? this.meId);
        return;
      }

      if (typeof payload.phase === "string") {
        this.phase = payload.phase === "choosing_word" ? "choosing" : payload.phase === "drawing" ? "drawing" : payload.phase === "round_end" ? "round_end" : "game_over";
      }
      if (typeof payload.round === "number") this.round = payload.round;
      if (typeof payload.totalRounds === "number") this.settings.rounds = payload.totalRounds;
      if (payload.drawerId !== undefined) this.setDrawerId(payload.drawerId);
      if (typeof payload.wordLength === "number") this.remoteWordLength = payload.wordLength;
      if (typeof payload.timeRemainingMs === "number" && payload.timeRemainingMs !== null) {
        this.timeLeft = Math.max(0, Math.ceil(payload.timeRemainingMs / 1000));
      }
      if (payload.hint !== undefined) {
        this.remoteHintPattern = payload.hint ? payload.hint.split(" ").map((ch) => (ch === "_" ? null : ch)) : [];
      }
      this.updateRemotePlayerFlags();
      this.publish();
    });

    socket.on("player_joined", ({ player, players, eventId }: { player?: BackendRoomPlayer; players?: BackendRoomPlayer[]; eventId?: string } = {}) => {
      if (alreadySeen(eventId)) return;
      markSeen(eventId);
      if (players?.length) {
        this.syncPlayers(players);
      } else if (player) {
        this.syncPlayers([...this.players.map((p) => this.playerToBackendPlayer(p)), player]);
      }
      if (player) this.systemMessage(`${player.name} joined the room.`);
    });

    socket.on("player_left", ({ playerId, players, newHostId, eventId }: { playerId?: string; players?: BackendRoomPlayer[]; newHostId?: string | null; eventId?: string } = {}) => {
      if (alreadySeen(eventId)) return;
      markSeen(eventId);
      if (players?.length) {
        this.syncPlayers(players);
      } else if (playerId) {
        this.players = this.players.filter((player) => player.id !== playerId);
        this.updateRemotePlayerFlags();
      }
      if (newHostId) {
        this.players = this.players.map((player) => {
          const nextPlayer = new Player(player.name, player.color, { isHost: player.id === newHostId, id: player.id });
          nextPlayer.score = player.score;
          nextPlayer.hasGuessedThisRound = player.hasGuessedThisRound;
          nextPlayer.connected = player.connected;
          nextPlayer.isDrawing = player.isDrawing;
          return nextPlayer;
        });
      }
      if (playerId) {
        this.systemMessage(`${this.remotePlayerNames.get(playerId) || playerId} left the room.`);
      }
      this.publish();
    });

    socket.on("round_start", ({ round, totalRounds, drawerId, drawTime }: { round?: number; totalRounds?: number; drawerId?: string | null; drawTime?: number } = {}) => {
      if (typeof round === "number") this.round = round;
      if (typeof totalRounds === "number") this.settings.rounds = totalRounds;
      if (typeof drawTime === "number") this.settings.drawTimeSec = drawTime;
      this.phase = "choosing";
      this.setDrawerId(drawerId ?? null);
      this.remoteWordLength = null;
      this.remoteHintPattern = [];
      this.wordOptions = [];
      this.currentWord = null;
      this.strokes = [];
      this.chat = [...this.chat.slice(-199), { id: nextId("sys"), playerId: "system", playerName: "System", text: "A new round is starting.", kind: "system" }];
      this.publish();
    });

    socket.on("word_options", ({ words, eventId }: { words?: string[]; eventId?: string } = {}) => {
      if (alreadySeen(eventId)) return;
      markSeen(eventId);
      this.wordOptions = words || [];
      this.publish();
    });

    socket.on("draw_data", (stroke: { type?: string; strokeId?: string; id?: string; point?: { x: number; y: number }; color?: string; size?: number; isEraser?: boolean; points?: { x: number; y: number }[]; clientEventId?: string } = {}) => {
      if (alreadySeen(stroke.clientEventId)) return;
      markSeen(stroke.clientEventId);
      if (stroke.type === "start") {
        const nextStroke = {
          id: stroke.strokeId || stroke.id || nextId("stroke"),
          color: stroke.color || MARKER_COLORS[0],
          size: stroke.size || 6,
          points: stroke.points || (stroke.point ? [stroke.point] : []),
          isEraser: Boolean(stroke.isEraser),
        };
        this.strokes = [...this.strokes, nextStroke];
      } else if (stroke.type === "move") {
        const target = this.strokes.find((item) => item.id === (stroke.strokeId || stroke.id));
        if (target && stroke.point) target.points.push(stroke.point);
      }
      this.publish();
    });

    socket.on("canvas_clear", ({ clientEventId }: { clientEventId?: string } = {}) => {
      if (alreadySeen(clientEventId)) return;
      markSeen(clientEventId);
      this.strokes = [];
      this.publish();
    });

    socket.on("draw_undo", ({ clientEventId }: { clientEventId?: string } = {}) => {
      if (alreadySeen(clientEventId)) return;
      markSeen(clientEventId);
      this.strokes = this.strokes.slice(0, -1);
      this.publish();
    });

    socket.on("chat_message", (message: { playerId?: string; playerName?: string; text?: string; isGuess?: boolean; close?: boolean; clientEventId?: string } = {}) => {
      if (alreadySeen(message.clientEventId)) return;
      markSeen(message.clientEventId);
      if (!message.text) return;
      this.pushChat({
        id: nextId("chat"),
        playerId: message.playerId || "system",
        playerName: message.playerName || "System",
        text: message.text,
        kind: message.isGuess ? (message.close ? "guess-close" : "chat") : "chat",
      });
    });

    socket.on("guess_result", ({ correct, playerId, playerName, points, clientEventId }: { correct?: boolean; playerId?: string; playerName?: string; points?: number; clientEventId?: string } = {}) => {
      if (!correct || alreadySeen(clientEventId)) return;
      markSeen(clientEventId);
      const player = this.players.find((item) => item.id === playerId);
      if (player) {
        player.hasGuessedThisRound = true;
        if (typeof points === "number") player.score += points;
      }
      this.pushChat({
        id: nextId("chat"),
        playerId: playerId || "system",
        playerName: playerName || this.remotePlayerNames.get(playerId || "") || "Player",
        text: `${playerName || "Someone"} guessed the word!`,
        kind: "guess-correct",
      });
      this.updateRemotePlayerFlags();
      this.publish();
    });

    socket.on("round_end", ({ word, scores, nextDrawer, eventId }: { word?: string; scores?: Array<{ playerId?: string; score?: number; total?: number; delta?: number }>; nextDrawer?: string | null; eventId?: string } = {}) => {
      if (alreadySeen(eventId)) return;
      markSeen(eventId);
      this.phase = "round_end";
      this.currentWord = word ?? null;
      this.lastRoundResult = {
        word: word || "",
        scores: (scores || this.players.map((player) => ({ playerId: player.id, total: player.score, delta: 0 }))).map((score) => ({ playerId: score.playerId || "", delta: score.delta ?? 0, total: score.total ?? 0 })),
        nextDrawerId: nextDrawer ?? null,
      };
      this.systemMessage(`Round over! The word was "${this.currentWord}".`);
      this.publish();
    });

    socket.on("game_over", ({ winner, leaderboard, eventId }: { winner?: PlayerData | null; leaderboard?: PlayerData[]; eventId?: string } = {}) => {
      if (alreadySeen(eventId)) return;
      markSeen(eventId);
      this.phase = "game_over";
      const decoratePlayer = (player: PlayerData | null): PlayerData | null => {
        if (!player) return null;
        const existing = this.players.find((item) => item.id === player.id);
        return existing ? existing.toData() : { ...player, color: MARKER_COLORS[0] };
      };
      this.gameOverResult = {
        winner: decoratePlayer(winner ?? null),
        leaderboard: (leaderboard ?? this.players.map((player) => player.toData())).map((player) => decoratePlayer(player) as PlayerData),
      };
      this.systemMessage("Game over!");
      this.publish();
    });

    socket.connect();
  }

  // ---------- subscription ----------
  on<K extends keyof EngineEvents>(event: K, cb: (payload: EngineEvents[K]) => void) {
    return this.emitter.on(event, cb);
  }

  private publish() {
    this.emitter.emit("state", this.snapshot());
  }

  snapshot(): GameState {
    const me = this.players.find((p) => p.id === this.meId) ?? null;
    const drawer = this.isRemote ? this.players.find((p) => p.id === this.remoteDrawerId) ?? null : this.drawOrder[this.drawerIndex] ?? null;
    const iAmDrawer = drawer?.id === this.meId;
    return {
      roomId: this.roomId,
      phase: this.phase,
      round: this.round,
      totalRounds: this.settings.rounds,
      drawerId: drawer?.id ?? null,
      wordLength: this.isRemote ? this.remoteWordLength : this.currentWord ? this.currentWord.length : null,
      revealedIndices: this.isRemote ? [] : this.revealedIndices,
      hintPattern: this.isRemote
        ? this.remoteHintPattern
        : this.currentWord
        ? this.currentWord.split("").map((ch, i) => (ch === " " ? " " : this.revealedIndices.includes(i) ? ch : null))
        : [],
      timeLeft: this.timeLeft,
      players: this.players.map((p) => p.toData()),
      strokes: this.strokes,
      chat: this.chat,
      settings: this.settings,
      wordOptions: iAmDrawer ? this.wordOptions : [],
      currentWord: iAmDrawer || this.phase === "round_end" || this.phase === "game_over" ? this.currentWord : null,
      lastRoundResult: this.lastRoundResult,
      gameOverResult: this.gameOverResult,
      me: me ? me.toData() : null,
    };
  }

  private playerToBackendPlayer(player: Player): BackendRoomPlayer {
    return {
      id: player.id,
      name: player.name,
      isHost: player.isHost,
      score: player.score,
      hasGuessedCorrectly: player.hasGuessedThisRound,
      isConnected: player.connected,
    };
  }

  private syncPlayers(players: BackendRoomPlayer[]): void {
    this.remotePlayerNames = new Map(players.map((player) => [player.id, player.name]));
    this.players = players.map((player, index) => {
      const existing = this.players.find((item) => item.id === player.id);
      const nextPlayer = new Player(player.name, existing?.color ?? MARKER_COLORS[index % MARKER_COLORS.length], { isHost: player.isHost, id: player.id });
      nextPlayer.score = player.score;
      nextPlayer.hasGuessedThisRound = player.hasGuessedCorrectly;
      nextPlayer.connected = player.isConnected;
      nextPlayer.isDrawing = player.id === this.remoteDrawerId;
      return nextPlayer;
    });
    this.drawerIndex = Math.max(0, this.players.findIndex((player) => player.id === this.remoteDrawerId));
    this.drawOrder = [...this.players];
    this.updateRemotePlayerFlags();
  }

  private syncFromRoom(room: BackendRoomState, meId: string): void {
    this.settings = {
      ...this.settings,
      maxPlayers: room.settings.maxPlayers,
      rounds: room.settings.rounds,
      drawTimeSec: room.settings.drawTime,
      wordCount: room.settings.wordCount,
      hints: room.settings.hints,
      wordMode: room.settings.wordMode,
    };
    this.phase = room.state === "waiting" ? "lobby" : this.phase;
    this.meId = meId;
    this.syncPlayers(room.players);
    this.updateRemotePlayerFlags();
    this.publish();
  }

  private setDrawerId(drawerId: string | null): void {
    this.remoteDrawerId = drawerId;
    this.drawerIndex = Math.max(0, this.players.findIndex((player) => player.id === drawerId));
    this.drawOrder = [...this.players];
    this.updateRemotePlayerFlags();
  }

  private updateRemotePlayerFlags(): void {
    if (!this.isRemote) return;
    this.players = this.players.map((player) => {
      const nextPlayer = new Player(player.name, player.color, { isHost: player.isHost, id: player.id });
      nextPlayer.score = player.score;
      nextPlayer.hasGuessedThisRound = player.hasGuessedThisRound;
      nextPlayer.connected = player.connected;
      nextPlayer.isDrawing = player.id === this.remoteDrawerId;
      return nextPlayer;
    });
  }

  // ---------- lobby / room management ----------
  addBot(): void {
    if (this.players.length >= this.settings.maxPlayers) return;
    const usedColors = this.players.map((p) => p.color);
    const color = MARKER_COLORS.find((c) => !usedColors.includes(c)) ?? MARKER_COLORS[this.players.length % MARKER_COLORS.length];
    const name = pickBotName(this.players.map((p) => p.name));
    const bot = new Player(name, color, { isBot: true });
    this.players.push(bot);
    this.systemMessage(`${name} joined the room.`);
    this.publish();
  }

  removePlayer(id: string): void {
    const p = this.players.find((pl) => pl.id === id);
    this.players = this.players.filter((pl) => pl.id !== id);
    if (p) this.systemMessage(`${p.name} left the room.`);
    this.publish();
  }

  updateSettings(patch: Partial<RoomSettings>): void {
    if (this.isRemote) return;
    if (this.phase !== "lobby") return;
    this.settings = { ...this.settings, ...patch };
    this.publish();
  }

  // ---------- game flow ----------
  startGame(): void {
    if (this.isRemote && this.socket) {
      this.socket.emit("start_game", { clientEventId: nextId("evt") });
      return;
    }
    if (this.players.length < 2) return;
    this.round = 1;
    this.drawOrder = [...this.players];
    this.drawerIndex = -1;
    this.players.forEach((p) => (p.score = 0));
    this.systemMessage("The game has started!");
    this.advanceTurn();
  }

  private advanceTurn(): void {
    this.clearTimers();
    this.drawerIndex += 1;
    if (this.drawerIndex >= this.drawOrder.length) {
      this.drawerIndex = 0;
      this.round += 1;
      if (this.round > this.settings.rounds) {
        this.endGame();
        return;
      }
    }
    this.players.forEach((p) => p.resetRoundFlags());
    const drawer = this.drawOrder[this.drawerIndex];
    drawer.isDrawing = true;
    this.strokes = [];
    this.revealedIndices = [];
    this.currentWord = null;
    const customPool = parseCustomWords(this.settings.customWords);
    this.wordOptions = randomWords(this.settings.wordCount, customPool, this.settings.useCustomWordsOnly);
    this.phase = "choosing";
    this.systemMessage(`${drawer.name} is picking a word...`);
    this.publish();

    if (drawer.isBot) {
      const t = window.setTimeout(() => {
        const word = this.wordOptions[Math.floor(Math.random() * this.wordOptions.length)];
        this.chooseWord(word, drawer.id);
      }, 1200 + Math.random() * 1200);
      this.botTimeouts.push(t);
    }
  }

  chooseWord(word: string, drawerIdOverride?: string): void {
    if (this.isRemote && this.socket) {
      const me = this.players.find((player) => player.id === this.meId);
      if (me && this.remoteDrawerId && this.remoteDrawerId !== me.id) return;
      this.currentWord = word;
      this.phase = "drawing";
      this.timeLeft = this.settings.drawTimeSec;
      this.remoteWordLength = word.replace(/ /g, "").length;
      this.remoteHintPattern = [];
      this.revealedIndices = [];
      this.socket.emit("word_chosen", { word, clientEventId: nextId("evt") });
      this.publish();
      return;
    }
    const drawer = this.drawOrder[this.drawerIndex];
    if (!drawer) return;
    if (drawerIdOverride && drawer.id !== drawerIdOverride) return;
    this.currentWord = word;
    this.phase = "drawing";
    this.timeLeft = this.settings.drawTimeSec;
    this.revealedIndices = [];
    this.publish();
    this.startTimer();
    this.scheduleHints();
    if (drawer.isBot) this.runBotDrawing(drawer);
    else this.scheduleBotGuesses(drawer);
  }

  private startTimer(): void {
    this.timerHandle = window.setInterval(() => {
      this.timeLeft -= 1;
      if (this.timeLeft <= 0) {
        this.endRound();
        return;
      }
      this.publish();
    }, 1000);
  }

  private scheduleHints(): void {
    const { hints, drawTimeSec } = this.settings;
    if (!hints || !this.currentWord) return;
    const wordLen = this.currentWord.length;
    const revealable = [...Array(wordLen).keys()].filter(
      (i) => this.currentWord![i] !== " "
    );
    const maxHints = Math.min(hints, Math.max(revealable.length - 1, 0));
    const interval = Math.max(HINT_MIN_INTERVAL_SEC, Math.floor((drawTimeSec * 0.7) / (maxHints || 1)));
    for (let h = 1; h <= maxHints; h++) {
      const delay = h * interval * 1000;
      const handle = window.setTimeout(() => {
        const remaining = revealable.filter((i) => !this.revealedIndices.includes(i));
        if (!remaining.length) return;
        const idx = remaining[Math.floor(Math.random() * remaining.length)];
        this.revealedIndices = [...this.revealedIndices, idx];
        this.publish();
      }, delay);
      this.hintHandles.push(handle);
    }
  }

  private runBotDrawing(drawer: Player): void {
    // Generate a simple pseudo-doodle: a handful of short random strokes,
    // streamed in over time so it feels "live" for the human viewers.
    const strokeCount = 4 + Math.floor(Math.random() * 4);
    for (let s = 0; s < strokeCount; s++) {
      const delay = 400 + s * (600 + Math.random() * 500);
      const handle = window.setTimeout(() => {
        if (this.phase !== "drawing") return;
        const stroke = this.randomDoodleStroke(drawer.color);
        this.strokes = [...this.strokes, stroke];
        this.publish();
      }, delay);
      this.botTimeouts.push(handle);
    }
    this.scheduleBotGuesses(drawer);
  }

  private randomDoodleStroke(color: string): Stroke {
    const points: StrokePoint[] = [];
    const startX = 100 + Math.random() * 800;
    const startY = 100 + Math.random() * 400;
    let x = startX;
    let y = startY;
    const segments = 6 + Math.floor(Math.random() * 8);
    for (let i = 0; i < segments; i++) {
      x += (Math.random() - 0.5) * 120;
      y += (Math.random() - 0.5) * 120;
      x = Math.max(20, Math.min(980, x));
      y = Math.max(20, Math.min(580, y));
      points.push({ x, y });
    }
    return { id: nextId("stroke"), color, size: 4 + Math.random() * 4, points, isEraser: false };
  }

  private scheduleBotGuesses(drawer: Player): void {
    const guessers = this.players.filter((p) => p.isBot && p.id !== drawer.id);
    guessers.forEach((bot) => {
      // Chance a bot ever guesses this round, and roughly when.
      if (Math.random() < 0.15) return; // some bots just don't get it
      const hintsBoost = this.settings.hints > 0 ? 0.7 : 1;
      const delaySec = (5 + Math.random() * (this.settings.drawTimeSec - 8)) * hintsBoost;
      const handle = window.setTimeout(() => {
        if (this.phase !== "drawing" || bot.hasGuessedThisRound) return;
        this.registerCorrectGuess(bot);
      }, delaySec * 1000);
      this.botTimeouts.push(handle);
    });
  }

  // ---------- drawing input (human drawer) ----------
  addStroke(stroke: Stroke): void {
    if (this.isRemote && this.socket) {
      this.strokes = [...this.strokes, stroke];
      this.socket.emit("draw_start", { ...stroke, strokeId: stroke.id, point: stroke.points[0], clientEventId: nextId("evt") });
      this.publish();
      return;
    }
    if (this.phase !== "drawing") return;
    const drawer = this.drawOrder[this.drawerIndex];
    if (drawer?.id !== this.meId) return;
    this.strokes = [...this.strokes, stroke];
    this.publish();
  }

  appendPoint(strokeId: string, point: StrokePoint): void {
    if (this.isRemote && this.socket) {
      const stroke = this.strokes.find((item) => item.id === strokeId);
      if (!stroke) return;
      stroke.points.push(point);
      this.socket.emit("draw_move", { strokeId, point, clientEventId: nextId("evt") });
      this.publish();
      return;
    }
    if (this.phase !== "drawing") return;
    const s = this.strokes.find((st) => st.id === strokeId);
    if (!s) return;
    s.points.push(point);
    this.publish();
  }

  undoLastStroke(): void {
    if (this.isRemote && this.socket) {
      this.strokes = this.strokes.slice(0, -1);
      this.socket.emit("draw_undo", { clientEventId: nextId("evt") });
      this.publish();
      return;
    }
    const drawer = this.drawOrder[this.drawerIndex];
    if (drawer?.id !== this.meId) return;
    this.strokes = this.strokes.slice(0, -1);
    this.publish();
  }

  clearCanvas(): void {
    if (this.isRemote && this.socket) {
      this.strokes = [];
      this.socket.emit("canvas_clear", { clientEventId: nextId("evt") });
      this.publish();
      return;
    }
    const drawer = this.drawOrder[this.drawerIndex];
    if (drawer?.id !== this.meId) return;
    this.strokes = [];
    this.publish();
  }

  // ---------- chat / guessing ----------
  sendChat(text: string): void {
    if (this.isRemote && this.socket) {
      const me = this.players.find((player) => player.id === this.meId);
      if (!me || !text.trim()) return;
      if (this.phase === "drawing" && this.remoteDrawerId !== this.meId && !me.hasGuessedThisRound) {
        this.submitGuess(text);
        return;
      }
      this.socket.emit("chat", { text, clientEventId: nextId("evt") });
      return;
    }
    const me = this.players.find((p) => p.id === this.meId);
    if (!me || !text.trim()) return;
    if (this.phase === "drawing" && this.drawOrder[this.drawerIndex]?.id !== this.meId && !me.hasGuessedThisRound) {
      this.submitGuess(text);
      return;
    }
    this.pushChat({ id: nextId("chat"), playerId: me.id, playerName: me.name, text, kind: "chat" });
  }

  submitGuess(text: string): void {
    if (this.isRemote && this.socket) {
      this.socket.emit("guess", { text, clientEventId: nextId("evt") });
      return;
    }
    const me = this.players.find((p) => p.id === this.meId);
    if (!me || this.phase !== "drawing" || me.hasGuessedThisRound) return;
    const drawer = this.drawOrder[this.drawerIndex];
    if (drawer?.id === me.id) return;

    const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
    const guess = normalize(text);
    const word = normalize(this.currentWord ?? "");

    if (guess === word) {
      this.registerCorrectGuess(me);
      return;
    }

    // "Close!" feedback: same length, mostly matching letters.
    const isClose =
      word.length > 3 &&
      guess.length === word.length &&
      guess.split("").filter((c, i) => c === word[i]).length >= word.length - 2;

    this.pushChat({
      id: nextId("chat"),
      playerId: me.id,
      playerName: me.name,
      text,
      kind: isClose ? "guess-close" : "chat",
    });
  }

  private registerCorrectGuess(player: Player): void {
    if (player.hasGuessedThisRound || this.phase !== "drawing") return;
    player.hasGuessedThisRound = true;

    const guessersBefore = this.players.filter((p) => p.hasGuessedThisRound && p.id !== player.id && !p.isDrawing).length;
    const timeFraction = Math.max(this.timeLeft / this.settings.drawTimeSec, 0.1);
    const orderFactor = Math.max(1 - guessersBefore * 0.15, 0.35);
    const points = Math.round((60 + 440 * timeFraction) * orderFactor);
    player.score += points;

    const drawer = this.drawOrder[this.drawerIndex];
    if (drawer) drawer.score += 25;

    this.emitter.emit("guess_result", { correct: true, playerId: player.id, playerName: player.name, points });
    this.pushChat({
      id: nextId("chat"),
      playerId: player.id,
      playerName: player.name,
      text: `${player.name} guessed the word!`,
      kind: "guess-correct",
    });

    const nonDrawers = this.players.filter((p) => p.id !== drawer?.id);
    if (nonDrawers.every((p) => p.hasGuessedThisRound)) {
      this.endRound();
    } else {
      this.publish();
    }
  }

  private endRound(): void {
    this.clearTimers();
    this.phase = "round_end";
    const drawer = this.drawOrder[this.drawerIndex];
    const nextIdx = (this.drawerIndex + 1) % this.drawOrder.length;
    const result: RoundResult = {
      word: this.currentWord ?? "",
      scores: this.players.map((p) => ({ playerId: p.id, delta: 0, total: p.score })),
      nextDrawerId: this.round >= this.settings.rounds && nextIdx === 0 ? null : this.drawOrder[nextIdx]?.id ?? null,
    };
    this.lastRoundResult = result;
    this.systemMessage(`Round over! The word was "${this.currentWord}".`);
    this.emitter.emit("round_end", result);
    this.publish();

    const t = window.setTimeout(() => {
      if (this.round >= this.settings.rounds && this.drawerIndex === this.drawOrder.length - 1) {
        this.endGame();
      } else {
        this.advanceTurn();
      }
    }, 4200);
    this.botTimeouts.push(t);
    void drawer;
  }

  private endGame(): void {
    this.clearTimers();
    this.phase = "game_over";
    const sorted = [...this.players].sort((a, b) => b.score - a.score);
    const result: GameOverResult = {
      winner: sorted[0]?.toData() ?? null,
      leaderboard: sorted.map((p) => p.toData()),
    };
    this.gameOverResult = result;
    this.emitter.emit("game_over", result);
    this.publish();
  }

  playAgain(): void {
    if (this.isRemote) return;
    this.phase = "lobby";
    this.round = 0;
    this.gameOverResult = null;
    this.lastRoundResult = null;
    this.strokes = [];
    this.chat = [];
    this.players.forEach((p) => {
      p.score = 0;
      p.resetRoundFlags();
    });
    this.publish();
  }

  // ---------- moderation ----------
  kickPlayer(playerId: string): void {
    if (this.isRemote) return;
    const p = this.players.find((pl) => pl.id === playerId);
    if (!p) return;
    this.removePlayer(playerId);
    this.systemMessage(`${p.name} was kicked from the room.`);
  }

  banPlayer(playerId: string): void {
    if (this.isRemote) return;
    const p = this.players.find((pl) => pl.id === playerId);
    if (!p) return;
    this.removePlayer(playerId);
    this.systemMessage(`${p.name} was banned from the room.`);
  }

  votekickPlayer(playerId: string): void {
    if (this.isRemote) return;
    const p = this.players.find((pl) => pl.id === playerId);
    if (!p) return;
    this.systemMessage(`A votekick against ${p.name} has started.`);
  }

  mutePlayer(playerId: string): void {
    if (this.isRemote) return;
    const p = this.players.find((pl) => pl.id === playerId);
    if (!p) return;
    this.systemMessage(`${p.name} has been muted for you.`);
  }

  reportPlayer(playerId: string, _reason: string): void {
    if (this.isRemote) return;
    const p = this.players.find((pl) => pl.id === playerId);
    if (!p) return;
    this.systemMessage(`Your report against ${p.name} was submitted.`);
  }

  // ---------- helpers ----------
  private systemMessage(text: string): void {
    this.pushChat({ id: nextId("sys"), playerId: "system", playerName: "System", text, kind: "system" });
  }

  private pushChat(msg: ChatMessage): void {
    this.chat = [...this.chat.slice(-199), msg];
    this.emitter.emit("chat_message", msg);
    this.publish();
  }

  private clearTimers(): void {
    if (this.timerHandle) window.clearInterval(this.timerHandle);
    this.timerHandle = null;
    this.hintHandles.forEach((h) => window.clearTimeout(h));
    this.hintHandles = [];
    this.botTimeouts.forEach((h) => window.clearTimeout(h));
    this.botTimeouts = [];
  }

  destroy(): void {
    this.clearTimers();
    this.socket?.disconnect();
    this.socket = null;
  }

  endStroke(strokeId?: string): void {
    if (this.isRemote && this.socket) {
      this.socket.emit("draw_end", { strokeId, clientEventId: nextId("evt") });
    }
  }

  meAsData(): PlayerData | null {
    const me = this.players.find((p) => p.id === this.meId);
    return me ? me.toData() : null;
  }
}
