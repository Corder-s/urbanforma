import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Play, Plus, RotateCcw } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { useDialogBehavior } from "../../../components/ui/useDialogBehavior";
import { ConfirmDialog } from "../../optimization/components/ConfirmDialog";
import { MAX_SLIDES } from "../data/presentation.data";
import type { Camera2d, VisualizationState } from "../hooks/useVisualizationState";
import type { PresentationSlide as Slide } from "../types/visualization.types";
import { PanelHeader } from "./controls";
import { PresentationSlide, type SlideActions } from "./PresentationSlide";

interface PresentationStoryboardProps {
  state: VisualizationState;
  camera2d: Camera2d;
  onClose?: () => void;
  onPlay: (fromSlideId?: string) => void;
  onNotice: (text: string) => void;
  /** Horizontal strip for the mobile bottom sheet. */
  horizontal?: boolean;
  idPrefix?: string;
  /** Inside the tabbed side panel: no own header row (tab is the heading). */
  embedded?: boolean;
}

const inputCls = "h-9 w-full rounded-lg border border-line bg-white px-2.5 text-[12.5px] font-semibold text-ink placeholder:text-faint focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15";

/**
 * Storyboard panel: the ordered slides of the presentation. Opening a slide
 * applies its view (camera, scenario, layers, settings) to the shared state;
 * "Add slide" captures the current view. Reorder via Move Up / Move Down.
 */
