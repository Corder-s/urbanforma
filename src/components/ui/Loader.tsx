interface LoaderProps {
  label?: string;
  className?: string;
}

/** Lightweight branded spinner (transform/opacity, no layout shift). */
export function Loader({ label = "Loading…", className = "" }: LoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-canvas",
        className,
      ].join(" ")}
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface shadow-soft ring-1 ring-line">
        <svg className="h-6 w-6 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
        </svg>
      </span>
      <span className="text-sm font-medium text-muted">{label}</span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
