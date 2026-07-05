import { ROOM_STATE } from '../config/constants.js';
import roomLogService from '../services/roomLog.service.js';


class Room {
  constructor({ id, hostToken, isPrivate, settings, io }) {
    this.id = id;
    this.hostToken = hostToken; // secret shared only with creator, used to claim host on join
    this.isPrivate = isPrivate;
    this.settings = settings;
    this.io = io;

    this.players = new Map(); // playerId -> Player
    this.state = ROOM_STATE.WAITING;
    this.game = null;
    this.createdAt = Date.now();
    this.deletionTimer = null;
  }

  addPlayer(player) {
    this.players.set(player.id, player);
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
  }

  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  getPlayerBySocketId(socketId) {
    return [...this.players.values()].find((p) => p.socketId === socketId);
  }

  listPlayers() {
    return [...this.players.values()];
  }

  get playerCount() {
    return this.players.size;
  }

  isFull() {
    return this.playerCount >= this.settings.maxPlayers;
  }

  isEmpty() {
    return this.playerCount === 0;
  }

  hasConnectedPlayers() {
    return this.listPlayers().some((p) => p.isConnected);
  }

  /** Promotes a new host if the current host disconnects/leaves */
  reassignHostIfNeeded() {
    const currentHost = this.listPlayers().find((p) => p.isHost);
    if (currentHost && currentHost.isConnected) return currentHost;

    if (currentHost) currentHost.isHost = false;
    const nextHost = this.listPlayers().find((p) => p.isConnected);
    if (nextHost) nextHost.isHost = true;
    return nextHost || null;
  }

  async startGame() {
    const { default: Game } = await import('./Game.js'); // lazy dynamic import to avoid circular deps
    this.state = ROOM_STATE.PLAYING;
    this.players.forEach((p) => p.resetForNewGame());
    this.game = new Game(this);
    roomLogService.logStateChange(this); // fire-and-forget, no-ops if DB not connected
    await this.game.start();
  }

  resetToLobby() {
    this.state = ROOM_STATE.WAITING;
    this.game = null;
  }

  /** Full state for players inside the room (lobby view) */
  toJSON() {
    return {
      id: this.id,
      isPrivate: this.isPrivate,
      settings: this.settings,
      state: this.state,
      players: this.listPlayers().map((p) => p.toJSON()),
    };
  }

  /** Lightweight summary for public room listings / pre-join info (REST) */
  toPublicSummary() {
    return {
      id: this.id,
      isPrivate: this.isPrivate,
      state: this.state,
      playerCount: this.playerCount,
      maxPlayers: this.settings.maxPlayers,
      rounds: this.settings.rounds,
      drawTime: this.settings.drawTime,
    };
  }
}

export default Room;
