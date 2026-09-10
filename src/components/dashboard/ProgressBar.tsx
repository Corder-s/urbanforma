interface ProgressBarProps {
  value: number; // 0–100
  className?: string;
  label?: string;
}

/** Thin progress indicator (color conveys state; pair with a visible value). */
export function ProgressBar({ value, className = "", label }: ProgressBarProps) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ? `${label} ${v}%` : `${v}%`}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-700 ease-out"
        style={{ width: `${v}%` }}
      />
    </div>
  );
}
