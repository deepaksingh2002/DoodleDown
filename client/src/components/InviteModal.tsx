import { useState } from "react";
import { FaLink, FaRegCopy, FaCheck } from "react-icons/fa";

interface Props {
  link: string;
  onClose: () => void;
}

export default function InviteModal({ link, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card max-w-[460px]" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl text-ink mb-2.5 flex items-center justify-center gap-2">
          <FaLink className="text-brand-blue" /> Invite your friends!
        </h2>
        <p className="text-ink-soft text-sm mb-4">Anyone with this link can join your room.</p>
        <div className="flex gap-2 mb-4.5">
          <input
            readOnly value={link} onFocus={(e) => e.currentTarget.select()}
            className="flex-1 bg-surface-alt border-2 border-border rounded-full text-ink px-4 py-2.5 font-mono text-[13px] min-w-0"
          />
          <button className="btn btn-primary !px-4" onClick={copy}>
            {copied ? <FaCheck /> : <FaRegCopy />} {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <button className="btn btn-ghost w-full" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
