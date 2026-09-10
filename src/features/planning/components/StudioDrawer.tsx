import { useEffect, useRef, type ReactNode } from "react";

interface StudioDrawerProps {
  open: boolean;
  onClose: () => void;
  label: string;
  side: "left" | "right" | "bottom";
  children: ReactNode;
  /** Tailwind breakpoint class at which the drawer is hidden because the panel is docked. */
  hideAt: "lg" | "xl";
}

/**
 * Overlay drawer for panels that are docked on large screens and slide in on
 * smaller ones (inspector at < xl, tools/context at < lg). Scoped to the
 * studio area (absolute inside the workspace box), keyboard dismissable.
 */
export function StudioDrawer({ open, onClose, label, side, children, hideAt }: StudioDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("button, input, [tabindex='0']")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const hidden = hideAt === "lg" ? "lg:hidden" : "xl:hidden";
  const pos =
    side === "left"
      ? "left-0 top-0 h-full w-[300px] max-w-[85%]"
      : side === "right"
      ? "right-0 top-0 h-full w-[340px] max-w-[92%]"
      : "bottom-0 left-0 w-full max-h-[70%] rounded-t-2xl";
  const closed = side === "left" ? "-translate-x-full" : side === "right" ? "translate-x-full" : "translate-y-full";

  return (
    <div className={`absolute inset-0 z-20 ${hidden} ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-ink/30 transition-opacity duration-200 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`absolute ${pos} flex flex-col overflow-hidden bg-white shadow-float transition-transform duration-200 ease-out motion-reduce:transition-none ${open ? "translate-x-0 translate-y-0" : closed}`}
      >
        {children}
      </div>
    </div>
  );
}
