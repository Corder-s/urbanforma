import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

type Variant = "primary" | "secondary" | "ghost" | "onBrand" | "onBrandGhost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "text-white bg-primary hover:bg-primary-dark shadow-glow disabled:bg-primary/60",
  secondary:
    "text-primary bg-white border border-line hover:border-primary hover:bg-surface-2 shadow-soft",
  ghost: "text-muted hover:text-primary hover:bg-surface-2",
  // For placement on the brand gradient (CTA band). These exist as real
  // variants rather than className overrides because a `bg-white` passed via
  // className cannot reliably beat the variant's `bg-primary`: both are
  // single-class utilities, so the winner is decided by compiled CSS order,
  // not attribute order — which left "Get Started" rendering blue-on-blue.
  onBrand:
    "text-primary-dark bg-white hover:bg-white/90 shadow-float focus-visible:ring-white/50",
  onBrandGhost:
    "text-white border border-white/40 bg-white/10 hover:bg-white/20 hover:text-white focus-visible:ring-white/40",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-4 text-sm rounded-lg",
  md: "h-11 px-5 text-sm rounded-xl",
  lg: "h-12 px-6 text-base rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      className = "",
      children,
      disabled,
      ...rest
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={[
          "inline-flex items-center justify-center gap-2 font-semibold",
          "transition duration-200 select-none",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-80",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? "w-full" : "",
          className,
        ].join(" ")}
        {...rest}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-90"
              fill="currentColor"
              d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
