import { useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "../../../components/ui/Button";
import { useDialogBehavior } from "../../../components/ui/useDialogBehavior";

interface ConfirmActionProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
  /** Extra detail under the description (a key count, a consequence list). */
  children?: ReactNode;
}

/**
 * Confirmation gate for every destructive settings action (clear a category,
 * reset demo data, reset all settings, sign out).
 *
 * Fixed rather than absolute so it covers the whole viewport regardless of the
 * panel it was opened from, and `bg-scrim` (never themed) so the backdrop stays
 * a scrim in light and dark alike. Focus trap, Escape and focus restoration come
 * from the shared `useDialogBehavior` the app's other modals already use.
 */
export function ConfirmAction({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "primary",
  onConfirm,
  onCancel,
  children,
}: ConfirmActionProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const ref = useDialogBehavior<HTMLDivElement>({ open, onClose: onCancel, initialFocus: confirmRef });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-scrim/45 p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onCancel()}
    >
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="settings-confirm-title"
        aria-describedby="settings-confirm-desc"
        className="w-full max-w-md animate-pop rounded-2xl border border-line bg-surface p-5 shadow-float motion-reduce:animate-none"
      >
        <h2 id="settings-confirm-title" className="text-[16px] font-extrabold tracking-tight text-ink">
          {title}
        </h2>
        <div id="settings-confirm-desc" className="mt-1.5 text-[13px] leading-relaxed text-muted">
          {description}
        </div>
        {children}
        <div className="mt-5 flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            size="sm"
            variant={tone === "danger" ? "secondaryDanger" : "primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
