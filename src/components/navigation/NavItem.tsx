import { NavLink } from "react-router-dom";
import type { NavLink as NavLinkType } from "./navConfig";

interface NavItemProps {
  item: NavLinkType;
  /** Desktop collapsed (rail) mode — center the icon and reveal a tooltip. */
  collapsed?: boolean;
  /** Called after navigation (used to close the mobile drawer). */
  onNavigate?: () => void;
}

/**
 * A single sidebar navigation link. Active state uses the primary blue on a
 * light-blue background (no neon). In collapsed mode the label hides and a
 * CSS-only tooltip reveals it on hover/focus.
 */
export function NavItem({ item, collapsed = false, onNavigate }: NavItemProps) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.to === "/app"}
      onClick={onNavigate}
      aria-label={collapsed ? item.label : undefined}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        [
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
          collapsed ? "justify-center px-0" : "",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted hover:bg-surface-2 hover:text-ink",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden="true"
              className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary"
            />
          )}
          <Icon size={20} className="shrink-0" strokeWidth={2.1} />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  );
}
