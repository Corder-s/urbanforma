import { useEffect, useRef } from "react";

/** Everything that can receive focus inside a dialog, in DOM order. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A ref-like holder. Declared structurally rather than as React's `RefObject`
 * so it accepts `useRef<T>(null)` results under both the React 18 and React 19
 * type definitions.
 */
export interface ElementRef {
  readonly current: HTMLElement | null;
}

export interface DialogBehaviorOptions {
  /** Whether the dialog is open. All behaviour is inert while false. */
  open: boolean;
  /** Invoked on Escape. */
  onClose: () => void;
  /** Element to focus on open; falls back to the first focusable descendant. */
  initialFocus?: ElementRef;
  /**
   * Keep Escape from also reaching handlers behind the dialog — e.g. the
   * visualization workspace's global shortcuts or an outer drawer. Defaults to
   * true, which is what a modal should do.
   */
  stopEscapePropagation?: boolean;
}

/**
 * The ARIA modal contract for `role="dialog"` / `role="alertdialog"`: move
 * focus in on open, trap Tab inside, close on Escape, and restore focus to
 * whatever held it before.
 *
 * Extracted from `ConfirmDialog`, which already implemented this correctly, so
 * the app's other dialogs could stop declaring `aria-modal="true"` without
 * actually behaving like one. `aria-modal` tells assistive technology the
 * background is inert; with no trap, Tab walks straight into it anyway.
 *
 * ```tsx
 * const dialogRef = useDialogBehavior<HTMLDivElement>({ open, onClose });
 * return open ? <div ref={dialogRef} role="dialog" aria-modal="true">…</div> : null;
 * ```
 *
 * The returned ref must go on the dialog element itself, not the backdrop.
 * `onClose` is read through a ref, so passing an inline arrow function does not
 * re-trigger focus management on every parent render.
 *
 * ### Escape and outer key handlers
 *
 * This listens on `document` in the capture phase and calls `stopPropagation`,
 * which is enough to beat bubble-phase handlers further down the tree. It is
 * **not** enough to beat a handler registered on `window` in the capture phase,
 * because capture runs window → document → target, so such a handler has
 * already fired by the time this one runs.
 *
 * `useSlideshow` is exactly that case: it owns the presentation shortcuts
 * (including Escape = exit the show) from a `window` capture listener. It
 * therefore opts out itself when focus is inside a nested surface, via
 * `[role="menu"], [role="alertdialog"], [role="dialog"][data-inner]`.
 *
 * **So any dialog that can be open while a presentation is running must carry
 * `data-inner`** (`PanelDrawer`, the capture/share previews and the storyboard
 * edit dialog all do). Without it, Escape closes the dialog *and* exits the
 * show. `role="alertdialog"` is matched by the guard directly, so
 * `ConfirmDialog` needs no attribute.
 */
export function useDialogBehavior<T extends HTMLElement>({
  open,
  onClose,
  initialFocus,
  stopEscapePropagation = true,
}: DialogBehaviorOptions) {
  const ref = useRef<T | null>(null);

  // Hold the latest close handler without making it an effect dependency — an
  // inline `() => setOpen(false)` would otherwise re-run this effect, and with
  // it the focus capture/restore, on every parent render.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const restoreTo = document.activeElement as HTMLElement | null;
    const dialog = ref.current;

    const focusables = (): HTMLElement[] =>
      dialog ? Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];

    // Focus the intended control, else the first focusable, else the dialog
    // shell itself so the Escape handler always has a live element.
    const target = initialFocus?.current ?? focusables()[0] ?? dialog;
    target?.focus?.();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (stopEscapePropagation) event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const items = focusables();
      if (items.length === 0) {
        // Nothing to move to — hold focus inside instead of letting it escape.
        event.preventDefault();
        dialog.focus?.();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      // Also wrap when focus sits on the dialog shell or has left it entirely,
      // so the first Tab after opening always lands on a real control.
      const outside = !dialog.contains(active);

      if (event.shiftKey && (outside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (outside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    // Capture phase, so this runs before document-level shortcuts that would
    // otherwise react to a keypress belonging to the dialog.
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      restoreTo?.focus?.();
    };
  }, [open, initialFocus, stopEscapePropagation]);

  return ref;
}
