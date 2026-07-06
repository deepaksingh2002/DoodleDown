

export type Phase = "lobby" | "choosing" | "drawing" | "round_end" | "game_over";

export type WordMode = "normal" | "hidden" | "combination";

export interface RoomSettings {
  maxPlayers: number; // 2–20
  language: string;
  rounds: number; // 2–10
  drawTimeSec: number; // 15–240
  wordCount: number; // 1–5
  hints: number; // 0–5
  wordMode: WordMode;
  isPrivate: boolean;
  customWords: string; // comma-separated
  useCustomWordsOnly: boolean;
}

export interface Player {
  id: string;
  name: string;
  color: string; // avatar/name-tag color, one of the marker accents
  score: number;
  isHost: boolean;
  isDrawing: boolean;
  hasGuessedThisRound: boolean;
  connected: boolean;
}

export interface StrokePoint {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  color: string;
  size: number;
  points: StrokePoint[];
  isEraser: boolean;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  kind: "chat" | "system" | "guess-correct" | "guess-close";
}

export interface RoundResult {
  word: string;
  scores: { playerId: string; delta: number; total: number }[];
  nextDrawerId: string | null;
}

export interface GameOverResult {
  winner: Player | null;
  leaderboard: Player[];
}

export interface GameState {
  roomId: string;
  phase: Phase;
  round: number;
  totalRounds: number;
  drawerId: string | null;
  wordLength: number | null; // for blanks display when not drawing
  revealedIndices: number[]; // which letter positions are revealed as hints
  hintPattern: (string | null)[]; // per-letter display: the letter if revealed/space, else null for a blank
  timeLeft: number;
  players: Player[];
  strokes: Stroke[];
  chat: ChatMessage[];
  settings: RoomSettings;
  wordOptions: string[]; // only populated for the current drawer while choosing
  currentWord: string | null; // only populated for the current drawer while drawing
  lastRoundResult: RoundResult | null;
  gameOverResult: GameOverResult | null;
  me: Player | null;
}

export const DEFAULT_SETTINGS: RoomSettings = {
  maxPlayers: 8,
  language: "English",
  rounds: 3,
  drawTimeSec: 80,
  wordCount: 3,
  hints: 2,
  wordMode: "normal",
  isPrivate: false,
  customWords: "",
  useCustomWordsOnly: false,
};

export const LANGUAGES = [
  "English", "German", "French", "Spanish", "Italian",
  "Portuguese", "Dutch", "Russian", "Japanese", "Korean",
];

export const MARKER_COLORS = [
  "#ff4d8d", // pink
  "#3fa9f5", // blue
  "#ffd23f", // yellow
  "#4ade80", // green
  "#ff9f4d", // orange
  "#c084fc", // violet
  "#4ddbe0", // teal
  "#f472b6", // rose
];
