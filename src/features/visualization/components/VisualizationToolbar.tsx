import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Box, Camera, Compass, Info, Layers, Map, Maximize2, Minimize2, MoreHorizontal, Presentation, Search, Settings2, Share2, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { IconButton } from "../../../components/ui/IconButton";
import type { VisualizationProjectSummary } from "../services/visualization.service";
import type { BasemapId, ViewMode, WorkspaceMode } from "../types/visualization.types";
import { BasemapSelector } from "./BasemapSelector";
import { VisualizationProjectSwitcher } from "./VisualizationProjectSwitcher";

export type PanelId = "search" | "layers" | "inspector" | "settings" | "context" | "scene" | "storyboard" | "compare" | "views";

interface VisualizationToolbarProps {
  projects: VisualizationProjectSummary[];
  projectId: string | null;
  projectName: string;
  ready: boolean;
  mode: WorkspaceMode;
  onMode: (m: WorkspaceMode) => void;
  viewMode: ViewMode;
  onViewMode: (m: ViewMode) => void;
  basemap: BasemapId;
  onBasemap: (b: BasemapId) => void;
  openPanel: PanelId | null;
  onTogglePanel: (p: PanelId) => void;
  onCapture: () => void;
  capturing: boolean;
  onShare: () => void;
  fullscreen: boolean;
  fullscreenSupported: boolean;
  onToggleFullscreen: () => void;
  onSwitchProject: (id: string) => void;
  /** False while fullscreen: side panels are never docked, so their triggers always show. */
  panelsDocked: boolean;
}

const WORKSPACE_MODES: { id: WorkspaceMode; label: string; hint: string }[] = [
  { id: "explore", label: "Explore", hint: "Full workspace: layers, inspector, scene controls" },
  { id: "present", label: "Present", hint: "Minimal chrome for stakeholders" },
];

const VIEW_MODES: { id: ViewMode; label: string; short: string; icon: LucideIcon }[] = [
  { id: "2d", label: "2D Map", short: "2D", icon: Map },
  { id: "3d", label: "3D City", short: "3D", icon: Box },
];

/**
 * Workspace toolbar (the global AppHeader stays untouched).
 * Left: Back to Project + project name · Centre: Explore | Present · Right:
 * 2D | 3D, Capture, Share Preview, Settings — plus a "More" menu that holds
 * the secondary Explore tools (search, basemap, site context, fullscreen)
 * so the bar never crowds. The right cluster is content-sized; only the
 * project name shrinks.
 */
