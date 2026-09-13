import { useContext, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { ShellContext } from "../../layouts/shellContext";
import { Logo } from "../ui/Logo";
import { SidebarNav } from "./SidebarNav";
import { SidebarUser } from "./SidebarUser";

/**
 * Mobile off-canvas drawer. Hidden on desktop. Closes on backdrop click,
 * Escape (handled in AppShell) and navigation. Locks body scroll while open.
 */
export function MobileSidebar() {
  const { mobileOpen, closeMobile } = useContext(ShellContext);
  const panelRef = useRef<HTMLDivElement>(null);

  // Move focus into the drawer when it opens; restore scroll lock.
  useEffect(() => {
    if (!mobileOpen) return;
    panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div
      className={`fixed inset-0 z-50 lg:hidden print:hidden ${
        mobileOpen ? "" : "pointer-events-none"
      }`}
      aria-hidden={!mobileOpen}
    >
      {/* backdrop */}
      <div
        onClick={closeMobile}
        className={`absolute inset-0 bg-scrim/40 backdrop-blur-sm transition-opacity duration-300 ${
          mobileOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* drawer panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`absolute left-0 top-0 flex h-full w-[280px] max-w-[85vw] flex-col bg-surface shadow-float transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
          <Link to="/app" onClick={closeMobile} aria-label="UrbanForma home">
            <Logo size={26} />
          </Link>
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close menu"
            className="grid h-9 w-9 place-items-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          <SidebarNav onNavigate={closeMobile} />
          <SidebarUser onSignOut={closeMobile} />
        </div>
      </div>
    </div>
  );
}
