import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, error, hint, trailing, className = "", id, ...rest }, ref) => {
    const inputId = id ?? rest.name;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-semibold text-ink"
          >
            {label}
          </label>
        )}
        <div
          className={[
            "group flex items-center gap-2.5 rounded-xl border bg-white px-3.5 transition duration-200 h-12",
            error
              ? "border-danger ring-4 ring-danger/10"
              : "border-line hover:border-line-strong focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15",
          ].join(" ")}
        >
          {icon && (
            <span
              className={[
                "shrink-0 transition-colors",
                error ? "text-danger" : "text-faint group-focus-within:text-primary",
              ].join(" ")}
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={[
              "w-full bg-transparent text-[15px] text-ink placeholder:text-faint focus:outline-none",
              className,
            ].join(" ")}
            aria-invalid={error ? true : undefined}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            {...rest}
          />
          {trailing && <span className="shrink-0">{trailing}</span>}
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="mt-1.5 animate-pop text-[13px] font-medium text-danger"
          >
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-[13px] text-muted">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
