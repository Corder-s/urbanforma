import { useEffect, useId, useRef, useState } from "react";
import { Bookmark, Box, Check, Copy, Map as MapIcon, MoreHorizontal, Pencil, Save, Trash2, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { CAMERA_PRESETS } from "../data/visualization.data";
import type { VisualizationState } from "../hooks/useVisualizationState";
import type { Camera2d } from "../hooks/useVisualizationState";
import type { PresentationView } from "../types/visualization.types";

interface SavedViewsProps {
  state: VisualizationState;
  camera2d: Camera2d;
  onNotice: (text: string) => void;
}

const inputCls = "h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-[12.5px] font-semibold text-ink placeholder:text-faint focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15";

function describe(v: PresentationView, scenarioName: (id: string | null) => string): string {
  const c = v.camera;
  const cam = c.kind === "preset" ? CAMERA_PRESETS.find((p) => p.id === c.preset)?.label ?? c.preset : c.kind === "2d" ? "Custom plan view" : "Custom 3D view";
  return `${v.viewMode === "3d" ? "3D" : "2D"} · ${scenarioName(v.scenarioId)} · ${cam}`;
}

/**
 * Saved views (local): "Save Current View" captures mode, view mode, camera,
 * scenario, layers and scene settings; each entry can be opened, renamed,
 * duplicated or deleted. The view manager is deliberately small.
 */
export function SavedViews({ state, camera2d, onNotice }: SavedViewsProps) {
  const { savedViews, captureView, applyView, activeView, scenarioOptions } = state;
  const id = useId();
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const scenarioName = (sid: string | null) => scenarioOptions.find((o) => (o.id ?? null) === sid)?.name ?? (sid ? sid : "Current Plan");

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
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

  const save = async () => {
    const view = captureView(name || defaultName(state), camera2d);
    if (!view) return;
    const saved = await savedViews.save(view);
    if (saved) {
      setName("");
      onNotice(`View "${saved.name}" saved`);
    }
  };

  return (
    <div>
      <form
        className="flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label htmlFor={`${id}-name`} className="sr-only">
          View name
        </label>
        <input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} placeholder={defaultName(state)} className={inputCls} disabled={savedViews.full} />
        <Button type="submit" size="sm" disabled={savedViews.full} className="shrink-0" title="Save Current View">
          <Save size={14} aria-hidden="true" /> <span className="hidden sm:inline">Save</span>
          <span className="sr-only sm:hidden">Save Current View</span>
        </Button>
      </form>
      <p className="mt-1 text-[11px] text-faint">{savedViews.full ? "Saved view limit reached — delete one to save another." : "Saves mode, camera, scenario, layers and scene settings (stored locally)."}</p>

      <ul className="mt-3 grid gap-1" aria-label="Saved views" aria-busy={savedViews.loading}>
        {savedViews.loading && savedViews.views.length === 0 && [0, 1, 2].map((i) => <li key={i} className="h-12 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" aria-hidden="true" />)}
        {!savedViews.loading && savedViews.views.length === 0 && (
          <li className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-[11.5px] text-muted">
            <Bookmark size={16} className="mx-auto mb-1 text-faint" aria-hidden="true" />
            No saved views yet.
          </li>
        )}
        {savedViews.views.map((v) => {
          const active = v.id === activeView;
          const isRenaming = renaming === v.id;
          const Icon = v.viewMode === "3d" ? Box : MapIcon;
          return (
            <li key={v.id} className={`relative rounded-lg border ${active ? "border-primary bg-primary/5" : "border-line bg-surface"}`}>
              {isRenaming ? (
                <form
                  className="flex items-center gap-1 p-1.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void savedViews.rename(v.id, draft).then(() => setRenaming(null));
                  }}
                >
                  <label htmlFor={`${id}-rename-${v.id}`} className="sr-only">
                    New name
                  </label>
                  <input id={`${id}-rename-${v.id}`} autoFocus value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 60))} className={inputCls} />
                  <button type="submit" aria-label="Save name" className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
                    <Check size={15} />
                  </button>
                  <button type="button" onClick={() => setRenaming(null)} aria-label="Cancel rename" className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
                    <X size={15} />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-1 pl-2.5 pr-1">
                  <button
                    type="button"
                    onClick={() => {
                      applyView(v, { keepMode: true });
                      onNotice(`Opened "${v.name}"`);
                    }}
                    aria-current={active ? "true" : undefined}
                    className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md py-2 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${active ? "bg-primary text-on-brand" : "bg-surface-2 text-muted"}`} aria-hidden="true">
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-bold text-ink">{v.name}</span>
                      <span className="block truncate text-[11px] text-muted">{describe(v, scenarioName)}</span>
                    </span>
                  </button>
                  <div ref={menu === v.id ? menuRef : undefined} className="relative shrink-0">
                    <button type="button" onClick={() => setMenu(menu === v.id ? null : v.id)} aria-haspopup="menu" aria-expanded={menu === v.id} aria-label={`Actions for ${v.name}`} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
                      <MoreHorizontal size={16} />
                    </button>
                    {menu === v.id && (
                      <div role="menu" aria-label={`${v.name} actions`} className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-line bg-surface p-1 shadow-float">
                        {[
                          {
                            label: "Open",
                            icon: Icon,
                            run: () => {
                              applyView(v, { keepMode: true });
                              onNotice(`Opened "${v.name}"`);
                            },
                          },
                          {
                            label: "Rename",
                            icon: Pencil,
                            run: () => {
                              setDraft(v.name);
                              setRenaming(v.id);
                            },
                          },
                          {
                            label: "Update with current view",
                            icon: Save,
                            run: () => {
                              const cur = captureView(v.name, camera2d, v.id);
                              if (cur) void savedViews.overwrite(v.id, cur).then(() => onNotice(`"${v.name}" updated`));
                            },
                          },
                          { label: "Duplicate", icon: Copy, run: () => void savedViews.duplicate(v.id).then((c) => c && onNotice(`Duplicated as "${c.name}"`)) },
                          { label: "Delete", icon: Trash2, run: () => void savedViews.remove(v.id).then(() => onNotice(`Deleted "${v.name}"`)), danger: true },
                        ].map((item) => {
                          const ItemIcon = item.icon;
                          return (
                            <button
                              key={item.label}
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setMenu(null);
                                item.run();
                              }}
                              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 ${item.danger ? "text-danger hover:bg-danger/5" : "text-ink hover:bg-surface-2"}`}
                            >
                              <ItemIcon size={14} aria-hidden="true" /> {item.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function defaultName(state: VisualizationState): string {
  const scenario = state.selectedScenarioOption?.name ?? "Master Plan";
  const preset = CAMERA_PRESETS.find((p) => p.id === state.lastPreset)?.label ?? "View";
  return `${scenario} ${preset}`.slice(0, 60);
}
