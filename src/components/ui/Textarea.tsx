import { forwardRef, type TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

/** Multi-line text field matching the Input styling. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = "", id, rows = 4, ...rest }, ref) => {
    const fieldId = id ?? rest.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold text-ink">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          className={[
            "w-full resize-y rounded-xl border bg-white px-3.5 py-3 text-[15px] leading-relaxed text-ink placeholder:text-faint transition-all duration-200 focus:outline-none",
            error
              ? "border-danger ring-4 ring-danger/10"
              : "border-line hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-primary/15",
            className,
          ].join(" ")}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          {...rest}
        />
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
Textarea.displayName = "Textarea";
