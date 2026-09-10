interface LogoProps {
  size?: number;
  className?: string;
  withWordmark?: boolean;
  tagline?: boolean;
}

export function Logo({
  size = 40,
  className = "",
  withWordmark = true,
  tagline = false,
}: LogoProps) {
  return (
    <div className={["flex items-center gap-3", className].join(" ")}>
      <span
        className="grid shrink-0 place-items-center rounded-2xl bg-white shadow-soft ring-1 ring-line"
        style={{ width: size + 10, height: size + 10 }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="uf-logo" x1="0" y1="32" x2="32" y2="0">
              <stop offset="0%" stopColor="#1D4ED8" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>
          <path
            d="M6 27V13l6-3.5V27M12 27V5l7-3v25M19 27V11l7 4.5V27"
            fill="none"
            stroke="url(#uf-logo)"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {withWordmark && (
        <span className="leading-tight">
          <span className="block text-[19px] font-extrabold tracking-tight text-ink">
            Urban<span className="text-primary">Forma</span>
          </span>
          {tagline && (
            <span className="block text-[12.5px] font-medium text-muted">
              Smart City Planning Platform
            </span>
          )}
        </span>
      )}
    </div>
  );
}
