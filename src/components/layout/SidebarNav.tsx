import { useEffect, useId, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { NavItem } from "../navigation/NavItem";
import {
  PRIMARY_NAV,
  SECONDARY_NAV,
  HELP_ITEMS,
  HELP_LABEL,
  HelpIcon,
} from "../navigation/navConfig";

interface SidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

/** Renders the primary + secondary nav groups and the UI-only Help menu. */
export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  return (
    <nav aria-label="Application" className="flex flex-col gap-1">
      {PRIMARY_NAV.map((item) => (
        <NavItem key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
      ))}

      <div className="my-2 h-px bg-line" role="separator" aria-hidden="true" />

      {SECONDARY_NAV.map((item) => (
        <NavItem key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
      ))}

      <HelpMenu collapsed={collapsed} />
    </nav>
  );
}

/** Help is frontend-only for now: opens a small dropdown of placeholders. */
function HelpMenu({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={collapsed ? HELP_LABEL : undefined}
        title={collapsed ? HELP_LABEL : undefined}
        onClick={() => setOpen((o) => !o)}
        className={[
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition-colors duration-200",
          "hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
          collapsed ? "justify-center px-0" : "",
          open ? "bg-surface-2 text-ink" : "",
        ].join(" ")}
      >
        <HelpIcon size={20} className="shrink-0" strokeWidth={2.1} />
        {!collapsed && <span className="truncate">{HELP_LABEL}</span>}
      </button>

      {open && (
        <div
          id={panelId}
          role="menu"
          className={[
            "absolute z-50 w-60 origin-bottom-left animate-pop rounded-2xl border border-line bg-white p-1.5 shadow-float",
            collapsed ? "bottom-0 left-full ml-3" : "bottom-full left-0 mb-2",
          ].join(" ")}
        >
          {notice && (
            <p
              role="status"
              className="mb-1 rounded-lg bg-warning/5 px-3 py-2 text-[12px] font-medium text-warning"
            >
              {notice}
            </p>
          )}
          {HELP_ITEMS.map((label) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              onClick={() => {
                setNotice(`${label} will be available in a later step.`);
                window.setTimeout(() => setNotice(null), 2600);
              }}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              {label}
              <ChevronRight size={14} className="text-faint" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
