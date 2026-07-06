import type { GameEngine } from "../engine/GameEngine";
import type { GameState } from "../types";

interface Props {
  engine: GameEngine;
  state: GameState;
  isDrawer: boolean;
}

export default function WordChoiceModal({ engine, state, isDrawer }: Props) {
  const drawerName = state.players.find((p) => p.id === state.drawerId)?.name ?? "Someone";

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        {isDrawer ? (
          <>
            <h2 className="text-2xl text-ink mb-2.5">Pick a word to draw</h2>
            <div className="flex flex-col gap-2.5">
              {state.wordOptions.map((w) => (
                <button key={w} className="btn btn-secondary text-base px-3.5 py-3.5 capitalize rounded-2xl" onClick={() => engine.chooseWord(w)}>
                  {w}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl text-ink mb-2.5">{drawerName} is choosing a word...</h2>
            <p className="text-ink-soft text-sm">Get your guessing fingers ready ✍️</p>
          </>
        )}
      </div>
    </div>
  );
}
