import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

export interface FormSelectOption {
  value: string;
  label: string;
}

interface FormSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string;
  options: FormSelectOption[];
  /** Shown as a disabled first option when the value is empty. */
  placeholder?: string;
  error?: string;
  hint?: string;
  onChange: (value: string) => void;
}

/**
 * Full-width labeled select for forms (the pill `Select` is for toolbars).
 * Native <select> for reliable keyboard, screen-reader and mobile behaviour,
 * styled to match Input (same height, radius, border and focus ring).
 */
export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, options, placeholder, error, hint, onChange, className = "", id, value, ...rest }, ref) => {
    const fieldId = id ?? rest.name;
    const empty = value === "" || value === undefined;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold text-ink">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={fieldId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={[
              "h-12 w-full cursor-pointer appearance-none rounded-xl border bg-white pl-3.5 pr-10 text-[15px] transition duration-200 focus:outline-none",
              empty ? "text-faint" : "text-ink",
              error
                ? "border-danger ring-4 ring-danger/10"
                : "border-line hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-primary/15",
              className,
            ].join(" ")}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
            {...rest}
          >
            {placeholder !== undefined && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((o) => (
              <option key={o.value} value={o.value} className="text-ink">
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={17}
            aria-hidden="true"
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-faint"
          />
        </div>
        {error && (
          <p id={`${fieldId}-error`} role="alert" className="mt-1.5 animate-pop text-[13px] font-medium text-danger">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${fieldId}-hint`} className="mt-1.5 text-[13px] text-muted">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
FormSelect.displayName = "FormSelect";
