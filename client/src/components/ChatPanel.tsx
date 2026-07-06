import { useEffect, useRef, useState } from "react";
import { FaPaperPlane, FaCheckCircle } from "react-icons/fa";
import type { GameEngine } from "../engine/GameEngine";
import type { GameState } from "../types";

interface Props {
  engine: GameEngine;
  state: GameState;
  isDrawer: boolean;
  hasGuessed: boolean;
}

export default function ChatPanel({ engine, state, isDrawer, hasGuessed }: Props) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [state.chat.length]);

  const locked = state.phase === "drawing" && !isDrawer && hasGuessed;
  const placeholder = isDrawer
    ? "Chat with everyone..."
    : locked
    ? "You guessed it! Chat away."
    : state.phase === "drawing"
    ? "Type your guess..."
    : "Chat...";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    engine.sendChat(text);
    setText("");
  }

  return (
    <div className="flex flex-col bg-surface border border-border rounded-2xl overflow-hidden h-full min-h-[260px] shadow-sm">
      <div className="flex-1 overflow-y-auto px-3.5 py-3 flex flex-col gap-1.5" ref={listRef}>
        {state.chat.map((m) => (
          <div key={m.id} className="text-[13.5px] leading-relaxed text-ink break-words">
            {m.kind === "system" ? (
              <span className="text-ink-faint italic text-xs">{m.text}</span>
            ) : m.kind === "guess-correct" ? (
              <span className="text-brand-green font-bold flex items-center gap-1.5">
                <FaCheckCircle /> {m.text}
              </span>
            ) : (
              <>
                <span className="font-bold text-brand-blue">{m.playerName}:</span>{" "}
                <span>{m.text}</span>
                {m.kind === "guess-close" && <em className="text-brand-yellow text-[11px] not-italic"> (close!)</em>}
              </>
            )}
          </div>
        ))}
        {state.chat.length === 0 && <p className="text-ink-faint text-[13px] text-center mt-5">Say hi 👋</p>}
      </div>
      <form className="flex gap-2 p-2.5 border-t border-border" onSubmit={submit}>
        <input
          className="flex-1 bg-surface-alt border-2 border-border rounded-full text-ink px-4 py-2 text-[13.5px] min-w-0 focus:border-brand-blue focus:outline-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          maxLength={80}
        />
        <button type="submit" aria-label="Send" className="btn btn-primary w-10 h-10 !p-0 rounded-full">
          <FaPaperPlane className="text-sm" />
        </button>
      </form>
    </div>
  );
}
