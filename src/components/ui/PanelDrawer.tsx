import { useEffect, useState, type ReactNode } from "react";
import { useDialogBehavior } from "./useDialogBehavior";

export interface PanelDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog. */
  label: string;
  side: "left" | "right" | "bottom";
  children: ReactNode;
  /**
   * Breakpoint at which the drawer is hidden because the same panel is docked
   * inline. Omit for panels that are only ever available as an overlay.
   */
  hideAt?: "lg" | "xl";
}

/**
 * Overlay drawer scoped to its nearest positioned ancestor (absolute, not
 * fixed), so it covers the workspace box rather than the whole app and stacks
 * inside the module instead of over the global shell chrome.
 *
 * Used by every panel that docks on large screens and slides in on smaller
 * ones: visualization layers / inspector / scene settings / site context /
 * storyboard, analysis categories + details, optimization goals + scenario
 * details, and planning tools / context / properties.
 *
 * Replaces two near-identical 57-line copies (`WorkspaceDrawer` in
 * visualization, `StudioDrawer` in planning) that had drifted apart — the
 * planning one had lost the deferred-mount optimisation and was re-focusing its
 * first control on every parent render.
 *
 * Behaviour: closes on backdrop click and Escape, moves focus in on open,
 * traps Tab, restores focus on close (all via `useDialogBehavior`), locks
 * nothing globally, and honours `prefers-reduced-motion`.
 */
export function PanelDrawer({ open, onClose, label, side, children, hideAt }: PanelDrawerProps) {
  const panelRef = useDialogBehavior<HTMLDivElement>({ open, onClose });

  // Children mount only while the drawer is open (plus the close transition),
  // so a closed drawer costs nothing to render. This matters for the panel
  // that holds the storyboard thumbnails.
  const [linger, setLinger] = useState(false);
  useEffect(() => {
    if (open) {
      setLinger(true);
      return;
    }
    const timer = window.setTimeout(() => setLinger(false), 220);
    return () => window.clearTimeout(timer);
  }, [open]);
  const mounted = open || linger;

  const hidden = hideAt === "lg" ? "lg:hidden" : hideAt === "xl" ? "xl:hidden" : "";
  const position =
    side === "left"
      ? "left-0 top-0 h-full w-[300px] max-w-[85%]"
      : side === "right"
        ? "right-0 top-0 h-full w-[340px] max-w-[92%]"
        : "bottom-0 left-0 w-full max-h-[72%] rounded-t-2xl";
  const offscreen =
    side === "left" ? "-translate-x-full" : side === "right" ? "translate-x-full" : "translate-y-full";

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
        data-inner=""
        aria-label={label}
        className={`absolute ${position} flex flex-col overflow-hidden bg-white shadow-float transition-transform duration-200 ease-out motion-reduce:transition-none ${open ? "translate-x-0 translate-y-0" : offscreen}`}
      >
        {mounted && children}
      </div>
    </div>
  );
}
