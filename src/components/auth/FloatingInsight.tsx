import type { LucideIcon } from "lucide-react";

interface FloatingInsightProps {
  icon: LucideIcon;
  title: string;
  value?: string;
  tone?: "blue" | "cyan" | "green" | "amber";
  className?: string;
  delay?: number;
}

const toneMap: Record<
  NonNullable<FloatingInsightProps["tone"]>,
  { chip: string; text: string }
> = {
  blue: { chip: "bg-primary/10 text-primary", text: "text-primary" },
  cyan: { chip: "bg-accent/10 text-accent", text: "text-accent" },
  green: { chip: "bg-success/10 text-success", text: "text-success" },
  amber: { chip: "bg-warning/10 text-warning", text: "text-warning" },
};

/** Decorative floating information card — visual storytelling only. */
export function FloatingInsight({
  icon: Icon,
  title,
  value,
  tone = "blue",
  className = "",
  delay = 0,
}: FloatingInsightProps) {
  const t = toneMap[tone];
  return (
    <div
      className={[
        "pointer-events-auto flex items-center gap-3 rounded-2xl border border-line bg-surface/90 px-3.5 py-2.5 shadow-float backdrop-blur-sm",
        "animate-card-in transition-transform duration-300 hover:-translate-y-1",
        className,
      ].join(" ")}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span
        className={["grid h-9 w-9 shrink-0 place-items-center rounded-xl", t.chip].join(
          " "
        )}
      >
        <Icon size={18} strokeWidth={2.2} />
      </span>
      <span className="leading-tight">
        <span className="block text-[12px] font-semibold text-ink">{title}</span>
        {value && (
          <span className={["block text-[11px] font-medium text-muted", t.text].join(" ")}>
            {value}
          </span>
        )}
      </span>
    </div>
  );
}