export function VisualizationToolbar({ projects, projectId, projectName, ready, mode, onMode, viewMode, onViewMode, basemap, onBasemap, openPanel, onTogglePanel, onCapture, capturing, onShare, fullscreen, fullscreenSupported, onToggleFullscreen, onSwitchProject, panelsDocked }: VisualizationToolbarProps) {
  const backTo = projectId ? `/app/projects/${projectId}` : "/app/projects";
  const tab = (active: boolean, disabled = false) => ["inline-flex h-8 items-center gap-1.5 rounded-[9px] px-2.5 text-[12.5px] font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20", disabled ? "opacity-50" : "", active ? "bg-white text-primary shadow-soft" : "text-muted hover:text-ink"].join(" ");
  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-white px-2 sm:px-3">
      {/* left (shrinks; the name truncates) */}
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <Link to={backTo} aria-label={projectId ? "Back to project" : "Back to projects"} title={projectId ? "Back to Project" : "Back to Projects"} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
          <ArrowLeft size={19} />
        </Link>
        <VisualizationProjectSwitcher projects={projects} currentId={projectId} currentName={projectName} subtitle="Visualization & Presentation" onSwitch={onSwitchProject} />
      </div>

      {/* centre: Explore | Present (self-centred in the free space; moves into the bottom bar below sm) */}
      <div role="tablist" aria-label="Workspace mode" className="mx-auto hidden shrink-0 items-center gap-0.5 rounded-xl border border-line bg-surface-2 p-0.5 sm:flex">
        {WORKSPACE_MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button key={m.id} type="button" role="tab" aria-selected={active} disabled={!ready} title={m.hint} onClick={() => onMode(m.id)} className={tab(active, !ready)}>
              {m.id === "present" && <Presentation size={14} aria-hidden="true" />}
              {m.label}
            </button>
          );
        })}
      </div>

      {/* right (content-sized) */}
      <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0 sm:gap-1.5">
        <div role="tablist" aria-label="View" className="flex shrink-0 items-center gap-0.5 rounded-xl border border-line bg-surface-2 p-0.5">
          {VIEW_MODES.map((v) => {
            const Icon = v.icon;
            const active = viewMode === v.id;
            return (
              <button key={v.id} type="button" role="tab" aria-selected={active} disabled={!ready} onClick={() => onViewMode(v.id)} title={v.label} aria-label={v.label} className={tab(active, !ready).replace("px-2.5", "px-2 sm:px-2.5")}>
                <Icon size={15} aria-hidden="true" />
                <span aria-hidden="true">{v.short}</span>
              </button>
            );
          })}
        </div>

        <button type="button" onClick={onCapture} disabled={!ready || capturing} aria-busy={capturing} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[12.5px] font-bold text-muted transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-40 sm:px-2.5" title="Capture View (local snapshot)" aria-label={capturing ? "Capturing view" : "Capture View"}>
          <Camera size={17} aria-hidden="true" />
          <span className="hidden xl:inline">Capture</span>
        </button>
        <button type="button" onClick={onShare} disabled={!ready} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[12.5px] font-bold text-muted transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-40 sm:px-2.5" title="Share Preview (demo)" aria-label="Share Preview">
          <Share2 size={17} aria-hidden="true" />
          <span className="hidden xl:inline">Share Preview</span>
        </button>
        <IconButton icon={Settings2} label={mode === "present" ? "Presentation settings" : "Scene settings"} size="sm" onClick={() => onTogglePanel("settings")} active={openPanel === "settings"} aria-expanded={openPanel === "settings"} disabled={!ready} className="disabled:opacity-40" />

        <MoreMenu disabled={!ready}>
          {mode === "explore" && (
            <>
              <MenuItem icon={Search} label="Search" shortcut="/" onClick={() => onTogglePanel("search")} />
              <MenuItem icon={Layers} label="Layers" onClick={() => onTogglePanel("layers")} className={panelsDocked ? "lg:hidden" : ""} />
              <MenuItem icon={SlidersHorizontal} label="Inspector" onClick={() => onTogglePanel("inspector")} className={panelsDocked ? "xl:hidden" : ""} />
              <MenuItem icon={Compass} label="Scene controls" onClick={() => onTogglePanel("scene")} className={panelsDocked ? "xl:hidden" : ""} />
              <MenuItem icon={Info} label="Site context" onClick={() => onTogglePanel("context")} />
              <div role="separator" className="my-1 border-t border-line" />
              <div className="px-2.5 py-1.5">
                <p className="mb-1 text-[10.5px] font-bold uppercase tracking-widest text-faint">Basemap</p>
                <BasemapSelector value={basemap} onChange={onBasemap} disabled={!ready} inline />
              </div>
            </>
          )}
          {mode === "present" && (
            <>
              <MenuItem icon={Presentation} label="Storyboard" onClick={() => onTogglePanel("storyboard")} className={panelsDocked ? "lg:hidden" : ""} />
              <MenuItem icon={Compass} label="Scene controls" onClick={() => onTogglePanel("scene")} />
            </>
          )}
          {fullscreenSupported && (
            <>
              <div role="separator" className="my-1 border-t border-line" />
              <MenuItem icon={fullscreen ? Minimize2 : Maximize2} label={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={onToggleFullscreen} />
            </>
          )}
        </MoreMenu>
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, label, shortcut, onClick, className = "" }: { icon: LucideIcon; label: string; shortcut?: string; onClick: () => void; className?: string }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-semibold text-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 ${className}`}>
      <Icon size={15} className="text-muted" aria-hidden="true" />
      <span className="flex-1">{label}</span>
      {shortcut && (
        <kbd className="rounded border border-line bg-surface-2 px-1 text-[10px] font-bold text-muted" aria-label={`Shortcut ${shortcut}`}>
          {shortcut}
        </kbd>
      )}
    </button>
  );
}

function MoreMenu({ disabled, children }: { disabled: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    ref.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);
  const moveFocus = (dir: 1 | -1) => {
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>("[role='menuitem'], [role='radio']") ?? []).filter((el) => el.offsetParent !== null);
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + dir + items.length) % items.length]?.focus();
  };
  return (
    <div ref={ref} className="relative shrink-0">
      <IconButton ref={triggerRef} icon={MoreHorizontal} label="More tools" size="sm" onClick={() => setOpen((o) => !o)} active={open} aria-haspopup="menu" aria-expanded={open} aria-controls={id} disabled={disabled} className="disabled:opacity-40" />
      {open && (
        <div
          id={id}
          role="menu"
          aria-label="More tools"
          className="absolute right-0 top-full z-30 mt-1 w-60 rounded-2xl border border-line bg-white p-1.5 shadow-float animate-pop motion-reduce:animate-none"
          onClick={(e) => {
            if ((e.target as Element).closest("[role='menuitem']")) setOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              moveFocus(1);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              moveFocus(-1);
            }
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
