import { FaEraser, FaUndo, FaTrashAlt } from "react-icons/fa";
import type { GameEngine } from "../engine/GameEngine";

const PALETTE = [
  "#1c1c1c", "#ffffff", "#8a8a8a", "#7a3b12",
  "#ff5c5c", "#ff9f4d", "#ffc93c", "#3ecf6e",
  "#3fa9f5", "#9b6bff", "#ff4d8d", "#4ddbe0",
];

interface Props {
  engine: GameEngine;
  color: string;
  size: number;
  isEraser: boolean;
  onColor: (c: string) => void;
  onSize: (s: number) => void;
  onEraser: (v: boolean) => void;
}

export default function Toolbar({ engine, color, size, isEraser, onColor, onSize, onEraser }: Props) {
  return (
    <div className="flex items-center gap-4.5 flex-wrap bg-surface border border-border rounded-2xl px-4 py-3 mt-3 shadow-sm">
      <div className="grid grid-cols-6 gap-1.5">
        {PALETTE.map((c) => (
          <button
            key={c}
            className={`w-[24px] h-[24px] rounded-full border-2 transition-transform duration-150 ease-[var(--ease-chalk)] ${
              !isEraser && color === c ? "border-ink scale-125" : "border-black/10"
            }`}
            style={{ background: c }}
            aria-label={`Color ${c}`}
            onClick={() => {
              onColor(c);
              onEraser(false);
            }}
          />
        ))}
      </div>

      <div className="flex gap-1.5 border-x-2 border-border px-3.5">
        {[3, 6, 12, 20].map((s) => (
          <button
            key={s}
            className={`w-[30px] h-[30px] rounded-full border-2 bg-surface-alt flex items-center justify-center ${
              size === s ? "border-brand-blue" : "border-border"
            }`}
            aria-label={`Brush size ${s}`}
            onClick={() => onSize(s)}
          >
            <span className="rounded-full bg-ink block" style={{ width: s * 0.7, height: s * 0.7 }} />
          </button>
        ))}
      </div>

      <div className="flex gap-2 ml-auto flex-wrap justify-center max-sm:ml-0 max-sm:w-full">
        <button
          className={`icon-btn w-9 h-9 border-2 ${isEraser ? "bg-brand-yellow text-ink border-brand-yellow" : "bg-surface-alt border-border"}`}
          aria-label="Eraser" onClick={() => onEraser(!isEraser)}
        >
          <FaEraser />
        </button>
        <button className="icon-btn w-9 h-9 bg-surface-alt border-2 border-border" aria-label="Undo" onClick={() => engine.undoLastStroke()}>
          <FaUndo />
        </button>
        <button className="icon-btn w-9 h-9 bg-surface-alt border-2 border-border hover:text-brand-red" aria-label="Clear canvas" onClick={() => engine.clearCanvas()}>
          <FaTrashAlt />
        </button>
      </div>
    </div>
  );
}
