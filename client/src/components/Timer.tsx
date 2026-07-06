interface Props {
  timeLeft: number;
  total: number;
}

export default function Timer({ timeLeft, total }: Props) {
  const fraction = total > 0 ? Math.max(timeLeft / total, 0) : 0;
  const circumference = 2 * Math.PI * 26;
  const offset = circumference * (1 - fraction);
  const urgent = timeLeft <= 10;

  return (
    <div className="relative w-[60px] h-[60px] shrink-0 bg-surface rounded-full shadow-sm border border-border">
      <svg viewBox="0 0 60 60" className="w-full h-full -rotate-90">
        <circle cx="30" cy="30" r="26" className="fill-none stroke-surface-dim stroke-[5]" />
        <circle
          cx="30" cy="30" r="26"
          className={`fill-none stroke-[5] [stroke-linecap:round] transition-[stroke-dashoffset] duration-300 ease-linear motion-reduce:transition-none ${urgent ? "stroke-brand-red" : "stroke-brand-blue"}`}
          strokeDasharray={circumference} strokeDashoffset={offset}
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center font-mono font-bold text-base ${urgent ? "text-brand-red" : "text-ink"}`}>
        {Math.max(timeLeft, 0)}
      </span>
    </div>
  );
}
