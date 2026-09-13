import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Boxes,
  Check,
  Copy,
  Crosshair,
  Flag,
  FolderTree,
  MousePointerClick,
  Ruler,
  X,
} from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { IconButton } from "../../../components/ui/IconButton";
import { CATEGORY_ICON, DISCIPLINE_LABEL, SEVERITY_META, formatArea, formatBytes, formatMetres, formatVolumeM3 } from "../data/bim.data";
import type { BimIndex } from "../lib/bimModel";
import type { BimElement, BimIssue, BimModel, BimProperty } from "../types/bim.types";

interface PropertiesInspectorProps {
  element: BimElement | null;
  index: BimIndex | null;
  model: BimModel | null;
  projectId: string | null;
  issues: BimIssue[];
  onSelect: (id: string, opts?: { focus?: boolean }) => void;
  onFocus: (id: string) => void;
  onNewIssue: (element: BimElement) => void;
  onOpenIssue: (issueId: string) => void;
  idPrefix: string;
  onClose?: () => void;
}

interface Quantity {
  label: string;
  value: string;
}

function quantitiesOf(el: BimElement): Quantity[] {
  const out: Quantity[] = [];
  if (el.area !== undefined) out.push({ label: "Area", value: formatArea(el.area) });
  if (el.volume !== undefined) out.push({ label: "Volume", value: formatVolumeM3(el.volume) });
  if (el.height !== undefined) out.push({ label: "Height", value: formatMetres(el.height) });
  if (el.width !== undefined) out.push({ label: "Width", value: formatMetres(el.width) });
  if (el.length !== undefined) out.push({ label: "Length", value: formatMetres(el.length) });
  if (el.floors !== undefined) out.push({ label: "Storeys", value: String(el.floors) });
  if (el.location) out.push({ label: "Position", value: `${el.location.x.toFixed(1)}, ${el.location.y.toFixed(1)}, ${el.location.z.toFixed(1)} m` });
  return out;
}

/**
 * Properties inspector — everything known about the selected element:
 * identity, quantities, property sets, its planning reference, its place in the
 * tree and the issues that mention it. Read-only by design (the model is
 * derived); the actions are navigation, focus and reporting an issue.
 */
