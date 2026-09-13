import { useMemo, useState } from "react";
import { Flag, Plus, RotateCcw, Search, X } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { IconButton } from "../../../components/ui/IconButton";
import { ISSUE_STATUS_META, SEVERITY_META, relativeTime } from "../data/bim.data";
import type { BimIssue, BimIssueSeverity, BimIssueStatus } from "../types/bim.types";

interface IssuesPanelProps {
  issues: BimIssue[];
  counts: { total: number; open: number; inReview: number; resolved: number; bySeverity: Record<BimIssueSeverity, number> };
  seeded: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onNew: () => void;
  onReseed: () => void;
  onStatusChange: (id: string, status: BimIssueStatus) => void;
  onClose?: () => void;
}

const SEVERITY_ORDER: BimIssueSeverity[] = ["critical", "high", "medium", "low"];
const STATUSES: BimIssueStatus[] = ["open", "in-review", "resolved"];

/**
 * Coordination issues — the foundation a future clash/BCF pipeline plugs into.
 * The demo findings are seeded from the derived elements and labelled as demo;
 * anything the user creates is stored locally and marked as local.
 */
export function IssuesPanel({ issues, counts, seeded, selectedId, onSelect, onNew, onReseed, onStatusChange, onClose }: IssuesPanelProps) {
  const [query, setQuery] = useState("");
  const [severities, setSeverities] = useState<BimIssueSeverity[]>([]);
  const [statuses, setStatuses] = useState<BimIssueStatus[]>([]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return issues
      .filter((i) => (severities.length === 0 || severities.includes(i.severity)) && (statuses.length === 0 || statuses.includes(i.status)))
      .filter((i) => q.length === 0 || `${i.title} ${i.description} ${i.location}`.toLowerCase().includes(q))
      .sort((a, b) => SEVERITY_META[a.severity].rank - SEVERITY_META[b.severity].rank || Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }, [issues, query, severities, statuses]);

  const toggleSeverity = (s: BimIssueSeverity) => setSeverities((prev) => (prev.includes(s) ? prev.filter((v) => v !== s) : [...prev, s]));
  const toggleStatus = (s: BimIssueStatus) => setStatuses((prev) => (prev.includes(s) ? prev.filter((v) => v !== s) : [...prev, s]));
  const filtersActive = severities.length > 0 || statuses.length > 0 || query.trim().length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex shrink-0 items-center gap-1.5 border-b border-line px-2.5 py-2">
        <Flag size={15} className="shrink-0 text-primary" aria-hidden="true" />
        <h2 className="min-w-0 flex-1 truncate text-[12.5px] font-extrabold uppercase tracking-wide text-ink">Issues</h2>
        <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted tabular-nums">{counts.total}</span>
        <IconButton icon={Plus} label="New issue" size="xs" onClick={onNew} className="shrink-0" />
        {onClose && <IconButton icon={X} label="Close issues" size="xs" onClick={onClose} className="shrink-0" />}
      </div>

      <div className="shrink-0 border-b border-line p-2">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search issues…"
            autoComplete="off"
            aria-label="Search issues"
            className="h-9 w-full rounded-lg border border-line bg-surface pl-8 pr-8 text-[12.5px] text-ink placeholder:text-faint focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear issue search" className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-faint hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {SEVERITY_ORDER.map((s) => {
            const on = severities.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => toggleSeverity(s)}
                className={[
                  "inline-flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                  on ? "border-primary/40 bg-primary/10 text-primary" : "border-line bg-surface text-muted hover:text-ink",
                ].join(" ")}
              >
                {SEVERITY_META[s].label}
                <span className="tabular-nums opacity-70">{counts.bySeverity[s]}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {STATUSES.map((s) => {
            const on = statuses.includes(s);
            const n = s === "open" ? counts.open : s === "in-review" ? counts.inReview : counts.resolved;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => toggleStatus(s)}
                className={[
                  "inline-flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                  on ? "border-primary/40 bg-primary/10 text-primary" : "border-line bg-surface text-muted hover:text-ink",
                ].join(" ")}
              >
                {ISSUE_STATUS_META[s].label}
                <span className="tabular-nums opacity-70">{n}</span>
              </button>
            );
          })}
          {filtersActive && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSeverities([]);
                setStatuses([]);
              }}
              className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] font-bold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
            >
              <RotateCcw size={11} aria-hidden="true" /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
        {shown.length === 0 ? (
          <div className="grid place-items-center px-4 py-10 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-surface-2 text-muted" aria-hidden="true">
              <Flag size={19} />
            </span>
            <p className="mt-3 text-[13px] font-bold text-ink">{issues.length === 0 ? "No issues yet" : "No issues match"}</p>
            <p className="mt-1 max-w-[32ch] text-[12px] leading-relaxed text-muted">
              {issues.length === 0
                ? "Report a coordination finding against an element, or restore the demo findings for this model."
                : "Adjust the severity, status or search to see the rest."}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              <Button size="sm" variant="secondary" onClick={onNew}>
                <Plus size={14} aria-hidden="true" /> New issue
              </Button>
              {issues.length === 0 && seeded === false && (
                <Button size="sm" variant="ghost" onClick={onReseed}>
                  <RotateCcw size={14} aria-hidden="true" /> Restore demo findings
                </Button>
              )}
            </div>
          </div>
        ) : (
          <ul className="grid gap-1" aria-label="Coordination issues">
            {shown.map((issue) => {
              const active = issue.id === selectedId;
              return (
                <li key={issue.id}>
                  <div
                    className={[
                      "rounded-xl border px-2.5 py-2 transition-colors",
                      active ? "border-primary/50 bg-primary/5" : "border-line bg-surface hover:border-line-strong hover:bg-surface-2",
                    ].join(" ")}
                  >
                    <button type="button" onClick={() => onSelect(active ? null : issue.id)} aria-expanded={active} className="flex w-full items-start gap-2 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/20 rounded-lg">
                      <Badge tone={SEVERITY_META[issue.severity].tone} className="mt-px shrink-0">
                        {SEVERITY_META[issue.severity].label}
                      </Badge>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-bold text-ink" title={issue.title}>
                          {issue.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-muted">{issue.location || "No location given"}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted">
                          <Badge tone={ISSUE_STATUS_META[issue.status].tone}>{ISSUE_STATUS_META[issue.status].label}</Badge>
                          <span>{relativeTime(issue.updatedAt)}</span>
                          {issue.source === "demo" && <span className="font-bold text-faint">demo</span>}
                          {issue.elementIds.length > 0 && <span>· {issue.elementIds.length} element{issue.elementIds.length === 1 ? "" : "s"}</span>}
                        </span>
                      </span>
                    </button>
                    {active && (
                      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-line pt-2">
                        {STATUSES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => onStatusChange(issue.id, s)}
                            aria-pressed={issue.status === s}
                            className={[
                              "rounded-lg border px-2 py-0.5 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                              issue.status === s ? "border-primary/40 bg-primary/10 text-primary" : "border-line text-muted hover:text-ink",
                            ].join(" ")}
                          >
                            {ISSUE_STATUS_META[s].label}
                          </button>
                        ))}
                        <span className="ml-auto self-center text-[11px] text-muted">Open the inspector for details</span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-line px-3 py-2 text-[11.5px] text-muted" role="status" aria-live="polite">
        {counts.open} open · {counts.inReview} in review · {counts.resolved} resolved
        {seeded && <span className="ml-1 text-faint">(includes demo findings)</span>}
      </div>
    </div>
  );
}
