import { io, type Socket } from "socket.io-client";

/**
 * This app currently plays entirely client-side via `GameEngine`
 * (see src/engine/GameEngine.ts), which stands in for a real backend
 * so the frontend is fully demoable without a server.
 *
 * To connect it to a real Node/Socket.IO backend that implements the
 * event contract from the assignment (create_room, join_room, draw_data,
 * guess_result, round_end, game_over, etc.), create a socket here and
 * have GameEngine's public methods (`chooseWord`, `addStroke`, `submitGuess`, ...)
 * call `socket.emit(...)` instead of mutating local state, and have the
 * `on(...)` handlers below update the same GameState shape that
 * `GameEngine.snapshot()` produces today. Because every component reads
 * state through `useGame()`, no UI code needs to change.
 */
export function createSocket(url: string): Socket {
  return io(url, {
    autoConnect: false,
    transports: ["websocket"],
  });
}

const rawSocketUrl = import.meta.env.VITE_SOCKET_URL as string | undefined;

export const SOCKET_URL = rawSocketUrl?.trim() || undefined;
