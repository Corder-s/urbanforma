import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { Logo } from "../ui/Logo";
import { SidebarNav } from "./SidebarNav";
import { SidebarUser } from "./SidebarUser";

/**
 * Permanent desktop sidebar. Owns its own collapsed state so toggling the
 * rail width never re-renders page content (only the sidebar + the grid track
 * animate). Hidden on mobile (see MobileSidebar drawer).
 */
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      aria-label="Primary navigation"
      className="z-30 hidden h-full flex-col border-r border-line bg-surface transition-[width] duration-300 ease-in-out lg:flex print:hidden"
      style={{ width: collapsed ? 76 : 256 }}
    >
      {/* brand + collapse control */}
      <div
        className={[
          "flex h-16 shrink-0 items-center border-b border-line",
          collapsed ? "justify-center px-2" : "justify-between px-4",
        ].join(" ")}
      >
        <Link to="/app" aria-label="UrbanForma home" className="flex items-center">
          {collapsed ? <Logo size={26} withWordmark={false} /> : <Logo size={26} />}
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="grid h-9 w-9 place-items-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          >
            <ChevronsLeft size={19} />
          </button>
        )}
      </div>

      {/* expand control when collapsed */}
      {collapsed && (
        <div className="flex justify-center pt-3">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="grid h-9 w-10 place-items-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          >
            <ChevronsRight size={19} />
          </button>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        <SidebarNav collapsed={collapsed} />
        <SidebarUser collapsed={collapsed} />
      </div>
    </aside>
  );
}
