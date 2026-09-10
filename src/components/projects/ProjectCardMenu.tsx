import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { MoreVertical, Pencil, Copy, Archive, BadgeInfo } from "lucide-react";
import type { Project } from "../../features/projects/project.types";

interface ProjectCardMenuProps {
  project: Project;
  /** Safe local action (demo data only): marks the project archived. */
  onArchive: (id: string) => void;
}

/** Approximate rendered height of the panel; used to decide flip direction. */
const PANEL_HEIGHT = 200;

/** Compact three-dot menu. Rename/Duplicate are not built yet (honest notice);
 *  Archive performs the safe, reversible local-state change on demo data.
 *  The panel flips above the trigger when there is no room below it, so it is
 *  never clipped by the bottom of the scroll container. */
export function ProjectCardMenu({ project, onArchive }: ProjectCardMenuProps) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Decide whether the panel should open upward before it paints.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const scroller = triggerRef.current.closest("main");
    const bottomLimit = scroller ? scroller.getBoundingClientRect().bottom : window.innerHeight;
    setOpenUp(bottomLimit - rect.bottom < PANEL_HEIGHT && rect.top > PANEL_HEIGHT);
  }, [open]);

  function flash(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 2600);
  }

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`More actions for ${project.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className={[
          "grid h-9 w-9 place-items-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
          open ? "bg-surface-2 text-primary" : "text-muted hover:bg-surface-2 hover:text-primary",
        ].join(" ")}
      >
        <MoreVertical size={18} />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={`Actions for ${project.name}`}
          className={[
            "absolute right-0 z-50 w-56 animate-pop rounded-2xl border border-line bg-white p-1.5 shadow-float",
            openUp ? "bottom-full mb-1 origin-bottom-right" : "top-full mt-1 origin-top-right",
          ].join(" ")}
        >
          {notice && (
            <p
              role="status"
              className="mb-1 flex items-start gap-2 rounded-lg bg-warning/5 px-3 py-2 text-[12px] font-medium text-warning"
            >
              <BadgeInfo size={15} className="mt-0.5 shrink-0" />
              {notice}
            </p>
          )}
          <MenuItem
            icon={<Pencil size={16} />}
            label="Rename"
            onClick={() => flash("Rename will be available in a later step.")}
          />
          <MenuItem
            icon={<Copy size={16} />}
            label="Duplicate"
            onClick={() => flash("Duplicate will be available in a later step.")}
          />
          {project.status !== "Archived" && (
            <MenuItem
              icon={<Archive size={16} />}
              label="Archive"
              onClick={() => {
                onArchive(project.id);
                setOpen(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
    >
      <span className="text-muted">{icon}</span>
      {label}
    </button>
  );
}
