import type { GameState } from "../types";

interface Props {
  state: GameState;
  isDrawer: boolean;
}

export default function WordBanner({ state, isDrawer }: Props) {
  if (state.phase === "round_end" && state.lastRoundResult) {
    return (
      <div className="flex flex-col items-center gap-1.5 bg-surface border border-border rounded-full px-6 py-2.5 shadow-sm">
        <span className="text-[11px] uppercase tracking-wider text-ink-faint">The word was</span>
        <span className="font-display text-2xl text-brand-blue">{state.lastRoundResult.word}</span>
      </div>
    );
  }

  if (isDrawer && state.currentWord) {
    return (
      <div className="flex flex-col items-center gap-1.5 bg-surface border-2 border-brand-yellow rounded-full px-6 py-2.5 shadow-sm">
        <span className="text-[11px] uppercase tracking-wider text-ink-faint">Draw this</span>
        <span className="font-display text-2xl text-ink">{state.currentWord}</span>
      </div>
    );
  }

  const len = state.wordLength ?? 0;
  const blanks = state.hintPattern.map((ch, i) => (
    <span
      key={i}
      className="min-w-[18px] text-center border-b-[3px] border-ink-faint font-mono font-bold text-xl text-ink pb-0.5"
    >
      {ch ?? "\u00A0"}
    </span>
  ));

  return (
    <div className="flex flex-col items-center gap-1.5 bg-surface border border-border rounded-full px-6 py-2.5 shadow-sm">
      <span className="text-[11px] uppercase tracking-wider text-ink-faint">{len ? `${len} letters` : "Guess the word"}</span>
      <div className="flex gap-1.5">{blanks}</div>
    </div>
  );
}
