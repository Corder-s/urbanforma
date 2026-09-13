import { useEffect, useRef, useState } from "react";
import { Check, Copy, FilePlus2, Pencil, Trash2, X } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { FormSelect } from "../../../components/ui/FormSelect";
import { IconButton } from "../../../components/ui/IconButton";
import { Input } from "../../../components/ui/Input";
import { formatDate } from "../../projects/project.service";
import { REPORT_TYPES } from "../data/report.catalog";
import type { ReportConfig, ReportStatus, ReportType } from "../types/report.types";

/**
 * The project's report list: select, create, duplicate, rename and delete.
 *
 * Selection uses `aria-pressed` toggle buttons rather than a listbox, because
 * each row also carries its own actions — nesting buttons inside an element with
 * `role="option"` is not valid ARIA, and a flat row of labelled buttons is the
 * honest structure here.
 */

const STATUS_TONE: Record<ReportStatus, "neutral" | "blue" | "green" | "amber"> = {
  draft: "neutral",
  generating: "blue",
  ready: "green",
  failed: "amber",
};

const STATUS_LABEL: Record<ReportStatus, string> = {
  draft: "Draft",
  generating: "Generating",
  ready: "Ready",
  failed: "Failed",
};

interface ReportListProps {
  reports: ReportConfig[];
  /** False for the frame(s) before this project's list has been read. */
  ready: boolean;
  selectedId: string | null;
  full: boolean;
  maxReports: number;
  onSelect: (id: string) => void;
  onCreate: (type: ReportType) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export function ReportList({
  reports,
  ready,
  selectedId,
  full,
  maxReports,
  onSelect,
  onCreate,
  onDuplicate,
  onRename,
  onDelete,
}: ReportListProps) {
  const [newType, setNewType] = useState<ReportType>("comprehensive");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) editRef.current?.focus();
  }, [editingId]);

  const startRename = (report: ReportConfig) => {
    setEditingId(report.id);
    setDraftTitle(report.title);
  };

  const commitRename = () => {
    if (editingId && draftTitle.trim()) onRename(editingId, draftTitle);
    setEditingId(null);
  };

  return (
    <section aria-labelledby="reports-list-heading" className="rounded-3xl border border-line bg-surface p-4 shadow-soft sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="reports-list-heading" className="text-[15px] font-extrabold tracking-tight text-ink">
          Reports
        </h2>
        <Badge tone="neutral">
          {reports.length}/{maxReports}
        </Badge>
      </div>

      <div className="mt-3.5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <FormSelect
          id="new-report-type"
          label="New report"
          value={newType}
          onChange={(v) => setNewType(v as ReportType)}
          options={REPORT_TYPES.map((t) => ({ value: t.id, label: t.label }))}
          disabled={full}
        />
        <Button className="sm:mb-0.5" disabled={full} onClick={() => onCreate(newType)}>
          <FilePlus2 size={16} /> Create
        </Button>
      </div>
      {full && (
        <p className="mt-2 text-[12px] font-semibold text-warning">
          This project has reached {maxReports} reports — delete one to create another.
        </p>
      )}

      {!ready ? (
        <ul className="mt-4 space-y-2" aria-hidden="true">
          {[0, 1].map((i) => (
            <li key={i} className="rounded-2xl border border-line p-3">
              <span className="block h-3.5 w-2/3 animate-pulse rounded-lg bg-surface-2" />
              <span className="mt-2 block h-3 w-1/3 animate-pulse rounded-lg bg-surface-2" />
            </li>
          ))}
          <li className="sr-only">
            <span role="status">Loading reports…</span>
          </li>
        </ul>
      ) : reports.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-line bg-surface-2/50 px-3.5 py-4 text-[12.5px] leading-relaxed text-muted">
          No reports yet. Create one above — it opens with the sections for its type already chosen.
        </p>
      ) : (
        <ul className="mt-4 space-y-2" aria-label="Saved reports">
          {reports.map((report) => {
            const selected = report.id === selectedId;
            const enabled = report.sections.filter((s) => s.enabled).length;
            const editing = editingId === report.id;
            return (
              <li
                key={report.id}
                className={[
                  "rounded-2xl border p-3 transition-colors",
                  selected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-line bg-surface hover:border-line-strong",
                ].join(" ")}
              >
                {editing ? (
                  <form
                    className="space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      commitRename();
                    }}
                  >
                    <Input
                      ref={editRef}
                      id={`rename-${report.id}`}
                      label="Report title"
                      value={draftTitle}
                      maxLength={90}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.stopPropagation();
                          setEditingId(null);
                        }
                      }}
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X size={15} /> Cancel
                      </Button>
                      <Button type="submit" size="sm" disabled={!draftTitle.trim()}>
                        <Check size={15} /> Save
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onSelect(report.id)}
                      className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                    >
                      <span className="block truncate text-[13.5px] font-bold text-ink">{report.title}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted">
                        <Badge tone={STATUS_TONE[report.status]} dot>
                          {STATUS_LABEL[report.status]}
                        </Badge>
                        <span className="tabular-nums">
                          v{report.version} · {enabled} section{enabled === 1 ? "" : "s"}
                        </span>
                        <span className="truncate">{formatDate(report.updatedAt)}</span>
                      </span>
                    </button>
                    <span className="flex shrink-0 items-center gap-0.5">
                      <IconButton
                        icon={Pencil}
                        label={`Rename ${report.title}`}
                        size="sm"
                        onClick={() => startRename(report)}
                      />
                      <IconButton
                        icon={Copy}
                        label={`Duplicate ${report.title}`}
                        size="sm"
                        disabled={full}
                        onClick={() => onDuplicate(report.id)}
                      />
                      <IconButton
                        icon={Trash2}
                        label={`Delete ${report.title}`}
                        size="sm"
                        className="hover:bg-danger/10 hover:text-danger"
                        onClick={() => onDelete(report.id)}
                      />
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
