import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaGlobeAmericas, FaLink } from "react-icons/fa";
import { useGame } from "../context/GameProvider";
import { DEFAULT_SETTINGS, LANGUAGES, type RoomSettings } from "../types";
import RoomSettingsForm from "../components/RoomSettingsForm";
import DoodleSignature from "../components/DoodleSignature";

export default function Home() {
  const navigate = useNavigate();
  const { createRoom, joinRoom } = useGame();

  const [name, setName] = useState("");
  const [language, setLanguage] = useState("English");
  const [showPrivateSetup, setShowPrivateSetup] = useState(false);
  const [settings, setSettings] = useState<RoomSettings>(DEFAULT_SETTINGS);

  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  async function handlePlayPublic() {
    try {
      const roomId = await createRoom(name.trim() || "Player", { ...DEFAULT_SETTINGS, language, isPrivate: false });
      navigate(`/r/${roomId}`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to create room");
    }
  }

  async function handleCreatePrivate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const roomId = await createRoom(name.trim() || "Host", { ...settings, language, isPrivate: true });
      navigate(`/r/${roomId}`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to create room");
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    try {
      await joinRoom(code, name.trim() || "Player");
      navigate(`/r/${code}`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to join room");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-5 pb-10 gap-7">
      <header className="w-full max-w-[900px] flex items-center justify-between py-4.5">
        <div className="flex items-center gap-2.5">
          <DoodleSignature small />
          <span className="font-display text-[22px] text-ink">Doodle Down</span>
        </div>
        <div className="relative">
          <FaGlobeAmericas className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint text-sm pointer-events-none" />
          <select
            className="bg-surface border border-border text-ink rounded-full pl-9 pr-3 py-1.5 text-[13px] shadow-sm"
            value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Language"
          >
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </header>

      <section className="flex flex-col items-center text-center gap-4 max-w-[520px] w-full">
        <p className="text-ink-soft text-base">Grab some chalk. One player draws, everyone else races to guess.</p>

        <label className="flex flex-col gap-1.5 text-[13px] text-ink-soft w-full max-w-[280px]">
          <span>Your name</span>
          <input
            className="bg-surface border-2 border-border rounded-full text-ink px-4 py-2.5 text-[15px] text-center shadow-sm focus:border-brand-blue focus:outline-none"
            value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sam" maxLength={18}
          />
        </label>

        <div className="flex gap-3 flex-wrap justify-center">
          <button className="btn btn-primary text-xl px-11 py-4" onClick={handlePlayPublic}>Play!</button>
          <button className="btn btn-secondary text-[15px] px-6 py-4" onClick={() => setShowPrivateSetup((v) => !v)}>
            Create Private Room
          </button>
        </div>
        <button className="bg-transparent border-none text-ink-faint text-[13px] underline underline-offset-4 hover:text-ink-soft flex items-center gap-1.5" onClick={() => setShowJoin((v) => !v)}>
          <FaLink /> Have a room link or code? Join here
        </button>

        {showJoin && (
          <form className="flex gap-2 w-full max-w-[320px]" onSubmit={handleJoin}>
            <input
              value={joinCode} onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Room code, e.g. AB12CD"
              className="flex-1 bg-surface border-2 border-border rounded-full text-ink px-4 py-2.5 font-mono tracking-widest uppercase min-w-0 shadow-sm"
            />
            <button type="submit" className="btn btn-secondary">Join</button>
          </form>
        )}

        {showPrivateSetup && (
          <form className="w-full bg-surface border border-border rounded-2xl p-5.5 text-left shadow-sm" onSubmit={handleCreatePrivate}>
            <h3 className="text-ink mb-3.5 text-lg">Private room settings</h3>
            <RoomSettingsForm settings={{ ...settings, language }} onChange={(p) => setSettings((s) => ({ ...s, ...p }))} />
            <button type="submit" className="btn btn-primary mt-4 w-full text-base py-3.5 rounded-2xl">Create room</button>
          </form>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[960px] w-full">
        <div className="bg-surface border border-border rounded-2xl px-5 py-4.5 shadow-sm">
          <h3 className="text-ink text-base mb-2.5">About</h3>
          <p className="text-ink-soft text-[13.5px] leading-relaxed">
            Doodle Down is a free browser drawing &amp; guessing game for you and your
            friends. Create a private room, invite people with a link, and take turns
            sketching while everyone else races to type the answer first.
          </p>
        </div>
        <div className="bg-surface border border-border rounded-2xl px-5 py-4.5 shadow-sm">
          <h3 className="text-ink text-base mb-2.5">How to play</h3>
          <ol className="m-0 pl-4.5 flex flex-col gap-1 text-ink-soft text-[13.5px] leading-relaxed">
            <li>Create or join a room</li>
            <li>Wait for your turn — one player draws each round</li>
            <li>Pick a word and sketch it before time runs out</li>
            <li>Everyone else types guesses in chat</li>
            <li>Fastest correct guesses score the most points</li>
          </ol>
        </div>
        <div className="bg-surface border border-border rounded-2xl px-5 py-4.5 shadow-sm">
          <h3 className="text-ink text-base mb-2.5">What's new</h3>
          <ul className="m-0 pl-4.5 flex flex-col gap-1 text-ink-soft text-[13.5px] leading-relaxed">
            <li>Configurable hints — reveal letters gradually as the clock runs down</li>
            <li>Bring your own word list with the custom words option</li>
            <li>Bot players so you can try the whole flow solo</li>
          </ul>
        </div>
      </section>

      <footer className="text-ink-faint text-xs text-center">
        A skribbl.io-style clone — built with React, TypeScript &amp; a Socket.IO-ready architecture.
      </footer>
    </div>
  );
}
