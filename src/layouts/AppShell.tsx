import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import { ShellContext } from "./shellContext";
import { Sidebar } from "../components/layout/Sidebar";
import { MobileSidebar } from "../components/layout/MobileSidebar";
import { AppHeader } from "../components/layout/AppHeader";

/**
 * Permanent authenticated application frame:
 *
 *   ┌──────────┬────────────────────────────┐
 *   │          │           HEADER           │
 *   │  SIDEBAR ├────────────────────────────┤
 *   │          │   <Outlet/> page content   │
 *   └──────────┴────────────────────────────┘
 *
 * Desktop uses a two-column CSS grid whose left track width is driven by the
 * <Sidebar>'s own collapsed state (it animates independently). Mobile renders
 * the sidebar as an off-canvas drawer. The scroll container is <main> only, so
 * there is never horizontal overflow; page content reflows normally.
 */
export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const shellValue = useMemo(
    () => ({ mobileOpen, openMobile, closeMobile }),
    [mobileOpen, openMobile, closeMobile]
  );

  return (
    <ShellContext.Provider value={shellValue}>
      <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-canvas">
        {/* desktop: grid region; mobile: drawer overlay */}
        <Sidebar />
        <MobileSidebar />

        {/* right column */}
        <div className="flex min-w-0 flex-1 flex-col lg:h-dvh">
          <AppHeader />
          <main id="app-content" className="min-h-0 flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </ShellContext.Provider>
  );
}
