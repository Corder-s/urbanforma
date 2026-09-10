import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  /** Accessible label (also shown as the small caption). */
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  id?: string;
  className?: string;
}

/**
 * Reusable, accessible select. Built on a native <select> so keyboard,
 * screen-reader and mobile picker behavior is reliable and dependency-free,
 * styled to match the UrbanForma design system.
 */
export function Select({ label, value, onChange, options, id, className = "" }: SelectProps) {
  return (
    <div className={["relative shrink-0", className].join(" ")}>
      <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3 shadow-soft transition-colors hover:border-line-strong focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
        <span className="text-[11px] font-bold uppercase tracking-wider text-faint">
          {label}
        </span>
        <select
          id={id}
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="cursor-pointer appearance-none bg-transparent pr-5 text-sm font-semibold text-ink focus:outline-none"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint"
        />
      </label>
    </div>
  );
}
