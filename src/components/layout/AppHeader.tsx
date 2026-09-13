import { useContext, useEffect, useId, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Menu, Search, Bell, X, ChevronRight, Info, CheckCircle2, AlertTriangle } from "lucide-react";
import { ShellContext } from "../../layouts/shellContext";
import { ROUTE_TITLES } from "../navigation/navConfig";
import { UserMenu } from "../user/UserMenu";
import { useSettings } from "../../features/settings/hooks/useSettings";
import { useUnitPreferences } from "../../features/settings/hooks/useUnitPreferences";
import type { NotificationCategory, UnitSystem } from "../../features/settings/types/settings.types";

/**
 * Preview notifications. Each carries the category that Settings →
 * Notifications switches on and off, so the preference has a real effect even
 * before a notification service exists.
 */
const NOTIFICATIONS: { icon: typeof Info; color: string; title: string; text: string; time: string; category: NotificationCategory }[] = [
  { icon: CheckCircle2, color: "#16A34A", title: "Analysis complete", text: "Sunlight study for Riverside District is ready.", time: "2h ago", category: "analysisCompleted" },
  { icon: Info, color: "#2563EB", title: "New layer available", text: "Flood-risk data added to the GIS catalog.", time: "5h ago", category: "system" },
  { icon: AlertTriangle, color: "#D97706", title: "Scenario review", text: "Option B exceeds the shading threshold.", time: "1d ago", category: "optimizationCompleted" },
];

export function AppHeader() {
  const { openMobile } = useContext(ShellContext);
  const location = useLocation();
  // The header's metric/imperial switch *is* the workspace unit preference —
  // one central setting (Settings → Units), not per-page state.
  const { system: unit, setSystem: setUnit } = useUnitPreferences();
  const { settings } = useSettings();
  const notifications = NOTIFICATIONS.filter((n) => settings.notifications[n.category]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const notifRef = useRef<HTMLDivElement>(null);
  const notifId = useId();

  // Exact match first; otherwise fall back to the nearest parent section so
  // nested routes such as /app/projects/:id still read "Projects".
  const title =
    ROUTE_TITLES[location.pathname] ??
    Object.entries(ROUTE_TITLES).find(
      ([path]) => path !== "/app" && location.pathname.startsWith(`${path}/`)
    )?.[1] ??
    "UrbanForma";

  useEffect(() => {
    if (!notifOpen) return;
    function onDown(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setNotifOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [notifOpen]);

  return (
    // `relative z-40` lifts the whole header (and its dropdowns) above page
    // content. Without it, transformed/animated cards in <main> paint over
    // the notification and user menus.
    <header className="relative z-40 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6 print:hidden">
      {/* mobile menu trigger */}
      <button
        type="button"
        onClick={openMobile}
        aria-label="Open navigation menu"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 lg:hidden"
      >
        <Menu size={22} />
      </button>

      {/* breadcrumb / context */}
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="hidden shrink-0 font-medium text-faint sm:block">UrbanForma</span>
        <ChevronRight size={15} className="hidden shrink-0 text-line-strong sm:block" aria-hidden="true" />
        <span className="truncate font-bold text-ink" aria-current="page">{title}</span>
      </div>

      {/* global search — UI only for now */}
      <div className="relative ml-auto hidden md:block">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects, sites and tools..."
          aria-label="Search projects, sites and tools"
          className="h-10 w-56 rounded-xl border border-line bg-canvas pl-10 pr-3 text-sm text-ink placeholder:text-faint transition-[width,border-color,background-color,box-shadow] focus:w-72 focus:border-primary focus:bg-surface focus:outline-none focus:ring-4 focus:ring-primary/15 lg:w-64"
        />
      </div>
      <button
        type="button"
        onClick={() => {
          setSearchOpen((o) => !o);
          setNotifOpen(false);
        }}
        aria-label="Search"
        aria-expanded={searchOpen}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 md:hidden"
      >
        {searchOpen ? <X size={20} /> : <Search size={20} />}
      </button>

      {/* unit selector — writes the central unit preference */}
      <div
        role="group"
        aria-label="Units"
        className="hidden shrink-0 items-center rounded-xl border border-line bg-canvas p-0.5 sm:flex"
      >
        {(["metric", "imperial"] as UnitSystem[]).map((u) => (
          <button
            key={u}
            type="button"
            aria-pressed={unit === u}
            onClick={() => setUnit(u)}
            className={[
              "rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              unit === u ? "bg-surface text-primary shadow-soft" : "text-muted hover:text-ink",
            ].join(" ")}
          >
            {u === "metric" ? "Metric" : "Imperial"}
          </button>
        ))}
      </div>

      {/* notifications — frontend placeholder */}
      {/* The trigger is `static` (not `relative`) so the panel positions
          against the header, not the 40px bell. That keeps the panel inside the
          viewport instead of overflowing past the user menu on small screens. */}
      <div ref={notifRef} className="static shrink-0 sm:relative">
        <button
          type="button"
          onClick={() => {
            setNotifOpen((o) => !o);
            setSearchOpen(false);
          }}
          aria-haspopup="menu"
          aria-expanded={notifOpen}
          aria-controls={notifId}
          aria-label={`Notifications${notifOpen ? "" : `, ${notifications.length} unread`}`}
          className={[
            "relative grid h-10 w-10 place-items-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
            notifOpen ? "bg-surface-2 text-primary" : "text-muted hover:bg-surface-2 hover:text-primary",
          ].join(" ")}
        >
          <Bell size={20} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger ring-2 ring-surface" aria-hidden="true" />
        </button>

        {notifOpen && (
          <div
            id={notifId}
            role="menu"
            aria-label="Notifications"
            className="absolute right-3 top-full z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] origin-top-right animate-pop rounded-2xl border border-line bg-surface p-1.5 shadow-float sm:right-0 sm:top-auto"
          >
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <p className="text-sm font-extrabold text-ink">Notifications</p>
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                {notifications.length} new
              </span>
            </div>
            <ul className="space-y-0.5">
              {notifications.map((n) => (
                <li key={n.title}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setNotifOpen(false)}
                    className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  >
                    <span
                      className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                      style={{ backgroundColor: `${n.color}1a`, color: n.color }}
                    >
                      <n.icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold leading-snug text-ink">{n.title}</span>
                      <span className="block text-[13px] leading-snug text-muted">{n.text}</span>
                      <span className="mt-0.5 block text-[11px] font-medium text-faint">{n.time}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {notifications.length === 0 && (
              <p className="px-3 py-4 text-center text-[12px] text-muted">
                Nothing to show — every category is switched off in Settings → Notifications.
              </p>
            )}
            <p className="border-t border-line px-3 py-2 text-[11px] font-medium text-faint">
              Preview notifications — not connected to a service. Categories follow Settings → Notifications.
            </p>
          </div>
        )}
      </div>

      <div className="shrink-0">
        <UserMenu />
      </div>

      {/* mobile search field (drops down below the header) */}
      {searchOpen && (
        <div className="absolute inset-x-0 top-full z-30 border-b border-line bg-surface px-4 py-3 shadow-soft md:hidden">
          <div className="relative">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects, sites and tools..."
              aria-label="Search projects, sites and tools"
              className="h-11 w-full rounded-xl border border-line bg-canvas pl-10 pr-3 text-sm text-ink placeholder:text-faint focus:border-primary focus:bg-surface focus:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
        </div>
      )}
    </header>
  );
}
