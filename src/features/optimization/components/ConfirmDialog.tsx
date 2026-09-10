import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "../../../components/ui/Button";

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
 * Small modal confirmation (Select / Apply / Reset). Focus is moved into the
 * dialog, trapped with Tab, and restored to the trigger on close; Escape
 * cancels. Rendered inside the workspace (no portal) so it stacks inside the
 * module, not over the global shell chrome.
 */
export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel = "Cancel", tone = "primary", onConfirm, onCancel, children }: ConfirmDialogProps) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((el) => !el.hasAttribute("disabled"));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      previous?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-ink/30 p-4" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-desc`} className="w-full max-w-md rounded-2xl border border-line bg-white p-5 shadow-float animate-pop motion-reduce:animate-none">
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
          <Button ref={confirmRef} size="sm" variant={tone === "danger" ? "secondary" : "primary"} onClick={onConfirm} className={tone === "danger" ? "border-danger/40 text-danger hover:bg-danger/5" : ""}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
