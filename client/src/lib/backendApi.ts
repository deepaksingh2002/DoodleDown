import type { RoomSettings } from "../types";

type BackendSettings = {
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  wordCount: number;
  hints: number;
  wordMode: RoomSettings["wordMode"];
  categories: string[];
  customWords: string[];
};

type CreateRoomResponse = {
  roomId: string;
  hostToken: string;
  settings: BackendSettings;
};

type RoomInfoResponse = {
  id: string;
  isPrivate: boolean;
  state: "waiting" | "playing" | "ended";
  playerCount: number;
  maxPlayers: number;
  rounds: number;
  drawTime: number;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

function toBackendSettings(settings: RoomSettings): Record<string, unknown> {
  return {
    maxPlayers: settings.maxPlayers,
    rounds: settings.rounds,
    drawTime: settings.drawTimeSec,
    wordCount: settings.wordCount,
    hints: settings.hints,
    wordMode: settings.wordMode,
    categories: [],
    customWords: settings.customWords
      .split(",")
      .map((word) => word.trim())
      .filter(Boolean),
  };
}

function toClientSettings(settings: BackendSettings, isPrivate: boolean): RoomSettings {
  return {
    maxPlayers: settings.maxPlayers,
    language: "English",
    rounds: settings.rounds,
    drawTimeSec: settings.drawTime,
    wordCount: settings.wordCount,
    hints: settings.hints,
    wordMode: settings.wordMode,
    isPrivate,
    customWords: settings.customWords.join(", "),
    useCustomWordsOnly: false,
  };
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  const data = (await response.json()) as { data?: T } | T;
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: T }).data;
  }

  return data as T;
}

export async function createBackendRoom(baseUrl: string, hostName: string, settings: RoomSettings, isPrivate: boolean) {
  const url = `${normalizeBaseUrl(baseUrl)}/api/v1/rooms`;
  const data = await requestJson<CreateRoomResponse>(url, {
    method: "POST",
    body: JSON.stringify({ hostName, isPrivate, settings: toBackendSettings(settings) }),
  });

  return {
    roomId: data.roomId,
    hostToken: data.hostToken,
    settings: toClientSettings(data.settings, isPrivate),
  };
}

export async function getBackendRoomInfo(baseUrl: string, roomId: string): Promise<RoomInfoResponse> {
  const url = `${normalizeBaseUrl(baseUrl)}/api/v1/rooms/${encodeURIComponent(roomId)}`;
  return requestJson<RoomInfoResponse>(url, { method: "GET" });
}