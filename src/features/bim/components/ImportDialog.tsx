import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, FileBox, FileUp, Loader2, Server, ShieldAlert, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { useDialogBehavior } from "../../../components/ui/useDialogBehavior";
import { FORMATS, MODEL_STATUS_META, formatBytes, formatDateTime } from "../data/bim.data";
import type { UploadProgress } from "../hooks/useBimModels";
import type { UploadResult } from "../services/bim.service";

interface ImportDialogProps {
  open: boolean;
  progress: UploadProgress;
  result: UploadResult | null;
  onCancel: () => void;
  onUpload: (file: File) => void;
}

const ACCEPT = FORMATS.map((f) => f.extension).join(",");

/**
 * Import model — deliberately honest.
 *
 * The browser can read a file's name, size and type; it cannot parse IFC or RVT
 * geometry. So the dialog registers the file, runs the visible pipeline
 * (Uploading → Processing) and ends in **Failed** with the real reason: no BIM
 * processing service is connected in this release. Nothing pretends otherwise —
 * no fake element counts, no invented validation results.
 */
export function ImportDialog({ open, progress, result, onCancel, onUpload }: ImportDialogProps) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const ref = useDialogBehavior<HTMLDivElement>({ open, onClose: onCancel, initialFocus: fileRef });
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setDragging(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const stage = progress.running ? progress.stage : result ? result.model.status : null;
  const stageMeta = stage ? MODEL_STATUS_META[stage] : null;

  const submit = () => {
    if (!file) {
      setError("Choose an IFC, RVT or glTF file first.");
      fileRef.current?.focus();
      return;
    }
    setError(null);
    onUpload(file);
  };

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-ink/30 p-3" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="flex max-h-full w-full max-w-xl flex-col rounded-2xl border border-line bg-white shadow-float animate-pop motion-reduce:animate-none"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
            <FileUp size={16} />
          </span>
          <h2 id={`${id}-title`} className="min-w-0 flex-1 truncate text-[15px] font-extrabold text-ink">
            Import a BIM model
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close import"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) setFile(dropped);
            }}
            className={[
              "rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-line bg-surface-2",
            ].join(" ")}
          >
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-white text-primary shadow-soft" aria-hidden="true">
              <FileBox size={20} />
            </span>
            <p className="mt-2.5 text-[13px] font-bold text-ink">Drop a model file, or choose one</p>
            <p className="mt-0.5 text-[11.5px] text-muted">
              Accepted: {FORMATS.map((f) => f.extension).join(", ")} · the file never leaves this browser
            </p>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-[12.5px] font-bold text-primary shadow-soft transition-colors hover:border-primary focus-within:ring-4 focus-within:ring-primary/20">
              <input
                ref={fileRef}
                id={`${id}-file`}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              Choose file
            </label>
          </div>

          {file && (
            <dl className="mt-3 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
              <Cell label="File name" value={file.name} mono />
              <Cell label="Size" value={formatBytes(file.size)} />
              <Cell label="Browser type" value={file.type || "not reported"} mono />
              <Cell label="Last modified" value={formatDateTime(new Date(file.lastModified).toISOString())} />
            </dl>
          )}

          {error && (
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-[12px] font-semibold text-danger">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          {/* pipeline */}
          <section aria-labelledby={`${id}-pipeline`} className="mt-4">
            <h3 id={`${id}-pipeline`} className="text-[10.5px] font-extrabold uppercase tracking-widest text-faint">
              What happens to the file
            </h3>
            <ol className="mt-2 grid gap-1.5">
              <Stage
                icon={FileUp}
                label="Registered in the browser"
                detail="Name, size, type and timestamp are read locally and stored with the project."
                state={progress.running || result ? "done" : "idle"}
              />
              <Stage
                icon={Server}
                label="BIM processing service"
                detail="A Java / Spring service would accept the upload, queue it and write the result to object storage."
                state={stage === "processing" ? "active" : "missing"}
              />
              <Stage
                icon={Database}
                label="IFC / RVT engine"
                detail="Geometry, property sets and quantities would be parsed into the element tree you see here."
                state={stage === "processing" ? "active" : "missing"}
              />
              <Stage
                icon={ShieldAlert}
                label="Result"
                detail={
                  result
                    ? result.note
                    : "Not connected in this release — the import ends as Failed with this reason on the model record."
                }
                state={result ? (result.model.status === "failed" ? "failed" : "done") : "missing"}
              />
            </ol>
          </section>

          {(progress.running || stageMeta) && (
            <p className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-[12px] font-bold text-ink" role="status" aria-live="polite">
              {progress.running ? (
                <Loader2 size={14} className="shrink-0 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
              ) : result?.model.status === "failed" ? (
                <AlertTriangle size={14} className="shrink-0 text-warning" aria-hidden="true" />
              ) : (
                <CheckCircle2 size={14} className="shrink-0 text-success" aria-hidden="true" />
              )}
              {progress.running ? `${stageMeta?.label ?? "Working"}… ${progress.fileName}` : `${stageMeta?.label ?? "Done"} · ${progress.fileName || result?.model.fileName || ""}`}
            </p>
          )}

          <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
            The derived demo model stays available throughout: it is built from this project's geometry, so you can keep inspecting elements,
            quantities and coordination while the real import pipeline is a future integration.
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-4 py-3">
          <Button size="sm" variant="ghost" onClick={onCancel}>
            {result ? "Close" : "Cancel"}
          </Button>
          <Button size="sm" onClick={submit} disabled={progress.running} loading={progress.running}>
            <FileUp size={14} aria-hidden="true" /> {progress.running ? "Processing…" : "Import file"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-white px-2.5 py-1.5">
      <dt className="text-[10.5px] font-bold uppercase tracking-wide text-muted">{label}</dt>
      <dd className={`mt-0.5 truncate text-[12px] font-bold text-ink ${mono ? "font-mono text-[11px]" : ""}`} title={value}>
        {value}
      </dd>
    </div>
  );
}

function Stage({
  icon: Icon,
  label,
  detail,
  state,
}: {
  icon: typeof FileUp;
  label: string;
  detail: string;
  state: "idle" | "active" | "done" | "missing" | "failed";
}) {
  const tone =
    state === "done"
      ? "border-success/40 bg-success/10 text-success"
      : state === "active"
        ? "border-primary/40 bg-primary/10 text-primary"
        : state === "failed"
          ? "border-warning/40 bg-warning/10 text-warning"
          : "border-line bg-surface-2 text-faint";
  const tag = state === "done" ? "done here" : state === "active" ? "running" : state === "failed" ? "failed" : state === "missing" ? "not connected" : "pending";
  return (
    <li className="flex items-start gap-2.5 rounded-xl border border-line bg-white px-2.5 py-2">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${tone}`} aria-hidden="true">
        <Icon size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[12.5px] font-bold text-ink">{label}</span>
          <span className="text-[10.5px] font-bold uppercase tracking-wide text-muted">{tag}</span>
        </span>
        <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted">{detail}</span>
      </span>
    </li>
  );
}
