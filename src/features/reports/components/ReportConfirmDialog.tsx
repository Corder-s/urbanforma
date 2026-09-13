import { useId, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "../../../components/ui/Button";
import { useDialogBehavior } from "../../../components/ui/useDialogBehavior";

interface ReportConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Destructive-action confirmation (delete report).
 *
 * The Reports page scrolls with the document rather than being a fixed
 * workspace, so this overlay is `fixed` and centred on the viewport. Focus
 * management — move in, trap Tab, Escape cancels, restore focus — comes from the
 * shared `useDialogBehavior` hook used by the app's other dialogs.
 */
export function ReportConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ReportConfirmDialogProps) {
  const id = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useDialogBehavior<HTMLDivElement>({ open, onClose: onCancel, initialFocus: confirmRef });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-desc`}
        className="w-full max-w-md rounded-2xl border border-line bg-white p-5 shadow-float animate-pop motion-reduce:animate-none"
      >
        <h2 id={`${id}-title`} className="text-[16px] font-extrabold tracking-tight text-ink">
          {title}
        </h2>
        <div id={`${id}-desc`} className="mt-1.5 text-[13px] leading-relaxed text-muted">
          {description}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button ref={confirmRef} size="sm" variant="secondaryDanger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
