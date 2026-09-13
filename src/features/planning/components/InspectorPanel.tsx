import { useEffect, useState } from "react";
import { Copy, Info, MousePointerClick, Pencil, Trash2, X } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { FormSelect } from "../../../components/ui/FormSelect";
import { Input } from "../../../components/ui/Input";
import { LAND_USES, OBJECT_STATUSES, STATUS_TONE } from "../data/tools.data";
import { TYPE_LABEL } from "../lib/factory";
import { distance, formatArea, formatMetres, polygonArea, polylineLength } from "../lib/geometry";
import type { PlanningState } from "../hooks/usePlanningState";
import type { BuildingObject, LandUse, ObjectStatus, PlanningObject } from "../types/planning.types";

interface InspectorPanelProps {
  state: PlanningState;
  /** Present in drawer mode (tablet / mobile). */
  onClose?: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="border-b border-line px-4 py-3.5 last:border-b-0">
      <h3 className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-faint">{title}</h3>
      <div className="grid gap-y-2">{children}</div>
    </section>
  );
}

function Row({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-[12.5px] font-medium text-muted">{label}</span>
      <span className={`min-w-0 truncate text-right text-[13px] font-bold text-ink ${mono ? "tabular-nums" : ""}`}>{value}</span>
    </div>
  );
}

const fmt = (n: number) => n.toLocaleString("en-US");

// ---------------------------------------------------------------------------
// Building editor
// ---------------------------------------------------------------------------

