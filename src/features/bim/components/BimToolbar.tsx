import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Box, Building2, Check, ChevronDown, Layers3, Map, RefreshCw, UploadCloud } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { IconButton } from "../../../components/ui/IconButton";
import { VisualizationProjectSwitcher } from "../../visualization/components/VisualizationProjectSwitcher";
import { MODES, SCENE_MODES } from "../data/bim.data";
import type { BimProjectSummary } from "../services/bim.service";
import type { BimMode, BimSceneMode, BimViewMode } from "../types/bim.types";

interface BimToolbarProps {
  projects: BimProjectSummary[];
  projectId: string | null;
  projectName: string;
  ready: boolean;
  mode: BimMode;
  onMode: (mode: BimMode) => void;
  viewMode: BimViewMode;
  onViewMode: (mode: BimViewMode) => void;
  sceneMode: BimSceneMode;
  onSceneMode: (mode: BimSceneMode) => void;
  onImport: () => void;
  onSync: () => void;
  syncing: boolean;
  openIssues: number;
  treeOpen: boolean;
  onToggleTree: () => void;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  onSwitchProject: (id: string) => void;
}

const SCENE_ICON: Record<BimSceneMode, typeof Box> = { bim: Box, city: Building2, combined: Layers3 };

/**
 * BIM module toolbar (the global AppHeader is untouched).
 * Left: back + project · Centre: Overview / Model / Coordination / Issues ·
 * Right: scene mode, 2D/3D, import, re-derive, panel toggles.
 *
 * Below xl the mode tabs move to a strip under the toolbar; below lg the model
 * tree becomes a drawer button. Labels appear progressively so nothing
 * overlaps at 744 px (lg viewport minus the app sidebar).
 */
