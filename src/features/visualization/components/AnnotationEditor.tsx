import { useEffect, useId, useState } from "react";
import { Compass, Plus, Ruler, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { ANNOTATION_KINDS, MAX_ANNOTATIONS } from "../data/presentation.data";
import type { VisualizationState } from "../hooks/useVisualizationState";
import type { Annotation, AnnotationKind } from "../types/visualization.types";
import { Switch } from "./controls";

interface AnnotationEditorProps {
  state: VisualizationState;
  /** Annotation currently selected on the map (highlighted, editable). */
  activeId: string | null;
  onActive: (id: string | null) => void;
}

const inputCls = "h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-[12.5px] font-semibold text-ink placeholder:text-faint focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15";

/**
 * Simple annotation editor (demo state): add a Title / Label / Callout /
 * Metric at the centre of the site, edit its text, nudge or drag it on the
 * map, delete it. North Arrow / Scale / Legend are toggles, not placed
 * objects. Everything is stored with the presentation.
 */
export function AnnotationEditor({ state, activeId, onActive }: AnnotationEditorProps) {
  const { annotations, presentation, settings, updateSettings, data, activeSlide, setActiveSlide } = state;
  const slideIndex = activeSlide ? presentation.slides.findIndex((s) => s.id === activeSlide) : -1;
  const slide = slideIndex >= 0 ? presentation.slides[slideIndex] : null;
  const id = useId();
  const [kind, setKind] = useState<AnnotationKind>("label");
  const [text, setText] = useState("");
  const [detail, setDetail] = useState("");
  const active = annotations.find((a) => a.id === activeId) ?? null;
  const full = annotations.length >= MAX_ANNOTATIONS;

  useEffect(() => {
    if (activeId && !annotations.some((a) => a.id === activeId)) onActive(null);
  }, [annotations, activeId, onActive]);

  const add = () => {
    if (!data || !text.trim()) return;
    const sb = data.siteBounds;
    // fan new annotations out around the centre so they never stack exactly
    const n = annotations.length;
    const position = { x: Math.round(sb.x + sb.width * (0.5 + ((n % 3) - 1) * 0.16)), y: Math.round(sb.y + sb.height * (0.5 + (Math.floor(n / 3) % 3 === 1 ? 0.18 : Math.floor(n / 3) % 3 === 2 ? -0.18 : 0))) };
    const a = presentation.addAnnotation({ kind, text: text.trim(), detail: detail.trim() || undefined, position });
    if (a) {
      setText("");
      setDetail("");
      onActive(a.id);
    }
  };

  const nudge = (a: Annotation, dx: number, dy: number) => presentation.updateAnnotation(a.id, { position: { x: a.position.x + dx, y: a.position.y + dy } });

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] leading-snug text-muted">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${slide ? "bg-primary" : "bg-faint"}`} aria-hidden="true" />
        {slide ? (
          <>
            <span className="min-w-0 truncate">
              Annotating slide <span className="font-bold text-ink">{slideIndex + 1} · {slide.title}</span>
            </span>
            <button type="button" onClick={() => setActiveSlide(null)} className="ml-auto shrink-0 rounded-md px-1.5 py-0.5 font-bold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20" title="Show the presentation's working annotations instead of this slide's">
              Working set
            </button>
          </>
        ) : (
          <span className="min-w-0">
            <span className="font-bold text-ink">Working set</span> · shown when no slide is open. Add slide copies what is on screen.
          </span>
        )}
      </div>
      <form
        className="grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <div role="radiogroup" aria-label="Annotation type" className="grid grid-cols-4 gap-1">
          {ANNOTATION_KINDS.map((k) => {
            const on = kind === k.id;
            return (
              <button key={k.id} type="button" role="radio" aria-checked={on} title={k.hint} onClick={() => setKind(k.id)} className={`h-8 rounded-lg border text-[11.5px] font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 ${on ? "border-primary bg-primary/10 text-primary" : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"}`}>
                {k.label}
              </button>
            );
          })}
        </div>
        <label htmlFor={`${id}-text`} className="sr-only">
          Annotation text
        </label>
        <input id={`${id}-text`} value={text} onChange={(e) => setText(e.target.value.slice(0, 80))} placeholder={kind === "metric" ? "Metric name, e.g. Green Coverage" : kind === "title" ? "Title, e.g. Riverside Smart District" : "Text, e.g. New Green Corridor"} className={inputCls} disabled={full} />
        {(kind === "callout" || kind === "metric") && (
          <>
            <label htmlFor={`${id}-detail`} className="sr-only">
              {kind === "metric" ? "Metric value" : "Callout detail"}
            </label>
            <input id={`${id}-detail`} value={detail} onChange={(e) => setDetail(e.target.value.slice(0, 120))} placeholder={kind === "metric" ? "Value, e.g. 31.4%" : "Detail (optional)"} className={inputCls} disabled={full} />
          </>
        )}
        <Button type="submit" size="sm" variant="secondary" disabled={full || !text.trim()} className="justify-center">
          <Plus size={14} aria-hidden="true" /> Add annotation
        </Button>
        {full && <p className="text-[11px] text-warning">Up to {MAX_ANNOTATIONS} annotations per presentation.</p>}
      </form>

      <ul className="mt-3 grid gap-1" aria-label="Annotations">
        {annotations.length === 0 && <li className="rounded-lg border border-dashed border-line px-3 py-3 text-center text-[11.5px] text-muted">No annotations yet. Add a label or callout above.</li>}
        {annotations.map((a) => {
          const on = a.id === activeId;
          return (
            <li key={a.id} className={`rounded-lg border ${on ? "border-primary bg-primary/5" : "border-line bg-surface"}`}>
              <div className="flex items-center gap-2 px-2.5 py-1.5">
                <button type="button" onClick={() => onActive(on ? null : a.id)} aria-expanded={on} aria-controls={`${id}-edit-${a.id}`} className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
                  <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">{a.kind}</span>
                  <span className="min-w-0 truncate text-[12.5px] font-semibold text-ink">
                    {a.text}
                    {a.detail && <span className="font-medium text-muted"> · {a.detail}</span>}
                  </span>
                </button>
                <button type="button" onClick={() => presentation.removeAnnotation(a.id)} aria-label={`Delete annotation ${a.text}`} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
                  <Trash2 size={14} />
                </button>
              </div>
              {on && active && (
                <div id={`${id}-edit-${a.id}`} className="grid gap-2 border-t border-line px-2.5 py-2">
                  <label htmlFor={`${id}-edit-text`} className="sr-only">
                    Edit text
                  </label>
                  <input id={`${id}-edit-text`} value={active.text} onChange={(e) => presentation.updateAnnotation(a.id, { text: e.target.value.slice(0, 80) })} className={inputCls} />
                  {(active.kind === "callout" || active.kind === "metric") && (
                    <>
                      <label htmlFor={`${id}-edit-detail`} className="sr-only">
                        Edit detail
                      </label>
                      <input id={`${id}-edit-detail`} value={active.detail ?? ""} onChange={(e) => presentation.updateAnnotation(a.id, { detail: e.target.value.slice(0, 120) || undefined })} placeholder="Detail" className={inputCls} />
                    </>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-muted">Drag on the map or nudge:</span>
                    <div role="group" aria-label="Move annotation" className="flex items-center gap-0.5">
                      {(
                        [
                          ["←", -20, 0, "left"],
                          ["↑", 0, -20, "up"],
                          ["↓", 0, 20, "down"],
                          ["→", 20, 0, "right"],
                        ] as const
                      ).map(([glyph, dx, dy, name]) => (
                        <button key={name} type="button" onClick={() => nudge(active, dx, dy)} aria-label={`Move ${name} 20 metres`} className="grid h-7 w-7 place-items-center rounded-md border border-line bg-surface text-[12px] font-bold text-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
                          {glyph}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 border-t border-line pt-1">
        <Switch id={`${id}-north`} label="North Arrow" hint="Minimal north indicator" checked={settings.northArrow} onChange={(v) => updateSettings({ northArrow: v })} />
        <Switch id={`${id}-scale`} label="Scale" hint="Scale bar in the plan view" checked={settings.scaleBar} onChange={(v) => updateSettings({ scaleBar: v })} />
        <p className="flex items-center gap-1.5 pb-1 text-[11px] text-faint">
          <Compass size={12} aria-hidden="true" /> <Ruler size={12} aria-hidden="true" /> Legend, north arrow and scale in Present mode follow the presentation settings.
        </p>
      </div>
    </div>
  );
}
