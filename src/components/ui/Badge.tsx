import type { ReactNode } from "react";

type BadgeTone = "neutral" | "blue" | "teal" | "amber" | "green";

interface BadgeProps {
  tone?: BadgeTone;
  /** Show a small leading status dot (status is never color-only — label is always present). */
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-muted ring-line",
  blue: "bg-primary/10 text-primary ring-primary/20",
  teal: "bg-accent/10 text-accent ring-accent/20",
  amber: "bg-warning/10 text-warning ring-warning/20",
  green: "bg-success/10 text-success ring-success/20",
};

const dotColors: Record<BadgeTone, string> = {
  neutral: "bg-faint",
  blue: "bg-primary",
  teal: "bg-accent",
  amber: "bg-warning",
  green: "bg-success",
};

/** Compact, calm status pill — soft fill + thin ring, never a loud neon. */
export function Badge({ tone = "neutral", dot = false, children, className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold ring-1",
        tones[tone],
        className,
      ].join(" ")}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[tone]}`} aria-hidden="true" />}
      {children}
    </span>
  );
}
