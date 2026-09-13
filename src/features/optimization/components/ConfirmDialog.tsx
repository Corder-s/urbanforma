import { useId, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "../../../components/ui/Button";
import { useDialogBehavior } from "../../../components/ui/useDialogBehavior";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

/**
 * Small modal confirmation (Select / Apply / Reset). Rendered inside the
 * workspace (no portal) so it stacks inside the module, not over the global
 * shell chrome. Focus management lives in `useDialogBehavior`.
 */
export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel = "Cancel", tone = "primary", onConfirm, onCancel, children }: ConfirmDialogProps) {
  const id = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  // Focus in on open, Tab trapped, Escape cancels, focus restored to the
  // trigger on close. Shared with the app's other modals — see useDialogBehavior.
  const ref = useDialogBehavior<HTMLDivElement>({ open, onClose: onCancel, initialFocus: confirmRef });

  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-scrim/30 p-4" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-desc`} className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-float animate-pop motion-reduce:animate-none">
        <h2 id={`${id}-title`} className="text-[16px] font-extrabold text-ink">
          {title}
        </h2>
        <div id={`${id}-desc`} className="mt-1.5 text-[13px] leading-relaxed text-muted">
          {description}
        </div>
        {children}
        <div className="mt-5 flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button ref={confirmRef} size="sm" variant={tone === "danger" ? "secondaryDanger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
