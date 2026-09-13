import { Box, Calendar, ExternalLink, Flag, MapPin, Pencil, Trash2, X } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { IconButton } from "../../../components/ui/IconButton";
import { CATEGORY_ICON, ISSUE_STATUS_META, SEVERITY_META, formatDateTime, relativeTime } from "../data/bim.data";
import type { BimIndex } from "../lib/bimModel";
import type { BimIssue, BimIssueSeverity, BimIssueStatus } from "../types/bim.types";

interface IssueInspectorProps {
  issue: BimIssue | null;
  index: BimIndex | null;
  onStatusChange: (id: string, status: BimIssueStatus) => void;
  onSeverityChange: (id: string, severity: BimIssueSeverity) => void;
  onEdit: (issue: BimIssue) => void;
  onDelete: (issue: BimIssue) => void;
  /** Select the element and switch to the model mode. */
  onShowInModel: (elementId: string) => void;
  onClose?: () => void;
}

const STATUSES: BimIssueStatus[] = ["open", "in-review", "resolved"];
const SEVERITIES: BimIssueSeverity[] = ["critical", "high", "medium", "low"];

/** Issue details: what was found, where, against which elements, and its state. */
export function IssueInspector({ issue, index, onStatusChange, onSeverityChange, onEdit, onDelete, onShowInModel, onClose }: IssueInspectorProps) {
  if (!issue) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-surface">
        <Header onClose={onClose} />
        <div className="grid flex-1 place-items-center p-6 text-center">
          <div>
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-surface-2 text-muted" aria-hidden="true">
              <Flag size={19} />
            </span>
            <p className="mt-3 text-[13px] font-bold text-ink">No issue selected</p>
            <p className="mx-auto mt-1 max-w-[30ch] text-[12px] leading-relaxed text-muted">
              Pick an issue to read the finding, change its state, or open the element it was raised against.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const elements = issue.elementIds.map((id) => index?.byId.get(id) ?? null).filter((e): e is NonNullable<typeof e> => e !== null);

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <Header onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="border-b border-line px-3 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={SEVERITY_META[issue.severity].tone} dot>
              {SEVERITY_META[issue.severity].label}
            </Badge>
            <Badge tone={ISSUE_STATUS_META[issue.status].tone}>{ISSUE_STATUS_META[issue.status].label}</Badge>
            <Badge tone="neutral">{issue.source === "demo" ? "Demo finding" : "Local issue"}</Badge>
          </div>
          <h3 className="mt-2 text-[15px] font-extrabold leading-snug text-ink">{issue.title}</h3>
          {issue.description && <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{issue.description}</p>}
          {issue.location && (
            <p className="mt-2 flex items-start gap-1.5 text-[12px] text-ink">
              <MapPin size={13} className="mt-0.5 shrink-0 text-faint" aria-hidden="true" />
              {issue.location}
            </p>
          )}
          <p className="mt-1.5 flex items-start gap-1.5 text-[11.5px] text-muted">
            <Calendar size={13} className="mt-0.5 shrink-0 text-faint" aria-hidden="true" />
            <span>
              Raised {relativeTime(issue.createdAt)} · {formatDateTime(issue.createdAt)}
              {issue.updatedAt !== issue.createdAt && <> · updated {relativeTime(issue.updatedAt)}</>}
            </span>
          </p>
        </div>

        <section aria-labelledby="issue-state" className="border-b border-line px-3 py-2.5">
          <h4 id="issue-state" className="text-[10.5px] font-extrabold uppercase tracking-widest text-faint">
            Status & severity
          </h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={issue.status === s}
                onClick={() => onStatusChange(issue.id, s)}
                className={[
                  "rounded-lg border px-2.5 py-1 text-[11.5px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                  issue.status === s ? "border-primary/40 bg-primary/10 text-primary" : "border-line text-muted hover:text-ink",
                ].join(" ")}
              >
                {ISSUE_STATUS_META[s].label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SEVERITIES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={issue.severity === s}
                onClick={() => onSeverityChange(issue.id, s)}
                className={[
                  "rounded-lg border px-2.5 py-1 text-[11.5px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                  issue.severity === s ? "border-warning/40 bg-warning/10 text-warning" : "border-line text-muted hover:text-ink",
                ].join(" ")}
              >
                {SEVERITY_META[s].label}
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="issue-elements" className="border-b border-line px-3 py-2.5">
          <h4 id="issue-elements" className="text-[10.5px] font-extrabold uppercase tracking-widest text-faint">
            Affected elements · {issue.elementIds.length}
          </h4>
          {elements.length === 0 ? (
            <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
              {issue.elementIds.length === 0
                ? "This issue is not linked to an element — it describes the model as a whole."
                : "The linked element is not part of the model revision being viewed."}
            </p>
          ) : (
            <ul className="mt-2 grid gap-1">
              {elements.map((el) => {
                const Icon = CATEGORY_ICON[el.category];
                return (
                  <li key={el.id}>
                    <button
                      type="button"
                      onClick={() => onShowInModel(el.id)}
                      className="flex w-full items-center gap-2 rounded-lg border border-line px-2 py-1.5 text-left transition-colors hover:border-primary hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/20"
                    >
                      <Icon size={14} className="shrink-0 text-faint" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-bold text-ink">{el.name}</span>
                        <span className="block truncate text-[11px] text-muted">
                          {el.category}
                          {el.level ? ` · ${el.level}` : ""}
                        </span>
                      </span>
                      <ExternalLink size={13} className="shrink-0 text-faint" aria-hidden="true" />
                      <span className="sr-only">Show in model</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="flex flex-wrap items-center gap-1.5 px-3 py-3">
          <Button size="sm" variant="secondary" onClick={() => onEdit(issue)} className="px-2.5">
            <Pencil size={14} aria-hidden="true" /> Edit
          </Button>
          <Button size="sm" variant="secondaryDanger" onClick={() => onDelete(issue)} className="px-2.5">
            <Trash2 size={14} aria-hidden="true" /> Delete
          </Button>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-muted">
            <Box size={12} aria-hidden="true" />
            Stored locally in this browser
          </span>
        </div>
      </div>
    </div>
  );
}

function Header({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 border-b border-line px-2.5 py-2">
      <Flag size={15} className="shrink-0 text-primary" aria-hidden="true" />
      <h3 className="min-w-0 flex-1 truncate text-[12.5px] font-extrabold uppercase tracking-wide text-ink">Issue details</h3>
      {onClose && <IconButton icon={X} label="Close issue details" size="xs" onClick={onClose} />}
    </div>
  );
}
