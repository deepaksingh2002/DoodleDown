import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserFriends, FaSignOutAlt, FaPlus } from "react-icons/fa";
import { useGame } from "../context/GameProvider";
import RoomSettingsForm from "../components/RoomSettingsForm";
import PlayerBadge from "../components/PlayerBadge";
import PlayerMenu from "../components/PlayerMenu";
import InviteModal from "../components/InviteModal";

export default function Lobby() {
  const { state, engine, leaveRoom } = useGame();
  const navigate = useNavigate();
  const [showInvite, setShowInvite] = useState(false);
  if (!state || !engine) return null;

  const me = state.me;
  const isHost = !!me?.isHost;
  const inviteLink = `${window.location.origin}${window.location.pathname}#/r/${state.roomId}`;

  return (
    <div className="min-h-screen flex justify-center px-5 py-8">
      <div className="w-full max-w-275 flex flex-col gap-5">
        <header className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[30px] text-ink tracking-wide">Room {state.roomId}</h1>
            <p className="text-ink-faint mt-1 text-sm">Waiting for players to get chalky-fingered...</p>
          </div>
          <div className="flex gap-2.5">
            <button className="btn btn-secondary" onClick={() => setShowInvite(true)}>
              <FaUserFriends /> Invite friends
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                leaveRoom();
                navigate("/");
              }}
            >
              <FaSignOutAlt /> Leave
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_260px] gap-4.5 items-start">
          <section className="bg-surface rounded-2xl p-4.5 border border-border shadow-sm">
            <h3 className="text-base mb-3 text-ink">Players ({state.players.length}/{state.settings.maxPlayers})</h3>
            <ul className="list-none p-0 m-0 flex flex-col gap-2 max-h-105 overflow-y-auto">
              {state.players.map((p) => (
                <li key={p.id} className="flex items-center gap-1">
                  <div className="flex-1 min-w-0"><PlayerBadge player={p} /></div>
                  <PlayerMenu engine={engine} player={p} isMeHost={isHost} isMe={p.id === me?.id} />
                </li>
              ))}
            </ul>
            {isHost && !engine.isRemote && state.players.length < state.settings.maxPlayers && (
              <button className="btn btn-ghost mt-3 w-full text-[13px] py-2.5" onClick={() => engine.addBot()}>
                <FaPlus /> Add a bot player
              </button>
            )}
          </section>

          <section className="bg-surface rounded-2xl p-4.5 border border-border shadow-sm flex flex-col gap-4 items-center justify-center min-h-95">
            <div className="flex-1 w-full border-2 border-dashed border-border rounded-2xl bg-surface-alt flex flex-col items-center justify-center gap-2.5 text-ink-faint text-[13px] min-h-65">
              <span className="font-mono text-3xl font-bold text-brand-blue tracking-[4px]">{state.roomId}</span>
              <p>Waiting for the host to start the game...</p>
            </div>
            {isHost && (
              <button
                className="btn btn-primary w-full text-base py-3.5 rounded-2xl"
                disabled={state.players.length < 2}
                onClick={() => engine.startGame()}
              >
                {state.players.length < 2 ? "Need at least 2 players" : "Start!"}
              </button>
            )}
          </section>

          <section className="bg-surface rounded-2xl p-4.5 border border-border shadow-sm">
            <h3 className="text-base mb-3 text-ink">Room settings</h3>
            <RoomSettingsForm
              settings={state.settings}
              disabled={!isHost || engine.isRemote}
              onChange={(patch) => engine.updateSettings(patch)}
            />
            {!isHost && <p className="text-ink-faint text-xs mt-2.5">Only the host can change settings.</p>}
            {engine.isRemote && <p className="text-ink-faint text-xs mt-2.5">Live backend rooms keep settings fixed after creation.</p>}
          </section>
        </div>
      </div>

      {showInvite && <InviteModal link={inviteLink} onClose={() => setShowInvite(false)} />}
    </div>
  );
}
