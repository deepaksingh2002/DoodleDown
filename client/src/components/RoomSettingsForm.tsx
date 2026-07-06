import { useState } from "react";
import { FaUsers, FaGlobe, FaStopwatch, FaSyncAlt, FaGamepad, FaFont, FaLightbulb, FaLock } from "react-icons/fa";
import type { IconType } from "react-icons";
import type { RoomSettings, WordMode } from "../types";
import { LANGUAGES } from "../types";

interface Props {
  settings: RoomSettings;
  onChange: (patch: Partial<RoomSettings>) => void;
  disabled?: boolean;
}

const WORD_MODES: { value: WordMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "hidden", label: "Hidden" },
  { value: "combination", label: "Combination" },
];

const PLAYER_COUNTS = Array.from({ length: 19 }, (_, i) => i + 2); // 2..20
const DRAW_TIMES = [15, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 150, 180, 210, 240];
const ROUND_COUNTS = Array.from({ length: 9 }, (_, i) => i + 2); // 2..10
const WORD_COUNTS = [1, 2, 3, 4, 5];
const HINT_COUNTS = [0, 1, 2, 3, 4, 5];

const selectClass =
  "bg-surface-alt border-2 border-border rounded-full text-ink px-3 py-1.5 text-[13.5px] min-w-[92px] focus:border-brand-blue focus:outline-none";

export default function RoomSettingsForm({ settings, onChange, disabled }: Props) {
  const [showCustom, setShowCustom] = useState(!!settings.customWords);

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <Row icon={FaUsers} label="Players">
        <select className={selectClass} disabled={disabled} value={settings.maxPlayers} onChange={(e) => onChange({ maxPlayers: +e.target.value })}>
          {PLAYER_COUNTS.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </Row>

      <Row icon={FaGlobe} label="Language">
        <select className={selectClass} disabled={disabled} value={settings.language} onChange={(e) => onChange({ language: e.target.value })}>
          {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </Row>

      <Row icon={FaStopwatch} label="Drawtime">
        <select className={selectClass} disabled={disabled} value={settings.drawTimeSec} onChange={(e) => onChange({ drawTimeSec: +e.target.value })}>
          {DRAW_TIMES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </Row>

      <Row icon={FaSyncAlt} label="Rounds">
        <select className={selectClass} disabled={disabled} value={settings.rounds} onChange={(e) => onChange({ rounds: +e.target.value })}>
          {ROUND_COUNTS.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </Row>

      <Row icon={FaGamepad} label="Game Mode">
        <select className={selectClass} disabled={disabled} value={settings.wordMode} onChange={(e) => onChange({ wordMode: e.target.value as WordMode })}>
          {WORD_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </Row>

      <Row icon={FaFont} label="Word Count">
        <select className={selectClass} disabled={disabled} value={settings.wordCount} onChange={(e) => onChange({ wordCount: +e.target.value })}>
          {WORD_COUNTS.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </Row>

      <Row icon={FaLightbulb} label="Hints">
        <select className={selectClass} disabled={disabled} value={settings.hints} onChange={(e) => onChange({ hints: +e.target.value })}>
          {HINT_COUNTS.map((n) => <option key={n} value={n}>{n === 0 ? "Off" : n}</option>)}
        </select>
      </Row>

      <label className="flex items-center gap-2.5 text-[13px] text-ink-soft mt-1">
        <input
          type="checkbox" className="w-[18px] h-[18px] accent-brand-pink" checked={settings.isPrivate} disabled={disabled}
          onChange={(e) => onChange({ isPrivate: e.target.checked })}
        />
        <FaLock className="text-ink-faint" /> Private room (invite link only)
      </label>

      <button
        type="button"
        className="bg-transparent border-none text-brand-blue text-[13px] font-bold py-1 text-left disabled:opacity-40"
        disabled={disabled}
        onClick={() => setShowCustom((v) => !v)}
      >
        {showCustom ? "− Hide custom words" : "+ Custom words"}
      </button>

      {showCustom && (
        <div className="flex flex-col gap-2">
          <textarea
            className="bg-surface-alt border-2 border-border rounded-md text-ink px-2.5 py-2 text-[13px] resize-y font-sans focus:border-brand-blue focus:outline-none"
            disabled={disabled}
            placeholder="apple, banana, spaceship, ..."
            value={settings.customWords}
            onChange={(e) => onChange({ customWords: e.target.value })}
            rows={3}
          />
          <label className="flex items-center gap-2.5 text-[13px] text-ink-soft">
            <input
              type="checkbox" className="w-[18px] h-[18px] accent-brand-pink" checked={settings.useCustomWordsOnly} disabled={disabled}
              onChange={(e) => onChange({ useCustomWordsOnly: e.target.checked })}
            />
            Use custom words only
          </label>
        </div>
      )}
    </div>
  );
}

function Row({ icon: Icon, label, children }: { icon: IconType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-[13.5px] text-ink-soft">
      <span className="w-6 h-6 rounded-full bg-surface-alt text-ink-soft flex items-center justify-center text-xs shrink-0">
        <Icon />
      </span>
      <span className="flex-1 font-semibold text-ink">{label}</span>
      {children}
    </div>
  );
}
