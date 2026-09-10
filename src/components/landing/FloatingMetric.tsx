import type { LucideIcon } from "lucide-react";

interface FloatingMetricProps {
  icon: LucideIcon;
  label: string;
  value: string;
  className?: string;
  delay?: number;
}

/** Small illustrative metric card that floats around the hero city. */
export function FloatingMetric({
  icon: Icon,
  label,
  value,
  className = "",
  delay = 0,
}: FloatingMetricProps) {
  return (
    <div
      className={[
        "pointer-events-none absolute z-20 flex items-center gap-3 rounded-2xl border border-line bg-white/90 px-3.5 py-2.5 shadow-float backdrop-blur-sm",
        "animate-floaty",
        className,
      ].join(" ")}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon size={17} strokeWidth={2.2} />
      </span>
      <span className="leading-tight">
        <span className="block text-[10.5px] font-bold uppercase tracking-wider text-muted">
          {label}
        </span>
        <span className="block text-[15px] font-extrabold text-ink">{value}</span>
      </span>
    </div>
  );
}