export function PresentationStoryboard({ state, camera2d, onClose, onPlay, onNotice, horizontal = false, idPrefix = "storyboard", embedded = false }: PresentationStoryboardProps) {
  const { presentation, activeSlide, setActiveSlide, applyView, captureView, annotations, scenarioOptions } = state;
  const { slides, viewOf } = presentation;
  const uid = useId();
  const [menu, setMenu] = useState<string | null>(null);
  const [editing, setEditing] = useState<Slide | null>(null);
  const [draft, setDraft] = useState({ title: "", description: "" });
  const [confirm, setConfirm] = useState<{ kind: "delete"; slide: Slide } | { kind: "reset" } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // The "Edit slide" dialog declared aria-modal="true" but had no Escape
  // handling and no focus trap — the only Escape listener here belongs to the
  // slide ⋯ menu and is registered solely while a menu is open.
  const editDialogRef = useDialogBehavior<HTMLFormElement>({ open: editing !== null, onClose: () => setEditing(null) });

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element;
      if (!t.closest("[role='menu']") && !t.closest("[aria-haspopup='menu']")) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setMenu(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [menu]);

  const open = useCallback(
    (slide: Slide) => {
      const v = viewOf(slide);
      if (!v) return;
      applyView({ ...v, annotations: slide.annotations }, { keepMode: true });
      setActiveSlide(slide.id); // the slide's annotations are shown while it is open
    },
    [viewOf, applyView, setActiveSlide]
  );

  const actions: SlideActions = {
    open,
    edit: (slide) => {
      setDraft({ title: slide.title, description: slide.description });
      setEditing(slide);
    },
    duplicate: (slide) => {
      const copy = presentation.duplicateSlide(slide.id);
      if (copy) onNotice(`Duplicated "${slide.title}"`);
    },
    remove: (slide) => setConfirm({ kind: "delete", slide }),
    move: (slide, dir) => {
      presentation.moveSlide(slide.id, dir);
      onNotice(`Moved "${slide.title}" ${dir < 0 ? "up" : "down"}`);
      // keep focus on the moved card's menu button
      window.requestAnimationFrame(() => listRef.current?.querySelector<HTMLButtonElement>(`[data-slide-id="${slide.id}"] [aria-haspopup="menu"]`)?.focus());
    },
    recapture: (slide) => {
      const view = captureView(slide.title, camera2d);
      if (!view) return;
      presentation.recaptureSlide(slide.id, view, annotations);
      onNotice(`Slide "${slide.title}" updated from the current view`);
    },
  };

  const add = () => {
    const n = slides.length + 1;
    const view = captureView(`Slide ${n}`, camera2d);
    if (!view) return;
    const scenarioName = state.selectedScenarioOption?.name ?? "Current Plan";
    const slide = presentation.addSlide(view, `${scenarioName} view`, "", annotations);
    if (slide) {
      setActiveSlide(slide.id);
      onNotice(`Slide ${n} added from the current view`);
      window.requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-slide-id="${slide.id}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" }));
    }
  };

  const optionFor = (id: string | null) => scenarioOptions.find((o) => (o.id ?? null) === id) ?? scenarioOptions.find((o) => o.id === null) ?? null;
  const p = presentation.presentation;
  const full = presentation.full;

  const resetButton = (
    <button type="button" onClick={() => setConfirm({ kind: "reset" })} aria-label="Reset storyboard to the demo slides" title="Reset to demo slides" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
      <RotateCcw size={15} />
    </button>
  );
  const header = embedded ? (
    <h2 id={`${idPrefix}-title-${uid}`} className="sr-only">
      Storyboard
    </h2>
  ) : (
    <PanelHeader id={`${idPrefix}-title-${uid}`} title="Presentation" onClose={onClose} closeLabel="Close presentation panel">
      <span className="mr-1 text-[11px] font-bold tabular-nums text-muted" aria-live="polite">
        {slides.length} / {MAX_SLIDES}
      </span>
      {resetButton}
    </PanelHeader>
  );

  const list = (
    <ul ref={listRef} aria-labelledby={`${idPrefix}-title-${uid}`} className={horizontal ? "flex snap-x gap-2 overflow-x-auto px-3 pb-2 pt-1" : "grid gap-2 px-3 py-3"}>
      {slides.map((s, i) => (
        <PresentationSlide key={s.id} slide={s} view={viewOf(s)} index={i} total={slides.length} active={activeSlide === s.id} option={optionFor(s.scenarioId)} actions={actions} menuOpen={menu === s.id} onMenu={(o) => setMenu(o ? s.id : null)} horizontal={horizontal} full={full} />
      ))}
      {slides.length === 0 && <li className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-[12px] text-muted">No slides yet. Add the current view as the first slide.</li>}
    </ul>
  );

  const footer = (
    <div className={`flex shrink-0 items-center gap-2 border-t border-line bg-white px-3 py-2 ${horizontal ? "" : ""}`}>
      <Button size="sm" variant="secondary" onClick={add} disabled={full} className="flex-1 justify-center" title={full ? `Up to ${MAX_SLIDES} slides` : "Add the current view as a slide"}>
        <Plus size={14} aria-hidden="true" /> Add slide
      </Button>
      <Button size="sm" onClick={() => onPlay(activeSlide ?? undefined)} disabled={slides.length === 0} className="flex-1 justify-center">
        <Play size={14} aria-hidden="true" /> Present
      </Button>
    </div>
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-white">
      {header}
      {p && (
        <div className="shrink-0 border-b border-line px-3 py-2">
          <div className="flex items-center gap-1">
            <label htmlFor={`${idPrefix}-ptitle-${uid}`} className="sr-only">
              Presentation title
            </label>
            <input id={`${idPrefix}-ptitle-${uid}`} value={p.title} onChange={(e) => presentation.setTitle(e.target.value)} placeholder="Presentation title" className="h-8 w-full min-w-0 rounded-md border border-transparent bg-transparent px-1.5 text-[13.5px] font-extrabold text-ink hover:border-line focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" />
            {embedded && (
              <>
                <span className="shrink-0 text-[11px] font-bold tabular-nums text-muted" aria-label={`${slides.length} of ${MAX_SLIDES} slides`}>
                  {slides.length}/{MAX_SLIDES}
                </span>
                {resetButton}
              </>
            )}
          </div>
          <label htmlFor={`${idPrefix}-psub-${uid}`} className="sr-only">
            Presentation subtitle
          </label>
          <input id={`${idPrefix}-psub-${uid}`} value={p.subtitle} onChange={(e) => presentation.setSubtitle(e.target.value)} placeholder="Subtitle (optional)" className="h-7 w-full rounded-md border border-transparent bg-transparent px-1.5 text-[12px] font-semibold text-muted hover:border-line focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" />
        </div>
      )}
      <div className={horizontal ? "min-h-0 shrink-0" : "min-h-0 flex-1 overflow-y-auto"}>{list}</div>
      {footer}
      <p className="sr-only" aria-live="polite">
        {presentation.saveState === "saving" ? "Saving presentation" : presentation.saveState === "saved" ? "Presentation saved locally" : presentation.saveState === "error" ? "Presentation could not be saved" : ""}
      </p>

      {editing && (
        <div className="absolute inset-0 z-30 flex items-end bg-ink/30 p-3 sm:items-center" role="presentation">
          <form
            ref={editDialogRef}
            role="dialog"
            aria-modal="true"
            data-inner=""
            aria-labelledby={`${idPrefix}-edit-title-${uid}`}
            className="w-full rounded-2xl border border-line bg-white p-4 shadow-float"
            onSubmit={(e) => {
              e.preventDefault();
              presentation.updateSlide(editing.id, draft);
              setEditing(null);
              onNotice("Slide updated");
            }}
          >
            <h3 id={`${idPrefix}-edit-title-${uid}`} className="text-[14px] font-bold text-ink">
              Edit slide
            </h3>
            <label htmlFor={`${idPrefix}-edit-t-${uid}`} className="mt-3 block text-[11.5px] font-bold text-muted">
              Title
            </label>
            <input id={`${idPrefix}-edit-t-${uid}`} autoFocus value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value.slice(0, 80) }))} className={`${inputCls} mt-1`} />
            <label htmlFor={`${idPrefix}-edit-d-${uid}`} className="mt-3 block text-[11.5px] font-bold text-muted">
              Description
            </label>
            <textarea id={`${idPrefix}-edit-d-${uid}`} value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value.slice(0, 280) }))} rows={3} className="mt-1 w-full resize-none rounded-lg border border-line bg-white px-2.5 py-2 text-[12.5px] font-medium text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" />
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save
              </Button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.kind === "reset" ? "Reset storyboard?" : "Delete slide?"}
        description={confirm?.kind === "reset" ? "The demo slides, title and annotations replace your current storyboard. Saved views are not affected." : confirm?.kind === "delete" ? `"${confirm.slide.title}" is removed from the presentation. This cannot be undone.` : ""}
        confirmLabel={confirm?.kind === "reset" ? "Reset" : "Delete"}
        tone="danger"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.kind === "delete") {
            presentation.deleteSlide(confirm.slide.id);
            if (activeSlide === confirm.slide.id) setActiveSlide(null);
            onNotice(`Deleted "${confirm.slide.title}"`);
          } else if (confirm?.kind === "reset") {
            presentation.resetToDemo();
            setActiveSlide(null);
            onNotice("Storyboard reset to the demo slides");
          }
          setConfirm(null);
        }}
      />
    </div>
  );
}
