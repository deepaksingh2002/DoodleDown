import { v4 as uuidv4 } from 'uuid';


class Player {
  constructor({ name, socketId, isHost = false }) {
    this.id = uuidv4();
    this.name = name;
    this.socketId = socketId;
    this.isHost = isHost;
    this.score = 0;
    this.hasGuessedCorrectly = false;
    this.isConnected = true;
    this.joinedAt = Date.now();
  }

  addScore(points) {
    this.score += points;
    return this.score;
  }

  resetRoundState() {
    this.hasGuessedCorrectly = false;
  }

  resetForNewGame() {
    this.score = 0;
    this.hasGuessedCorrectly = false;
  }

  /** Data safe to broadcast to all clients */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      isHost: this.isHost,
      score: this.score,
      hasGuessedCorrectly: this.hasGuessedCorrectly,
      isConnected: this.isConnected,
    };
  }
}

export default Player;
