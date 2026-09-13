import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, FolderOpen } from "lucide-react";
import type { PlanningProjectSummary } from "../services/planning.service";

interface ProjectSwitcherProps {
  projects: PlanningProjectSummary[];
  currentId: string | null;
  currentName: string;
  onSwitch: (id: string) => void;
  /** Blocks switching while the current document has unsaved edits (confirm first). */
  dirty: boolean;
}

/** Toolbar project selector — a keyboard-accessible menu of demo projects. */
export function ProjectSwitcher({ projects, currentId, currentName, onSwitch, dirty }: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    // focus the current item
    const current = listRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]') ?? listRef.current?.querySelector("button");
    current?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const moveFocus = (dir: 1 | -1) => {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = items[(i + dir + items.length) % items.length];
    next?.focus();
  };

  const choose = (id: string) => {
    setOpen(false);
    if (id === currentId) return;
    if (dirty && !window.confirm("You have unsaved changes. Switch project and discard them?")) return;
    onSwitch(id);
  };

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Project: ${currentName}. Switch project`}
        className="flex h-9 max-w-full items-center gap-1.5 rounded-lg px-2 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
      >
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-extrabold leading-tight text-ink">{currentName}</span>
          <span className="block text-[11px] font-semibold leading-tight text-primary">Planning Studio</span>
        </span>
        <ChevronDown size={15} className={`shrink-0 text-faint transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={menuId}
          role="menu"
          aria-label="Switch project"
          className="absolute left-0 top-full z-30 mt-1 max-h-[min(60vh,420px)] w-72 max-w-[calc(100vw_-_1.5rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-float animate-pop motion-reduce:animate-none"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              moveFocus(1);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              moveFocus(-1);
            }
          }}
        >
          <li className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-bold uppercase tracking-widest text-faint" role="presentation">
            Demo projects
          </li>
          {projects.map((p) => {
            const active = p.id === currentId;
            return (
              <li key={p.id} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => choose(p.id)}
                  className={[
                    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                    active ? "bg-primary/10 text-primary" : "text-ink hover:bg-surface-2",
                  ].join(" ")}
                >
                  <FolderOpen size={15} className={active ? "text-primary" : "text-faint"} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold">{p.name}</span>
                    <span className="block truncate text-[11.5px] font-medium text-muted">
                      {p.location} · {p.status}
                    </span>
                  </span>
                  {active && <Check size={15} aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
