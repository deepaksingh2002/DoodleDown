import type { GameState } from "../types";

export default function RoundEndModal({ state }: { state: GameState }) {
  const result = state.lastRoundResult;
  if (!result) return null;
  const sorted = [...state.players].sort((a, b) => b.score - a.score);

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2 className="text-2xl text-ink mb-2.5">Round {state.round} of {state.totalRounds} complete</h2>
        <p className="text-ink-soft text-sm mb-4">
          The word was <strong className="font-display text-lg text-brand-blue">{result.word}</strong>
        </p>
        <ul className="list-none p-0 m-0 mb-4 flex flex-col gap-2 max-h-[260px] overflow-y-auto">
          {sorted.map((p, i) => (
            <li key={p.id} className="flex items-center gap-2.5 bg-surface-alt rounded-full px-3.5 py-2 text-sm">
              <span className="font-mono text-ink-faint w-6">#{i + 1}</span>
              <span className="flex-1 font-bold text-left" style={{ color: p.color }}>{p.name}</span>
              <span className="font-mono text-brand-green font-bold">{p.score} pts</span>
            </li>
          ))}
        </ul>
        <p className="text-ink-faint text-xs">Next round starting...</p>
      </div>
    </div>
  );
}
