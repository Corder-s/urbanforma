import { Check, FileBox, History, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { IconButton } from "../../../components/ui/IconButton";
import { formatDate } from "../../projects/project.service";
import { MODEL_STATUS_META, formatBytes, formatDateTime, relativeTime } from "../data/bim.data";
import type { BimModel, BimModelVersion } from "../types/bim.types";

interface VersionsPanelProps {
  models: BimModel[];
  activeModel: BimModel | null;
  versions: BimModelVersion[];
  currentVersion: BimModelVersion | null;
  /** 0 = latest revision. */
  revision: number;
  elementCount: number;
  onSelectModel: (id: string) => void;
  onSelectRevision: (version: number) => void;
  onImport: () => void;
  onSync: () => void;
  syncing: boolean;
  onRemove: (model: BimModel) => void;
  canRemove: (model: BimModel) => boolean;
  onClose?: () => void;
}

/**
 * Model records and their revisions.
 *
 * A revision can be *viewed*: the element set of an earlier revision is derived
 * from the same rules that produced its recorded count, so switching revisions
 * shows a genuinely smaller model instead of only a metadata row.
 */
export function VersionsPanel({
  models,
  activeModel,
  versions,
  currentVersion,
  revision,
  elementCount,
  onSelectModel,
  onSelectRevision,
  onImport,
  onSync,
  syncing,
  onRemove,
  canRemove,
  onClose,
}: VersionsPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      <div className="flex shrink-0 items-center gap-2 border-b border-line bg-white px-3 py-2.5">
        <History size={16} className="shrink-0 text-primary" aria-hidden="true" />
        <h2 className="min-w-0 flex-1 truncate text-[13.5px] font-extrabold text-ink">Models & versions</h2>
        <Button size="sm" variant="secondary" onClick={onImport} className="shrink-0 px-2.5">
          <UploadCloud size={14} aria-hidden="true" /> Import
        </Button>
        {onClose && <IconButton icon={Check} label="Close versions" size="sm" onClick={onClose} className="shrink-0" />}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {/* model records */}
        <section aria-labelledby="bim-models" className="rounded-2xl border border-line bg-white p-3 shadow-soft">
          <h3 id="bim-models" className="text-[12.5px] font-extrabold text-ink">
            Model records <span className="font-semibold text-muted">({models.length})</span>
          </h3>
          <ul className="mt-2 grid gap-1.5">
            {models.map((m) => {
              const meta = MODEL_STATUS_META[m.status];
              const active = m.id === activeModel?.id;
              return (
                <li key={m.id}>
                  <div
                    className={[
                      "flex items-start gap-2.5 rounded-xl border px-2.5 py-2 transition-colors",
                      active ? "border-primary/40 bg-primary/5" : "border-line bg-surface-2 hover:border-line-strong",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="bim-active-model"
                      checked={active}
                      disabled={m.status !== "ready"}
                      onChange={() => onSelectModel(m.id)}
                      aria-label={`Open ${m.name}`}
                      className="mt-1 h-4 w-4 shrink-0 accent-primary disabled:opacity-40"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-bold text-ink" title={m.name}>
                        {m.name}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-muted" title={m.fileName}>
                        {m.fileName}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                        <Badge tone={meta.tone} dot>
                          {meta.label}
                        </Badge>
                        <span>
                          {m.format} · v{m.version} · {formatBytes(m.sizeBytes)}
                        </span>
                        <span title={formatDateTime(m.updatedAt)}>· {relativeTime(m.updatedAt)}</span>
                      </p>
                      {m.statusNote && <p className="mt-1.5 text-[11px] leading-relaxed text-warning">{m.statusNote}</p>}
                    </div>
                    {canRemove(m) && (
                      <IconButton icon={Trash2} label={`Remove ${m.name}`} size="xs" onClick={() => onRemove(m)} className="shrink-0" />
                    )}
                  </div>
                </li>
              );
            })}
            {models.length === 0 && <li className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-[12px] text-muted">No model records yet.</li>}
          </ul>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Button size="sm" variant="secondary" onClick={onSync} loading={syncing} disabled={!activeModel || syncing}>
              {!syncing && <RefreshCw size={14} aria-hidden="true" />} Re-derive from geometry
            </Button>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
              <FileBox size={13} aria-hidden="true" />
              {elementCount.toLocaleString("en-US")} elements in the current view
            </span>
          </div>
        </section>

        {/* active model metadata */}
        {activeModel && (
          <section aria-labelledby="bim-model-meta" className="mt-3 rounded-2xl border border-line bg-white p-3 shadow-soft">
            <h3 id="bim-model-meta" className="text-[12.5px] font-extrabold text-ink">
              {activeModel.name}
            </h3>
            <dl className="mt-2 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
              <Meta label="File" value={activeModel.fileName} mono />
              <Meta label="Format" value={`${activeModel.format} · ${activeModel.schema}`} />
              <Meta label="Version" value={`v${activeModel.version}`} />
              <Meta label="Record size" value={formatBytes(activeModel.sizeBytes)} />
              <Meta label="Author" value={activeModel.author} />
              <Meta label="Registered" value={formatDate(activeModel.uploadedAt)} />
              <Meta label="Updated" value={formatDateTime(activeModel.updatedAt)} />
              <Meta
                label="Source"
                value={
                  activeModel.source === "demo"
                    ? "Derived from project geometry (demo)"
                    : activeModel.source === "upload"
                      ? "Local upload — not processed"
                      : "Local record"
                }
              />
            </dl>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Registering a file records its name, size and type in the browser. Parsing geometry needs the BIM processing service (Java /
              Spring + IFC engine + object storage), which is a future integration — until then an upload ends in
              <span className="font-bold text-ink"> Failed</span> with the reason shown on the record.
            </p>
          </section>
        )}

        {/* versions */}
        <section aria-labelledby="bim-versions" className="mt-3 rounded-2xl border border-line bg-white p-3 shadow-soft">
          <h3 id="bim-versions" className="text-[12.5px] font-extrabold text-ink">
            Revisions <span className="font-semibold text-muted">({versions.length})</span>
          </h3>
          <ol className="mt-2 grid gap-1.5">
            {[...versions].reverse().map((v) => {
              const isCurrent = currentVersion?.id === v.id && revision === 0;
              const isViewing = revision === v.version && revision !== 0;
              const meta = MODEL_STATUS_META[v.status];
              return (
                <li key={v.id}>
                  <div
                    className={[
                      "rounded-xl border px-2.5 py-2",
                      isViewing ? "border-primary/50 bg-primary/5" : isCurrent ? "border-line bg-surface-2" : "border-line bg-white",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[12.5px] font-extrabold text-ink">{v.label}</span>
                      <Badge tone={meta.tone} dot>
                        {meta.label}
                      </Badge>
                      {isCurrent && <Badge tone="green">Latest</Badge>}
                      <span className="ml-auto shrink-0 text-[11px] text-muted" title={formatDateTime(v.createdAt)}>
                        {formatDate(v.createdAt)} · {relativeTime(v.createdAt)}
                      </span>
                    </div>
                    <ul className="mt-1.5 grid gap-0.5">
                      {v.changes.map((c) => (
                        <li key={c} className="flex items-start gap-1.5 text-[11.5px] leading-snug text-muted">
                          <span aria-hidden="true" className="mt-1 h-1 w-1 shrink-0 rounded-full bg-faint" />
                          {c}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-muted tabular-nums">
                        {v.elementCount.toLocaleString("en-US")} elements · {formatBytes(v.sizeBytes)}
                      </span>
                      {v.status === "ready" && !isCurrent && (
                        <button
                          type="button"
                          onClick={() => onSelectRevision(isViewing ? 0 : v.version)}
                          className="ml-auto rounded-lg border border-line px-2 py-0.5 text-[11px] font-bold text-muted transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                        >
                          {isViewing ? "Back to latest" : "View this revision"}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
            {versions.length === 0 && <li className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-[12px] text-muted">No revisions recorded.</li>}
          </ol>
        </section>
      </div>
    </div>
  );
}

function Meta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-white px-2.5 py-1.5">
      <dt className="text-[10.5px] font-bold uppercase tracking-wide text-muted">{label}</dt>
      <dd className={`mt-0.5 truncate text-[12px] font-bold text-ink ${mono ? "font-mono text-[11px]" : ""}`} title={value}>
        {value}
      </dd>
    </div>
  );
}