function BuildingEditor({ b, state, editing }: { b: BuildingObject; state: PlanningState; editing: boolean }) {
  const p = b.properties;
  const [name, setName] = useState(b.name);
  const [floors, setFloors] = useState(String(p.floors));
  useEffect(() => {
    setName(b.name);
    setFloors(String(p.floors));
  }, [b.id, b.name, p.floors]);

  const commitName = () => {
    const v = name.trim();
    if (!v || v === b.name) {
      setName(b.name);
      return;
    }
    state.updateObject(b.id, (o) => ({ ...o, name: v }));
  };
  const commitFloors = () => {
    const n = Math.max(1, Math.min(120, Math.round(Number(floors))));
    if (!Number.isFinite(n) || n === p.floors) {
      setFloors(String(p.floors));
      return;
    }
    state.updateObject(b.id, (o) =>
      o.type === "building"
        ? { ...o, properties: { ...o.properties, floors: n, height: Math.round(n * 3.5), density: n <= 3 ? "Low" : n < 8 ? "Medium" : "High" } }
        : o
    );
  };
  const setUse = (v: LandUse) => state.updateObject(b.id, (o) => (o.type === "building" ? { ...o, properties: { ...o.properties, landUse: v } } : o));
  const setStatus = (v: ObjectStatus) => state.updateObject(b.id, (o) => (o.type === "building" ? { ...o, properties: { ...o.properties, status: v } } : o));

  return (
    <>
      <Section title="Identity">
        {editing ? (
          <Input
            id="insp-name"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="text-sm"
            maxLength={40}
          />
        ) : (
          <Row label="Name" value={b.name} />
        )}
        <Row label="Type" value="Building" />
      </Section>
      <Section title="Dimensions">
        <Row label="Footprint" value={`${fmt(p.footprint)} m²`} mono />
        <Row label="Height" value={`${fmt(p.height)} m`} mono />
        {editing ? (
          <Input
            id="insp-floors"
            label="Floors"
            inputMode="numeric"
            value={floors}
            onChange={(e) => setFloors(e.target.value)}
            onBlur={commitFloors}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            hint="Height updates at 3.5 m per floor."
            className="text-sm"
          />
        ) : (
          <Row label="Floors" value={p.floors} mono />
        )}
      </Section>
      <Section title="Planning">
        {editing ? (
          <>
            <FormSelect id="insp-use" label="Land Use" value={p.landUse} onChange={(v) => setUse(v as LandUse)} options={LAND_USES.map((u) => ({ value: u, label: u }))} />
            <FormSelect id="insp-status" label="Status" value={p.status} onChange={(v) => setStatus(v as ObjectStatus)} options={OBJECT_STATUSES.map((s) => ({ value: s, label: s }))} />
          </>
        ) : (
          <>
            <Row label="Land Use" value={p.landUse} />
            <Row label="Status" value={<Badge tone={STATUS_TONE[p.status]} dot>{p.status}</Badge>} />
          </>
        )}
        <Row label="Density" value={p.density} />
      </Section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Generic object view
// ---------------------------------------------------------------------------

function ObjectDetails({ o, state, editing }: { o: Exclude<PlanningObject, BuildingObject>; state: PlanningState; editing: boolean }) {
  const [text, setText] = useState(o.type === "label" ? o.properties.text : "");
  useEffect(() => {
    if (o.type === "label") setText(o.properties.text);
  }, [o]);

  const commitText = () => {
    if (o.type !== "label") return;
    const v = text.trim();
    if (!v || v === o.properties.text) {
      setText(o.properties.text);
      return;
    }
    state.updateObject(o.id, (x) => (x.type === "label" ? { ...x, properties: { text: v } } : x));
  };

  return (
    <>
      <Section title="Identity">
        <Row label="Name" value={o.name} />
        <Row label="Type" value={TYPE_LABEL[o.type]} />
      </Section>
      {(o.type === "road" || o.type === "path") && (
        <>
          <Section title="Dimensions">
            <Row label="Length" value={formatMetres(polylineLength(o.points))} mono />
            <Row label="Width" value={`${o.width} m`} mono />
            <Row label="Vertices" value={o.points.length} mono />
          </Section>
          <Section title="Planning">
            <Row label="Class" value={o.properties.roadClass} />
            {o.type === "road" && <Row label="Lanes" value={o.properties.lanes} mono />}
            <Row label="Status" value={<Badge tone={STATUS_TONE[o.properties.status]} dot>{o.properties.status}</Badge>} />
          </Section>
        </>
      )}
      {(o.type === "green" || o.type === "tree-zone" || o.type === "water" || o.type === "parking" || o.type === "public-space" || o.type === "parcel") && (
        <>
          <Section title="Dimensions">
            <Row label="Area" value={formatArea(polygonArea(o.points))} mono />
            <Row label="Vertices" value={o.points.length} mono />
          </Section>
          <Section title="Planning">
            <Row label="Category" value={o.properties.category} />
            <Row label="Status" value={<Badge tone={STATUS_TONE[o.properties.status]} dot>{o.properties.status}</Badge>} />
          </Section>
        </>
      )}
      {o.type === "label" && (
        <Section title="Content">
          {editing ? (
            <Input
              id="insp-label-text"
              label="Text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={commitText}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              maxLength={60}
              className="text-sm"
            />
          ) : (
            <Row label="Text" value={o.properties.text} />
          )}
        </Section>
      )}
      {o.type === "measure" && (
        <Section title="Measurement">
          <Row label="Distance" value={formatMetres(distance(o.points[0], o.points[1]))} mono />
          <Row label="From" value={`${Math.round(o.points[0].x)}, ${Math.round(o.points[0].y)}`} mono />
          <Row label="To" value={`${Math.round(o.points[1].x)}, ${Math.round(o.points[1].y)}`} mono />
        </Section>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Site information
// ---------------------------------------------------------------------------

function SiteInformation({ state }: { state: PlanningState }) {
  const info = state.siteInfo;
  const doc = state.doc;
  const buildings = state.objects.filter((o) => o.type === "building").length;
  return (
    <>
      <div className="border-b border-line px-4 py-3.5">
        <h2 className="text-[15px] font-extrabold text-ink">Site Information</h2>
        <p className="mt-0.5 text-[12.5px] text-muted">Headline metrics for the whole site.</p>
      </div>
      <Section title="Metrics">
        <Row label="Site Area" value={info ? `${info.siteAreaHa.toFixed(1)} ha` : "—"} mono />
        <Row label="Current Buildings" value={info ? fmt(info.buildings) : fmt(buildings)} mono />
        <Row label="Green Coverage" value={info ? `${info.greenCoveragePct.toFixed(1)}%` : "—"} mono />
        <Row label="Road Network" value={info ? `${info.roadNetworkKm.toFixed(1)} km` : "—"} mono />
        <Row label="Population Capacity" value={info ? fmt(info.populationCapacity) : "—"} mono />
        <Row label="Environmental Score" value={info ? `${info.environmentalScore} / 100` : "—"} mono />
      </Section>
      <Section title="GIS">
        <Row label="Site Boundary" value={<Badge tone="green" dot>{doc?.site.boundaryStatus ?? "Defined"}</Badge>} />
        <Row label="Coordinate System" value={doc?.site.coordinateSystem ?? "Demo / Local"} />
        <Row label="Objects on canvas" value={fmt(state.objects.length)} mono />
      </Section>
      <p className="flex items-start gap-2 px-4 py-3 text-[12px] leading-snug text-muted">
        <Info size={14} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
        Technical GIS values are demo values. Real surveys and coordinate systems arrive with the GIS module.
      </p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

/** Right-hand Properties panel: empty prompt, Site Information, or object details + actions. */
export function InspectorPanel({ state, onClose }: InspectorPanelProps) {
  const { selection, selectedObject } = state;
  const [editing, setEditing] = useState(false);
  useEffect(() => setEditing(false), [selection]);

  return (
    <aside aria-labelledby="inspector-title" className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
        <h2 id="inspector-title" className="text-[11px] font-bold uppercase tracking-widest text-faint">
          Properties
        </h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close properties"
            className="grid h-8 w-8 place-items-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          >
            <X size={17} />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {selection === null && (
          <div className="grid h-full min-h-[220px] place-items-center p-6 text-center">
            <div>
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-surface-2 text-muted">
                <MousePointerClick size={20} />
              </span>
              <p className="mt-3 text-sm font-bold text-ink">Select an element to view its properties.</p>
              <p className="mt-1 text-[12.5px] leading-snug text-muted">Click a building, road or area on the canvas — or the site boundary for site information.</p>
            </div>
          </div>
        )}

        {selection === "site" && <SiteInformation state={state} />}

        {selectedObject && (
          <div className="animate-fade-in motion-reduce:animate-none">
            <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary">{TYPE_LABEL[selectedObject.type]}</p>
                <h2 className="truncate text-[15px] font-extrabold text-ink">
                  {selectedObject.type === "building" ? `Building ${selectedObject.name}` : selectedObject.name}
                </h2>
              </div>
              {editing && (
                <Badge tone="blue" dot>
                  Editing
                </Badge>
              )}
            </div>

            {selectedObject.type === "building" ? (
              <BuildingEditor b={selectedObject} state={state} editing={editing} />
            ) : (
              <ObjectDetails o={selectedObject} state={state} editing={editing} />
            )}

            <div className="grid grid-cols-3 gap-2 border-t border-line p-3">
              <Button size="sm" variant={editing ? "primary" : "secondary"} onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
                <Pencil size={14} /> {editing ? "Done" : "Edit"}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => state.duplicateObject(selectedObject.id)}>
                <Copy size={14} /> Duplicate
              </Button>
              <Button size="sm" variant="secondary" className="text-danger hover:border-danger" onClick={() => state.deleteObject(selectedObject.id)}>
                <Trash2 size={14} /> Delete
              </Button>
            </div>
            <p className="px-4 pb-4 text-[11.5px] leading-snug text-faint">Local demo actions — changes are kept in this browser until you save.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
