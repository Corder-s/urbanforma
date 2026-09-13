import { useEffect, useId, useRef, useState } from "react";
import { Flag, Link2Off, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { FormSelect } from "../../../components/ui/FormSelect";
import { Input } from "../../../components/ui/Input";
import { Textarea } from "../../../components/ui/Textarea";
import { useDialogBehavior } from "../../../components/ui/useDialogBehavior";
import { SEVERITY_META } from "../data/bim.data";
import type { NewIssueInput } from "../services/bim.service";
import type { BimElement, BimIssue, BimIssueSeverity } from "../types/bim.types";

interface IssueDialogProps {
  open: boolean;
  /** Existing issue when editing, null when creating. */
  issue: BimIssue | null;
  /** Element the issue is raised against (create flow). */
  element: BimElement | null;
  onCancel: () => void;
  onSubmit: (input: NewIssueInput) => void;
}

const SEVERITIES: BimIssueSeverity[] = ["critical", "high", "medium", "low"];

function locationOf(element: BimElement | null): string {
  if (!element) return "";
  return [element.name, element.level, element.material].filter(Boolean).join(" · ");
}

/**
 * Create / edit a coordination issue. Kept deliberately small: title,
 * description, severity, location and the element it is raised against. A future
 * BCF pipeline replaces the local persistence, not this form.
 */
export function IssueDialog({ open, issue, element, onCancel, onSubmit }: IssueDialogProps) {
  const id = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const ref = useDialogBehavior<HTMLDivElement>({ open, onClose: onCancel, initialFocus: titleRef });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<BimIssueSeverity>("medium");
  const [location, setLocation] = useState("");
  const [linked, setLinked] = useState<BimElement | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(issue?.title ?? "");
    setDescription(issue?.description ?? "");
    setSeverity(issue?.severity ?? "medium");
    setLocation(issue?.location ?? locationOf(element));
    setLinked(issue ? null : element);
    setTouched(false);
  }, [open, issue, element]);

  if (!open) return null;
  const titleError = title.trim().length < 3 ? "Give the issue a title of at least 3 characters." : undefined;
  const linkedElement: { id: string; name: string } | null = linked ?? (issue && issue.elementIds.length > 0 ? { id: issue.elementIds[0], name: issue.location || issue.elementIds[0] } : null);

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-ink/30 p-3" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="flex max-h-full w-full max-w-lg flex-col rounded-2xl border border-line bg-white shadow-float animate-pop motion-reduce:animate-none"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
            <Flag size={16} />
          </span>
          <h2 id={`${id}-title`} className="min-w-0 flex-1 truncate text-[15px] font-extrabold text-ink">
            {issue ? "Edit issue" : "Report a coordination issue"}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          <Input
            ref={titleRef}
            id={`${id}-issue-title`}
            label="Title"
            value={title}
            maxLength={140}
            error={touched ? titleError : undefined}
            hint="What is wrong, in one line."
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setTouched(true)}
          />
          <Textarea
            id={`${id}-issue-desc`}
            label="Description"
            rows={4}
            maxLength={1200}
            value={description}
            placeholder="What did you find, where, and what should happen next?"
            onChange={(e) => setDescription(e.target.value)}
          />
          <FormSelect
            id={`${id}-issue-severity`}
            label="Severity"
            value={severity}
            onChange={(v) => setSeverity(v as BimIssueSeverity)}
            options={SEVERITIES.map((s) => ({ value: s, label: SEVERITY_META[s].label }))}
            hint="Critical blocks the next issue of drawings; low is a note to self."
          />
          <Input
            id={`${id}-issue-location`}
            label="Location"
            value={location}
            maxLength={140}
            placeholder="Building A · Level 02 · north facade"
            hint="Human-readable place — the element link below carries the exact reference."
            onChange={(e) => setLocation(e.target.value)}
          />

          <div className="rounded-xl border border-line bg-surface-2 px-3 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Linked element</p>
            {linkedElement ? (
              <div className="mt-1 flex items-start gap-2">
                <p className="min-w-0 flex-1 text-[12.5px] font-bold text-ink">
                  {linkedElement.name}
                  <span className="ml-1.5 font-mono text-[11px] font-medium text-muted">{linkedElement.id}</span>
                </p>
                {!issue && (
                  <button
                    type="button"
                    onClick={() => setLinked(null)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 text-[11px] font-bold text-muted transition-colors hover:border-danger/40 hover:text-danger focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                  >
                    <Link2Off size={12} aria-hidden="true" /> Unlink
                  </button>
                )}
              </div>
            ) : (
              <p className="mt-1 text-[12px] text-muted">
                {issue
                  ? "This issue keeps the element links it was created with."
                  : "No element linked — select one in the model tree first, or report a model-wide issue."}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-4 py-3">
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setTouched(true);
              if (title.trim().length < 3) {
                titleRef.current?.focus();
                return;
              }
              onSubmit({
                title,
                description,
                severity,
                location,
                elementIds: issue ? issue.elementIds : linked ? [linked.id] : [],
              });
            }}
          >
            <Flag size={14} aria-hidden="true" /> {issue ? "Save changes" : "Create issue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
