export default function DoodleSignature({ small }: { small?: boolean }) {
  const size = small ? "w-[34px] h-[34px]" : "w-[220px] h-[220px]";
  const base = "fill-none stroke-[6] [stroke-linecap:round] [stroke-linejoin:round] [stroke-dasharray:1] [stroke-dashoffset:1] motion-safe:animate-draw-in motion-reduce:[stroke-dashoffset:0]";

  return (
    <svg
      className={`${size} overflow-visible`}
      viewBox="0 0 240 240"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle className={`${base} stroke-brand-yellow`} cx="120" cy="120" r="90" pathLength={1} />
      <path className={`${base} stroke-brand-blue [animation-delay:0.9s]`} d="M78 105 q6 -14 14 0" pathLength={1} />
      <path className={`${base} stroke-brand-blue [animation-delay:1.05s]`} d="M148 105 q6 -14 14 0" pathLength={1} />
      <path className={`${base} stroke-brand-pink [animation-delay:1.2s]`} d="M72 140 q48 55 96 0" pathLength={1} />
      <path
        className={`${base} stroke-ink-faint stroke-[5] [animation-delay:1.6s]`}
        d="M188 40 l30 30 -110 110 -34 4 4 -34 z"
        pathLength={1}
      />
    </svg>
  );
}
