import { forwardRef, type ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  size?: "sm" | "md";
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
          size === "sm" ? "h-9 w-9" : "h-11 w-11",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted hover:bg-surface-2 hover:text-primary",
          className,
        ].join(" ")}
        {...rest}
      >
        <Icon size={size === "sm" ? 18 : 20} />
      </button>
    );
  }
);
IconButton.displayName = "IconButton";
