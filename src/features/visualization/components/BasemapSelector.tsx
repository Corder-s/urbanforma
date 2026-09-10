import { useEffect, useId, useRef, useState } from "react";
import { Check, Map } from "lucide-react";
import { BASEMAPS } from "../data/visualization.data";
import type { BasemapId } from "../types/visualization.types";

interface BasemapSelectorProps {
  value: BasemapId;
  onChange: (b: BasemapId) => void;
  disabled?: boolean;
  /** Render as an inline swatch radiogroup (inside another menu / panel) instead of a dropdown trigger. */
  inline?: boolean;
}

/** Toolbar basemap menu — simulated cartographic styles, no tile provider. */
export function BasemapSelector({ value, onChange, disabled, inline = false }: BasemapSelectorProps) {
  if (inline) return <InlineBasemaps value={value} onChange={onChange} disabled={disabled} />;
  return <BasemapMenu value={value} onChange={onChange} disabled={disabled} />;
}

function InlineBasemaps({ value, onChange, disabled }: Omit<BasemapSelectorProps, "inline">) {
  return (
    <div role="radiogroup" aria-label="Basemap (simulated styles)" className="grid grid-cols-4 gap-1">
      {BASEMAPS.map((b) => {
        const active = b.id === value;
        return (
          <button key={b.id} type="button" role="radio" aria-checked={active} disabled={disabled} onClick={() => onChange(b.id)} title={b.description} className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 text-[10.5px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-40 ${active ? "border-primary bg-primary/5 text-primary" : "border-line text-muted hover:border-line-strong hover:text-ink"}`}>
            <span className="h-6 w-full rounded-md ring-1 ring-line" style={{ background: b.swatch }} aria-hidden="true" />
            {b.label}
          </button>
        );
      })}
    </div>
  );
}

function BasemapMenu({ value, onChange, disabled }: Omit<BasemapSelectorProps, "inline">) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();
  const current = BASEMAPS.find((b) => b.id === value) ?? BASEMAPS[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    listRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const moveFocus = (dir: 1 | -1) => {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    items[(i + dir + items.length) % items.length]?.focus();
  };

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`Basemap: ${current.label}`}
        title={`Basemap: ${current.label}`}
        className={[
          "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2 text-[12.5px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-40",
          open ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface-2 hover:text-primary",
        ].join(" ")}
      >
        <Map size={18} aria-hidden="true" />
        <span className="hidden h-4 w-4 rounded-[5px] ring-1 ring-line md:block" style={{ background: current.swatch }} aria-hidden="true" />
        <span className="hidden max-w-[120px] truncate xl:inline">{current.label}</span>
      </button>
      {open && (
        <ul
          ref={listRef}
          id={id}
          role="menu"
          aria-label="Basemap"
          className="absolute right-0 top-full z-30 mt-1 w-72 max-w-[calc(100vw_-_1.5rem)] rounded-2xl border border-line bg-white p-1.5 shadow-float animate-pop motion-reduce:animate-none"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              moveFocus(1);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              moveFocus(-1);
            }
          }}
        >
          <li className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-bold uppercase tracking-widest text-faint" role="presentation">
            Basemap · simulated styles
          </li>
          {BASEMAPS.map((b) => {
            const active = b.id === value;
            return (
              <li key={b.id} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    onChange(b.id);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={[
                    "flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                    active ? "bg-primary/10" : "hover:bg-surface-2",
                  ].join(" ")}
                >
                  <span className="mt-0.5 h-8 w-8 shrink-0 rounded-lg ring-1 ring-line" style={{ background: b.swatch }} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[13px] font-bold ${active ? "text-primary" : "text-ink"}`}>{b.label}</span>
                    <span className="block text-[11.5px] leading-snug text-muted">{b.description}</span>
                  </span>
                  {active && <Check size={15} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
