import type { ReactNode } from "react";

/**
 * Tiny form primitives shared by the visualization panels (settings, scene
 * controls, presentation settings). Kept local to the module so the global UI
 * kit stays untouched; every control is keyboard operable with visible focus.
 */

export function Switch({ id, checked, onChange, label, hint, disabled }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <label htmlFor={id} className={`min-w-0 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
        <span className="block text-[13px] font-semibold text-ink">{label}</span>
        {hint && <span className="block text-[11.5px] leading-snug text-muted">{hint}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`${label}: ${checked ? "On" : "Off"}`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-50",
          checked ? "border-primary bg-primary" : "border-line-strong bg-surface-2",
        ].join(" ")}
      >
        <span className={`inline-block rounded-full bg-surface shadow-soft transition-transform motion-reduce:transition-none ${checked ? "translate-x-[22px]" : "translate-x-[3px]"}`} style={{ width: 18, height: 18 }} aria-hidden="true" />
        <span className="sr-only">{checked ? "On" : "Off"}</span>
      </button>
    </div>
  );
}

export function Slider({ id, label, value, onChange, min = 0, max = 100, step = 1, format, hint }: { id: string; label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; format: (v: number) => string; hint?: string }) {
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-semibold text-ink">
          {label}
        </label>
        <output htmlFor={id} className="tabular-nums text-[12px] font-bold text-primary">
          {format(value)}
        </output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1.5 h-2 w-full cursor-pointer accent-primary" aria-valuetext={format(value)} />
      {hint && <p className="mt-0.5 text-[11px] leading-snug text-muted">{hint}</p>}
    </div>
  );
}

/** Segmented single-choice control (radiogroup semantics). */
export function Segmented<T extends string>({ label, value, onChange, options, columns, size = "md", labelledBy }: { label: string; value: T; onChange: (v: T) => void; options: { id: T; label: string; hint?: string; icon?: ReactNode }[]; columns?: number; size?: "sm" | "md"; labelledBy?: string }) {
  return (
    <div role="radiogroup" aria-label={labelledBy ? undefined : label} aria-labelledby={labelledBy} className={`grid gap-1 ${columns ? "" : "grid-flow-col auto-cols-fr"}`} style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.hint}
            onClick={() => onChange(o.id)}
            className={[
              "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg border font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
              size === "sm" ? "h-8 px-2 text-[11.5px]" : "h-9 px-2.5 text-[12.5px]",
              active ? "border-primary bg-primary/10 text-primary" : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink",
            ].join(" ")}
          >
            {o.icon}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PanelHeader({ id, title, onClose, closeLabel, children }: { id: string; title: string; onClose?: () => void; closeLabel?: string; children?: ReactNode }) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-line px-4">
      <h2 id={id} className="text-[11px] font-bold uppercase tracking-widest text-faint">
        {title}
      </h2>
      <div className="flex items-center gap-0.5">
        {children}
        {onClose && (
          <button type="button" onClick={onClose} aria-label={closeLabel ?? `Close ${title.toLowerCase()}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <h3 className="flex items-center justify-between gap-2 pt-1 text-[10.5px] font-bold uppercase tracking-widest text-faint">
      <span>{children}</span>
      {right}
    </h3>
  );
}
