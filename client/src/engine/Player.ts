import type { Player as PlayerData } from "../types";

let idCounter = 0;
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

export class Player implements PlayerData {
  id: string;
  name: string;
  color: string;
  score = 0;
  isHost: boolean;
  isDrawing = false;
  hasGuessedThisRound = false;
  connected = true;
  isBot: boolean;

  constructor(name: string, color: string, opts: { isHost?: boolean; isBot?: boolean; id?: string } = {}) {
    this.id = opts.id ?? nextId(opts.isBot ? "bot" : "p");
    this.name = name;
    this.color = color;
    this.isHost = !!opts.isHost;
    this.isBot = !!opts.isBot;
  }

  resetRoundFlags(): void {
    this.hasGuessedThisRound = false;
    this.isDrawing = false;
  }

  toData(): PlayerData {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      score: this.score,
      isHost: this.isHost,
      isDrawing: this.isDrawing,
      hasGuessedThisRound: this.hasGuessedThisRound,
      connected: this.connected,
    };
  }
}
