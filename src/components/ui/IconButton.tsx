import { forwardRef, type ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  /** `xs` exists for dense rows (report section reordering) — overriding the
   *  width/height through `className` loses to the size classes, because both
   *  are single-class utilities and the compiled CSS order decides the winner. */
  size?: "xs" | "sm" | "md";
  active?: boolean;
}

/** Square icon-only button with an accessible (aria) label and visible focus. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon: Icon, label, size = "md", active = false, className = "", ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={[
          "grid shrink-0 place-items-center rounded-xl transition-colors",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
          size === "xs" ? "h-7 w-7 rounded-lg" : size === "sm" ? "h-9 w-9" : "h-11 w-11",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted hover:bg-surface-2 hover:text-primary",
          className,
        ].join(" ")}
        {...rest}
      >
        <Icon size={size === "xs" ? 14 : size === "sm" ? 18 : 20} />
      </button>
    );
  }
);
IconButton.displayName = "IconButton";
