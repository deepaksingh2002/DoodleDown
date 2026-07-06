import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserFriends, FaSignOutAlt } from "react-icons/fa";
import { useGame } from "../context/GameProvider";
import DrawingCanvas from "../components/DrawingCanvas";
import Toolbar from "../components/Toolbar";
import WordBanner from "../components/WordBanner";
import Timer from "../components/Timer";
import ChatPanel from "../components/ChatPanel";
import PlayerBadge from "../components/PlayerBadge";
import PlayerMenu from "../components/PlayerMenu";
import WordChoiceModal from "../components/WordChoiceModal";
import RoundEndModal from "../components/RoundEndModal";
import GameOverModal from "../components/GameOverModal";
import InviteModal from "../components/InviteModal";

export default function Game() {
  const { state, engine } = useGame();
  const navigate = useNavigate();
  const [color, setColor] = useState("#1c1c1c");
  const [size, setSize] = useState(6);
  const [isEraser, setIsEraser] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  if (!state || !engine) return null;

  const isDrawer = state.me?.id === state.drawerId;
  const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);
  const inviteLink = `${window.location.origin}${window.location.pathname}#/r/${state.roomId}`;

  return (
    <div className="min-h-screen flex flex-col px-5 pt-4.5 pb-6 gap-3.5 max-w-[1320px] mx-auto">
      <header className="flex items-center gap-4 bg-surface border border-border rounded-2xl px-4 py-2.5 shadow-sm">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[13px] text-ink-faint tracking-wide">Room {state.roomId}</span>
          <span className="text-sm font-bold text-ink">Round {state.round}/{state.totalRounds}</span>
        </div>
        {state.phase === "drawing" && <Timer timeLeft={state.timeLeft} total={state.settings.drawTimeSec} />}
        <button className="btn btn-secondary ml-auto px-4 py-2 text-[13px]" onClick={() => setShowInvite(true)}>
          <FaUserFriends /> Invite
        </button>
        <button className="btn btn-ghost px-4 py-2 text-[13px]" onClick={() => navigate("/")}>
          <FaSignOutAlt /> Leave
        </button>
      </header>

      {(state.phase === "drawing" || state.phase === "round_end") && (
        <div className="flex justify-center">
          <WordBanner state={state} isDrawer={isDrawer} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_280px] gap-4 flex-1 items-start">
        <aside className="order-2 md:order-1 bg-surface border border-border rounded-2xl p-3.5 shadow-sm">
          <h3 className="text-[15px] text-ink mb-2.5">Scoreboard</h3>
          <ul className="list-none m-0 p-0 flex flex-col gap-1.5">
            {sortedPlayers.map((p) => (
              <li key={p.id} className="flex items-center gap-1">
                <div className="flex-1 min-w-0"><PlayerBadge player={p} compact /></div>
                <PlayerMenu engine={engine} player={p} isMeHost={!!state.me?.isHost} isMe={p.id === state.me?.id} />
              </li>
            ))}
          </ul>
        </aside>

        <div className="order-1 md:order-2 relative flex flex-col">
          <div className="relative">
            <DrawingCanvas engine={engine} state={state} isDrawer={isDrawer} color={color} size={size} isEraser={isEraser} />
            {state.phase === "choosing" && <WordChoiceModal engine={engine} state={state} isDrawer={isDrawer} />}
            {state.phase === "round_end" && <RoundEndModal state={state} />}
            {state.phase === "game_over" && <GameOverModal engine={engine} state={state} />}
          </div>
          {isDrawer && state.phase === "drawing" && (
            <Toolbar engine={engine} color={color} size={size} isEraser={isEraser} onColor={setColor} onSize={setSize} onEraser={setIsEraser} />
          )}
        </div>

        <div className="order-3 h-full min-h-[240px] md:min-h-0">
          <ChatPanel engine={engine} state={state} isDrawer={isDrawer} hasGuessed={!!state.me?.hasGuessedThisRound} />
        </div>
      </div>

      {showInvite && <InviteModal link={inviteLink} onClose={() => setShowInvite(false)} />}
    </div>
  );
}