export function PropertiesInspector({ element, index, model, projectId, issues, onSelect, onFocus, onNewIssue, onOpenIssue, idPrefix, onClose }: PropertiesInspectorProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = useCallback((value: string, key: string) => {
    if (!navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(value).then(
      () => {
        setCopied(key);
        window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
      },
      () => setCopied(null)
    );
  }, []);

  const groups = useMemo(() => {
    if (!element) return [];
    const map = new Map<string, BimProperty[]>();
    for (const p of element.properties) {
      const list = map.get(p.group);
      if (list) list.push(p);
      else map.set(p.group, [p]);
    }
    return [...map.entries()];
  }, [element]);

  const children = useMemo(() => (element && index ? (index.childrenOf.get(element.id) ?? []) : []), [element, index]);
  const parent = element?.parentId && index ? (index.byId.get(element.parentId) ?? null) : null;
  const relatedIssues = useMemo(
    () => (element ? issues.filter((i) => i.elementIds.includes(element.id)) : []),
    [element, issues]
  );

  if (!element) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-white">
        <InspectorHeader title="Properties" onClose={onClose} />
        <div className="grid flex-1 place-items-center p-6 text-center">
          <div>
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-surface-2 text-muted" aria-hidden="true">
              <MousePointerClick size={19} />
            </span>
            <p className="mt-3 text-[13px] font-bold text-ink">No element selected</p>
            <p className="mx-auto mt-1 max-w-[30ch] text-[12px] leading-relaxed text-muted">
              Pick an element in the model tree, or click a building in the viewport, to inspect its properties and quantities.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const Icon = CATEGORY_ICON[element.category];
  const quantities = quantitiesOf(element);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <InspectorHeader title="Properties" onClose={onClose} />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* identity */}
        <div className="border-b border-line px-3 py-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
              <Icon size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[14px] font-extrabold leading-tight text-ink" title={element.name}>
                {element.name}
              </h3>
              <p className="mt-0.5 truncate text-[11.5px] text-muted">
                {element.category} · {DISCIPLINE_LABEL[element.discipline]}
                {element.level ? ` · ${element.level}` : ""}
              </p>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone="neutral">{element.kind === "model" ? "Model root" : element.kind === "group" ? "Group" : element.kind === "building" ? "Building" : "Element"}</Badge>
            {element.material && <Badge tone="blue">{element.material}</Badge>}
            <Badge tone={element.visible ? "green" : "amber"} dot>
              {element.visible ? "Visible" : "Hidden by layers"}
            </Badge>
            {model && <Badge tone="neutral">{model.format} · {model.schema}</Badge>}
          </div>

          <dl className="mt-2.5 grid gap-1 text-[11.5px]">
            <div className="flex items-center gap-1.5">
              <dt className="shrink-0 font-semibold text-muted">Element id</dt>
              <dd className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink" title={element.id}>
                {element.id}
              </dd>
              <CopyButton label="Copy element id" value={element.id} copied={copied === "id"} onCopy={(v) => copy(v, "id")} />
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="shrink-0 font-semibold text-muted">GlobalId</dt>
              <dd className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink" title={element.globalId}>
                {element.globalId}
              </dd>
              <CopyButton label="Copy GlobalId" value={element.globalId} copied={copied === "global"} onCopy={(v) => copy(v, "global")} />
            </div>
          </dl>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {element.planningRef && (
              <Button size="sm" variant="secondary" className="px-2.5" onClick={() => onFocus(element.id)} title="Centre the viewport on this element">
                <Crosshair size={14} aria-hidden="true" /> Focus
              </Button>
            )}
            {parent && (
              <Button size="sm" variant="ghost" className="px-2.5" onClick={() => onSelect(parent.id)}>
                <FolderTree size={14} aria-hidden="true" /> {parent.name}
              </Button>
            )}
            <Button size="sm" variant="ghost" className="px-2.5" onClick={() => onNewIssue(element)}>
              <Flag size={14} aria-hidden="true" /> Report issue
            </Button>
          </div>
        </div>

        {/* quantities */}
        {quantities.length > 0 && (
          <Section title="Quantities" icon={Ruler} id={`${idPrefix}-quantities`}>
            <dl className="grid grid-cols-2 gap-1.5">
              {quantities.map((q) => (
                <div key={q.label} className="rounded-lg border border-line bg-surface-2 px-2 py-1.5">
                  <dt className="text-[10.5px] font-bold uppercase tracking-wide text-muted">{q.label}</dt>
                  <dd className="mt-0.5 truncate text-[12.5px] font-extrabold text-ink tabular-nums" title={q.value}>
                    {q.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        )}

        {/* property sets */}
        {groups.map(([group, props]) => (
          <Section key={group} title={group} icon={Boxes} id={`${idPrefix}-${group.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
            <dl className="grid gap-px overflow-hidden rounded-lg border border-line bg-line">
              {props.map((p) => (
                <div key={p.id} className="flex items-baseline gap-2 bg-white px-2.5 py-1.5">
                  <dt className="w-[42%] shrink-0 text-[11.5px] font-semibold text-muted">{p.label}</dt>
                  <dd className="min-w-0 flex-1 text-right text-[12px] font-bold text-ink">
                    {p.value}
                    {p.unit && <span className="ml-1 text-[11px] font-semibold text-muted">{p.unit}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        ))}

        {/* planning mapping */}
        {element.planningRef && (
          <Section title="Planning reference" icon={FolderTree} id={`${idPrefix}-planning`}>
            <dl className="grid gap-px overflow-hidden rounded-lg border border-line bg-line">
              <Row label="Object id" value={element.planningRef.objectId} mono />
              <Row label="Object name" value={element.planningRef.objectName} />
              <Row label="Object type" value={element.planningRef.objectType} />
              <Row label="GIS layer" value={element.planningRef.layer} />
            </dl>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              The element points at the Planning Studio object — quantities are never copied, so a change in the plan is reflected here.
            </p>
            {projectId && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <ModuleLink to={`/app/planning?projectId=${projectId}`} label="Planning Studio" />
                <ModuleLink to={`/app/visualization?projectId=${projectId}`} label="Visualization" />
                <ModuleLink to={`/app/analysis?projectId=${projectId}`} label="Analysis" />
              </div>
            )}
          </Section>
        )}

        {/* children */}
        {children.length > 0 && (
          <Section title={`Contains · ${children.length}`} icon={FolderTree} id={`${idPrefix}-children`}>
            <ul className="grid gap-0.5">
              {children.slice(0, 40).map((c) => {
                const CIcon = CATEGORY_ICON[c.category];
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(c.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/20"
                    >
                      <CIcon size={13} className="shrink-0 text-faint" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink">{c.name}</span>
                      <span className="shrink-0 text-[11px] text-muted">{c.category}</span>
                    </button>
                  </li>
                );
              })}
              {children.length > 40 && <li className="px-2 py-1 text-[11.5px] text-muted">+ {children.length - 40} more in the tree</li>}
            </ul>
          </Section>
        )}

        {/* issues */}
        <Section title={`Issues · ${relatedIssues.length}`} icon={Flag} id={`${idPrefix}-issues`}>
          {relatedIssues.length === 0 ? (
            <p className="text-[11.5px] leading-relaxed text-muted">No coordination issue mentions this element.</p>
          ) : (
            <ul className="grid gap-1">
              {relatedIssues.map((issue) => (
                <li key={issue.id}>
                  <button
                    type="button"
                    onClick={() => onOpenIssue(issue.id)}
                    className="flex w-full items-start gap-2 rounded-lg border border-line px-2 py-1.5 text-left transition-colors hover:border-primary hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/20"
                  >
                    <Badge tone={SEVERITY_META[issue.severity].tone} className="mt-px shrink-0">
                      {SEVERITY_META[issue.severity].label}
                    </Badge>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-bold text-ink">{issue.title}</span>
                      <span className="block truncate text-[11px] text-muted">{issue.location}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* model record */}
        {model && (
          <Section title="Model record" icon={Boxes} id={`${idPrefix}-model`}>
            <dl className="grid gap-px overflow-hidden rounded-lg border border-line bg-line">
              <Row label="Model" value={model.name} />
              <Row label="File" value={model.fileName} mono />
              <Row label="Version" value={`${model.version} (${model.versions.length} revisions)`} />
              <Row label="Size" value={formatBytes(model.sizeBytes)} />
              <Row label="Author" value={model.author} />
              <Row label="Source" value={model.source === "demo" ? "Derived from project geometry (demo)" : model.source === "upload" ? "Local upload (not processed)" : "Local record"} />
            </dl>
          </Section>
        )}
      </div>
    </div>
  );
}

function InspectorHeader({ title, onClose }: { title: string; onClose?: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 border-b border-line px-2.5 py-2">
      <h2 className="min-w-0 flex-1 truncate text-[12.5px] font-extrabold uppercase tracking-wide text-ink">{title}</h2>
      {onClose && <IconButton icon={X} label="Close inspector" size="xs" onClick={onClose} />}
    </div>
  );
}

function Section({ title, icon: Icon, id, children }: { title: string; icon: typeof Boxes; id: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-b border-line px-3 py-2.5">
      <h3 id={id} className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-widest text-faint">
        <Icon size={12} aria-hidden="true" /> {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2 bg-white px-2.5 py-1.5">
      <dt className="w-[38%] shrink-0 text-[11.5px] font-semibold text-muted">{label}</dt>
      <dd className={`min-w-0 flex-1 truncate text-right text-[12px] font-bold text-ink ${mono ? "font-mono text-[11px]" : ""}`} title={value}>
        {value}
      </dd>
    </div>
  );
}

function ModuleLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[11.5px] font-bold text-muted transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
    >
      {label}
    </Link>
  );
}

function CopyButton({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: (value: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onCopy(value)}
      aria-label={copied ? "Copied" : label}
      title={label}
      className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
    >
      {copied ? <Check size={13} className="text-success" aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
    </button>
  );
}
