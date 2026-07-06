import { FaCrown, FaPencilAlt } from "react-icons/fa";
import type { Player } from "../types";

interface Props {
  player: Player;
  score?: boolean;
  compact?: boolean;
}

export default function PlayerBadge({ player, score, compact }: Props) {
  const initials = player.name.slice(0, 2).toUpperCase();
  return (
    <div className={`flex items-center gap-2.5 bg-surface-alt rounded-full border-2 border-border ${compact ? "px-2 py-1.5 gap-2" : "px-2.5 py-2"}`}>
      <span
        className={`rounded-full flex items-center justify-center font-extrabold text-white shrink-0 ${compact ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs"}`}
        style={{ background: player.color }}
      >
        {initials}
      </span>
      <span className="flex-1 text-sm font-semibold text-ink flex items-center gap-1.5 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
        {player.name}
        {player.isHost && <FaCrown className="text-brand-yellow shrink-0" aria-label="Host" />}
        {player.isDrawing && <FaPencilAlt className="text-brand-blue shrink-0 text-xs" aria-label="Drawing" />}
      </span>
      {score !== false && <span className="font-mono font-bold text-brand-green text-sm shrink-0 pr-1">{player.score}</span>}
    </div>
  );
}
