import { useNavigate } from "react-router-dom";
import { FaTrophy } from "react-icons/fa";
import type { GameEngine } from "../engine/GameEngine";
import type { GameState } from "../types";

interface Props {
  engine: GameEngine;
  state: GameState;
}

export default function GameOverModal({ engine, state }: Props) {
  const navigate = useNavigate();
  const result = state.gameOverResult;
  if (!result) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2 className="text-2xl text-ink mb-2.5 flex items-center justify-center gap-2">
          <FaTrophy className="text-brand-yellow" /> {result.winner ? `${result.winner.name} wins!` : "Game over!"}
        </h2>
        <ul className="list-none p-0 m-0 mb-4 flex flex-col gap-2 max-h-[260px] overflow-y-auto">
          {result.leaderboard.map((p, i) => (
            <li
              key={p.id}
              className={`flex items-center gap-2.5 bg-surface-alt rounded-full px-3.5 py-2 text-sm ${i === 0 ? "border-2 border-brand-yellow" : ""}`}
            >
              <span className="font-mono text-ink-faint w-6">#{i + 1}</span>
              <span className="flex-1 font-bold text-left" style={{ color: p.color }}>{p.name}</span>
              <span className="font-mono text-brand-green font-bold">{p.score} pts</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2.5 justify-center">
          {state.me?.isHost && !engine.isRemote && (
            <button className="btn btn-primary" onClick={() => engine.playAgain()}>Play again</button>
          )}
          <button className="btn btn-ghost" onClick={() => navigate("/")}>Back to home</button>
        </div>
      </div>
    </div>
  );
}
