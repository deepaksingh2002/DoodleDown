import { useState } from "react";
import { FaEllipsisV } from "react-icons/fa";
import type { GameEngine } from "../engine/GameEngine";
import type { Player } from "../types";

const REPORT_REASONS = ["Inappropriate name", "Bad drawing", "Cheating", "Spam", "Other"];

interface Props {
  engine: GameEngine;
  player: Player;
  isMeHost: boolean;
  isMe: boolean;
}

export default function PlayerMenu({ engine, player, isMeHost, isMe }: Props) {
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);

  if (isMe) return null;

  const itemClass = "bg-none border-none text-ink text-left px-2.5 py-1.5 text-[13px] rounded-lg hover:bg-surface-alt";

  return (
    <div className="relative shrink-0">
      <button
        className="icon-btn w-6 h-6 text-ink-faint hover:bg-surface-alt hover:text-ink text-xs"
        aria-label={`Options for ${player.name}`}
        onClick={() => setOpen((v) => !v)}
      >
        <FaEllipsisV />
      </button>
      {open && (
        <div
          className="absolute right-0 top-7 bg-surface border border-border rounded-xl p-1.5 flex flex-col min-w-[150px] z-30 shadow-[0_8px_24px_rgba(45,49,66,0.2)]"
          onMouseLeave={() => { setOpen(false); setReporting(false); }}
        >
          {reporting ? (
            <>
              {REPORT_REASONS.map((r) => (
                <button key={r} className={itemClass} onClick={() => { engine.reportPlayer(player.id, r); setOpen(false); setReporting(false); }}>
                  {r}
                </button>
              ))}
              <button className={itemClass} onClick={() => setReporting(false)}>← Back</button>
            </>
          ) : (
            <>
              {isMeHost && <button className={itemClass} onClick={() => { engine.kickPlayer(player.id); setOpen(false); }}>Kick</button>}
              {isMeHost && <button className={itemClass} onClick={() => { engine.banPlayer(player.id); setOpen(false); }}>Ban</button>}
              {!isMeHost && <button className={itemClass} onClick={() => { engine.votekickPlayer(player.id); setOpen(false); }}>Votekick</button>}
              <button className={itemClass} onClick={() => { engine.mutePlayer(player.id); setOpen(false); }}>Mute</button>
              <button className={itemClass} onClick={() => setReporting(true)}>Report</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
