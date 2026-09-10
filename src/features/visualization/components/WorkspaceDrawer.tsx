import { useEffect, useRef, useState, type ReactNode } from "react";

interface WorkspaceDrawerProps {
  open: boolean;
  onClose: () => void;
  label: string;
  side: "left" | "right" | "bottom";
  children: ReactNode;
  /** Breakpoint at which the drawer is hidden because the panel is docked (omit = always available). */
  hideAt?: "lg" | "xl";
}

/**
 * Overlay drawer scoped to the viewport box. Used for layers (< lg), the
 * inspector (< xl) and the search / settings / site-context panels.
 */
export function WorkspaceDrawer({ open, onClose, label, side, children, hideAt }: WorkspaceDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Content mounts while the drawer is open (plus the close transition), so a
  // closed drawer costs nothing — important for the storyboard thumbnails.
  const [linger, setLinger] = useState(false);
  useEffect(() => {
    if (open) {
      setLinger(true);
      return;
    }
    const t = window.setTimeout(() => setLinger(false), 220);
    return () => window.clearTimeout(t);
  }, [open]);
  const mounted = open || linger;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("input, button, [tabindex='0']")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const hidden = hideAt === "lg" ? "lg:hidden" : hideAt === "xl" ? "xl:hidden" : "";
  const pos = side === "left" ? "left-0 top-0 h-full w-[300px] max-w-[85%]" : side === "right" ? "right-0 top-0 h-full w-[340px] max-w-[92%]" : "bottom-0 left-0 w-full max-h-[72%] rounded-t-2xl";
  const closed = side === "left" ? "-translate-x-full" : side === "right" ? "translate-x-full" : "translate-y-full";

  return (
    <div className={`absolute inset-0 z-20 ${hidden} ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div onClick={onClose} className={`absolute inset-0 bg-ink/30 transition-opacity duration-200 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`absolute ${pos} flex flex-col overflow-hidden bg-white shadow-float transition-transform duration-200 ease-out motion-reduce:transition-none ${open ? "translate-x-0 translate-y-0" : closed}`}
      >
        {mounted && children}
      </div>
    </div>
  );
}
