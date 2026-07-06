import { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useGame } from "../context/GameProvider";
import Lobby from "./Lobby";
import Game from "./Game";

export default function RoomRouter() {
  const { roomId = "" } = useParams();
  const { state, joinRoom } = useGame();
  const [name, setName] = useState("");

  // No active engine for this room (fresh visit via a shared link) —
  // ask for a name before "joining" it.
  if (!state || state.roomId !== roomId) {
    return (
      <div className="min-h-screen flex flex-col items-center px-5 pb-10">
        <div className="w-full max-w-[380px] bg-surface border border-border rounded-2xl p-5.5 text-center mt-16 shadow-sm">
          <h2 className="mb-3.5 text-ink text-xl">Join room {roomId}</h2>
          <form
            className="flex flex-col gap-4 items-center"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await joinRoom(roomId, name.trim() || "Player");
              } catch (error) {
                window.alert(error instanceof Error ? error.message : "Failed to join room");
              }
            }}
          >
            <label className="flex flex-col gap-1.5 text-[13px] text-ink-soft w-full">
              <span>Your name</span>
              <input
                className="bg-surface-alt border-2 border-border rounded-full text-ink px-4 py-2.5 text-[15px] text-center w-full focus:border-brand-blue focus:outline-none"
                value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sam" autoFocus
              />
            </label>
            <button type="submit" className="btn btn-secondary w-full">Join</button>
          </form>
        </div>
      </div>
    );
  }

  if (state.phase === "lobby") return <Lobby />;
  if (!state.roomId) return <Navigate to="/" replace />;
  return <Game />;
}
