import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { GameEngine } from "../engine/GameEngine";
import { SOCKET_URL } from "../lib/socket";
import { createBackendRoom, getBackendRoomInfo } from "../lib/backendApi";
import { DEFAULT_SETTINGS, type GameState, type RoomSettings } from "../types";

interface GameContextValue {
  state: GameState | null;
  engine: GameEngine | null;
  createRoom: (hostName: string, settings: RoomSettings) => Promise<string>;
  joinRoom: (roomId: string, playerName: string) => Promise<void>;
  leaveRoom: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<GameEngine | null>(null);
  const [state, setState] = useState<GameState | null>(null);

  const attach = useCallback((engine: GameEngine) => {
    engineRef.current?.destroy();
    engineRef.current = engine;
    setState(engine.snapshot());
    engine.on("state", (s) => setState(s));
  }, []);

  const createRoom = useCallback(
    async (hostName: string, settings: RoomSettings) => {
      if (!SOCKET_URL) {
        const engine = new GameEngine(hostName || "Host", settings ?? DEFAULT_SETTINGS);
        attach(engine);
        return engine.roomId;
      }

      const created = await createBackendRoom(SOCKET_URL, hostName || "Host", settings ?? DEFAULT_SETTINGS, settings.isPrivate);
      const engine = new GameEngine(hostName || "Host", created.settings, created.roomId);
      await engine.attachRemoteSession(SOCKET_URL, { roomId: created.roomId, playerName: hostName || "Host", hostToken: created.hostToken });
      attach(engine);
      return created.roomId;
    },
    [attach]
  );

  const joinRoom = useCallback(
    async (roomId: string, playerName: string) => {
      if (!SOCKET_URL) {
        const engine = new GameEngine(playerName || "Player", DEFAULT_SETTINGS, roomId);
        engine.addBot();
        attach(engine);
        return;
      }

      const roomInfo = await getBackendRoomInfo(SOCKET_URL, roomId);
      const engine = new GameEngine(playerName || "Player", {
        ...DEFAULT_SETTINGS,
        maxPlayers: roomInfo.maxPlayers,
        rounds: roomInfo.rounds,
        drawTimeSec: roomInfo.drawTime,
      }, roomId);
      await engine.attachRemoteSession(SOCKET_URL, { roomId, playerName: playerName || "Player" });
      attach(engine);
    },
    [attach]
  );

  const leaveRoom = useCallback(() => {
    engineRef.current?.destroy();
    engineRef.current = null;
    setState(null);
  }, []);

  const value = useMemo<GameContextValue>(
    () => ({ state, engine: engineRef.current, createRoom, joinRoom, leaveRoom }),
    [state, createRoom, joinRoom, leaveRoom]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
