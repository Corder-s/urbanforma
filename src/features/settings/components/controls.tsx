import { useId } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { AlertTriangle, Check, Info, Loader2 } from "lucide-react";
import type { SettingsSaveState } from "../types/settings.types";

/**
 * Presentational primitives shared by every settings panel.
 *
 * Thirteen sections could each invent their own row markup; instead they all
 * render through these, so spacing, labelling, focus rings and the way a row
 * stacks on a 390 px phone are decided once. Everything here is built from the
 * UrbanForma design tokens (surface / line / ink / primary), which is what makes
 * the panels follow the theme and high-contrast preferences.
 */

// ---------------------------------------------------------------------------
// Panel + row
// ---------------------------------------------------------------------------

interface SettingsPanelProps {
  title: string;
  description?: string;
  /** Right-aligned extra in the panel header (a badge, an "enable all" button…). */
  aside?: ReactNode;
  children: ReactNode;
}

/** A titled card grouping related controls inside a section. */
export function SettingsPanel({ title, description, aside, children }: SettingsPanelProps) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-5">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-extrabold tracking-tight text-ink">{title}</h3>
          {description && <p className="mt-1 text-[13px] leading-snug text-muted">{description}</p>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </header>
      <div>{children}</div>
    </section>
  );
}

interface SettingRowProps {
  label: string;
  /** Supporting line under the label — what the control actually changes. */
  hint?: string;
  /** Associates the label with a native control (`Input`, `Select`). */
  htmlFor?: string;
  /** The control, right-aligned on desktop and full width below `sm`. */
  children: ReactNode;
}

/** One labelled setting: text on the left, control on the right. */
export function SettingRow({ label, hint, htmlFor, children }: SettingRowProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-line py-3 last:border-b-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0 sm:max-w-[58%]">
        <label htmlFor={htmlFor} className="block text-[13px] font-bold text-ink">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-[12px] leading-snug text-muted">{hint}</p>}
      </div>
      <div className="flex min-w-0 justify-start sm:justify-end">{children}</div>
    </div>
  );
}

/** A full-width block inside a panel (tables, previews, notes). */
export function SettingBlock({ label, hint, children }: SettingRowProps) {
  return (
    <div className="border-b border-line py-3 last:border-b-0 first:pt-0">
      <p className="text-[13px] font-bold text-ink">{label}</p>
      {hint && <p className="mt-0.5 text-[12px] leading-snug text-muted">{hint}</p>}
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible name — the visible label lives in the row. */
  label: string;
  disabled?: boolean;
}

/** On/off switch. `role="switch"` + `aria-checked`; Space and Enter toggle it. */
export function Switch({ checked, onChange, label, disabled = false }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-150 motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        checked ? "border-primary bg-primary" : "border-line-strong bg-line",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "block h-4 w-4 rounded-full shadow-soft transition-transform duration-150 motion-reduce:transition-none",
          checked ? "translate-x-[1.375rem] bg-on-brand" : "translate-x-1 bg-surface",
        ].join(" ")}
      />
    </button>
  );
}

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  /** Optional icon rendered before the label. */
  icon?: ReactNode;
}

interface ChoiceGroupProps<T extends string> {
  ariaLabel: string;
  value: T;
  options: readonly ChoiceOption<T>[];
  onChange: (next: T) => void;
  disabled?: boolean;
}

/**
 * Segmented single-choice control with real radiogroup semantics: one tab stop,
 * arrow keys move the selection, `aria-checked` reports it.
 */
export function ChoiceGroup<T extends string>({ ariaLabel, value, options, onChange, disabled = false }: ChoiceGroupProps<T>) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const backward = event.key === "ArrowLeft" || event.key === "ArrowUp";
    if (!forward && !backward) return;
    event.preventDefault();
    if (options.length === 0) return;
    const index = options.findIndex((option) => option.value === value);
    const delta = forward ? 1 : -1;
    const next = options[(index + delta + options.length) % options.length];
    if (next) onChange(next.value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-line bg-canvas p-0.5"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={[
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
              selected ? "bg-surface text-primary shadow-soft" : "text-muted hover:text-ink",
            ].join(" ")}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notes + save state
// ---------------------------------------------------------------------------

interface InlineNoteProps {
  tone?: "info" | "warn";
  children: ReactNode;
}

/**
 * Honest inline note. `warn` marks something the frontend cannot really do yet
 * (backend-dependent, or local-only) so the UI never over-promises.
 */
export function InlineNote({ tone = "info", children }: InlineNoteProps) {
  const warn = tone === "warn";
  return (
    <div
      className={[
        "mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[12px] leading-relaxed",
        warn ? "border-warning/30 bg-warning/10 text-ink" : "border-line bg-canvas text-muted",
      ].join(" ")}
    >
      {warn ? (
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
      ) : (
        <Info size={14} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
      )}
      <p className="min-w-0">{children}</p>
    </div>
  );
}

const SAVE_COPY: Record<SettingsSaveState, string> = {
  idle: "All changes saved",
  saving: "Saving…",
  saved: "Saved",
  error: "Could not save",
};

/**
 * The save indicator (§: Saved / Saving / Unsaved). Writes are debounced, so
 * this is the only place the user sees persistence happen. `aria-live="polite"`
 * announces it without stealing focus.
 */
export function SaveIndicator({ state }: { state: SettingsSaveState }) {
  const error = state === "error";
  return (
    <span
      aria-live="polite"
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold",
        error ? "border-danger/30 bg-danger/10 text-danger" : "border-line bg-surface text-muted",
      ].join(" ")}
    >
      {state === "saving" ? (
        <Loader2 size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
      ) : error ? (
        <AlertTriangle size={12} aria-hidden="true" />
      ) : (
        <Check size={12} className="text-success" aria-hidden="true" />
      )}
      {SAVE_COPY[state]}
    </span>
  );
}

/** Stable id for labelling a native control from a `SettingRow`. */
export function useSettingId(prefix: string): string {
  return `${prefix}-${useId()}`;
}