export function BimToolbar({
  projects,
  projectId,
  projectName,
  ready,
  mode,
  onMode,
  viewMode,
  onViewMode,
  sceneMode,
  onSceneMode,
  onImport,
  onSync,
  syncing,
  openIssues,
  treeOpen,
  onToggleTree,
  inspectorOpen,
  onToggleInspector,
  onSwitchProject,
}: BimToolbarProps) {
  const backTo = projectId ? `/app/projects/${projectId}` : "/app/projects";
  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-white px-2 sm:px-3">
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <Link
          to={backTo}
          aria-label={projectId ? "Back to project" : "Back to projects"}
          title={projectId ? "Back to Project" : "Back to Projects"}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
        >
          <ArrowLeft size={19} />
        </Link>
        <VisualizationProjectSwitcher projects={projects} currentId={projectId} currentName={projectName} subtitle="BIM Integration & Coordination" onSwitch={onSwitchProject} />
      </div>

      <div role="tablist" aria-label="BIM mode" className="mx-auto hidden shrink-0 items-center gap-0.5 rounded-xl border border-line bg-surface-2 p-0.5 xl:flex">
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={active}
              title={m.hint}
              onClick={() => onMode(m.id)}
              className={[
                "relative inline-flex h-8 items-center rounded-[9px] px-3 text-[12.5px] font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                active ? "bg-white text-primary shadow-soft" : "text-muted hover:text-ink",
              ].join(" ")}
            >
              {m.label}
              {m.id === "issues" && openIssues > 0 && (
                <span className="ml-1.5 rounded-full bg-warning/15 px-1.5 py-px text-[10.5px] font-extrabold text-warning tabular-nums">
                  {openIssues}
                  <span className="sr-only"> open issues</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex shrink-0 items-center justify-end gap-1 sm:gap-1.5 xl:ml-0">
        <SceneModeMenu mode={sceneMode} onSelect={onSceneMode} disabled={!ready} />

        <div role="tablist" aria-label="Viewport" className="hidden shrink-0 items-center gap-0.5 rounded-xl border border-line bg-surface-2 p-0.5 sm:flex">
          {(
            [
              { id: "2d", label: "2D plan", icon: Map },
              { id: "3d", label: "3D model", icon: Box },
            ] as const
          ).map((v) => {
            const Icon = v.icon;
            const active = viewMode === v.id;
            return (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={!ready}
                onClick={() => onViewMode(v.id)}
                title={v.label}
                className={[
                  "inline-flex h-8 items-center gap-1.5 rounded-[9px] px-2 text-[12.5px] font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-50 sm:px-2.5",
                  active ? "bg-white text-primary shadow-soft" : "text-muted hover:text-ink",
                ].join(" ")}
              >
                <Icon size={15} aria-hidden="true" />
                <span className="hidden 2xl:inline">{v.label}</span>
                <span className="sr-only 2xl:hidden">{v.label}</span>
              </button>
            );
          })}
        </div>

        <Button size="sm" variant="secondary" onClick={onSync} disabled={!ready || syncing} loading={syncing} className="shrink-0 px-2.5" title="Re-derive the model from the current project geometry">
          {!syncing && <RefreshCw size={15} aria-hidden="true" />}
          <span className="hidden xl:inline">Re-derive</span>
          <span className="sr-only xl:hidden">Re-derive model</span>
        </Button>

        <Button size="sm" onClick={onImport} className="shrink-0 px-3" title="Register an IFC / RVT / glTF file">
          <UploadCloud size={15} aria-hidden="true" />
          <span className="hidden xl:inline">Import model</span>
          <span className="xl:hidden">Import</span>
        </Button>

        <IconButton icon={Layers3} label="Model tree" size="sm" onClick={onToggleTree} active={treeOpen} aria-expanded={treeOpen} disabled={!ready} className="lg:hidden disabled:opacity-40" />
        <IconButton icon={Box} label="Properties inspector" size="sm" onClick={onToggleInspector} active={inspectorOpen} aria-expanded={inspectorOpen} disabled={!ready} className="xl:hidden disabled:opacity-40" />
      </div>
    </div>
  );
}

function SceneModeMenu({ mode, onSelect, disabled }: { mode: BimSceneMode; onSelect: (m: BimSceneMode) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();
  const Icon = SCENE_ICON[mode];
  const label = SCENE_MODES.find((m) => m.id === mode)?.label ?? "Scene";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    listRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`Scene content: ${label}`}
        title="What the viewport shows"
        className={[
          "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-40",
          open ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface-2 hover:text-primary",
        ].join(" ")}
      >
        <Icon size={16} aria-hidden="true" />
        <span className="hidden 2xl:inline">{label}</span>
        <ChevronDown size={14} className={`shrink-0 text-faint transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <ul
          ref={listRef}
          id={id}
          role="menu"
          aria-label="Scene mode"
          className="absolute right-0 top-full z-30 mt-1 w-72 max-w-[calc(100vw_-_1.5rem)] rounded-2xl border border-line bg-white p-1.5 shadow-float animate-pop motion-reduce:animate-none"
          onKeyDown={(e) => {
            const items = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
            const i = items.indexOf(document.activeElement as HTMLButtonElement);
            if (e.key === "ArrowDown") {
              e.preventDefault();
              items[(i + 1) % items.length]?.focus();
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              items[(i - 1 + items.length) % items.length]?.focus();
            }
          }}
        >
          <li className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-bold uppercase tracking-widest text-faint" role="presentation">
            Scene content
          </li>
          {SCENE_MODES.map((m) => {
            const ItemIcon = SCENE_ICON[m.id];
            const active = m.id === mode;
            return (
              <li key={m.id} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  title={m.hint}
                  onClick={() => {
                    onSelect(m.id);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={[
                    "flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                    active ? "bg-primary/10 text-primary" : "text-ink hover:bg-surface-2",
                  ].join(" ")}
                >
                  <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${active ? "bg-white text-primary shadow-soft" : "bg-surface-2 text-muted"}`} aria-hidden="true">
                    <ItemIcon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold">{m.label}</span>
                    <span className="block text-[11.5px] leading-snug text-muted">{m.hint}</span>
                  </span>
                  {active && <Check size={15} className="mt-1.5 shrink-0" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
