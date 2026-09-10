import { Link } from "react-router-dom";
import { ArrowLeft, Box, Check, Eye, Layers, Map, Redo2, Save, Settings2, SlidersHorizontal, Undo2, Wrench, type LucideIcon } from "lucide-react";
import { IconButton } from "../../../components/ui/IconButton";
import type { PlanningState, SaveState } from "../hooks/usePlanningState";
import type { PlanningProjectSummary } from "../services/planning.service";
import type { StudioMode } from "../types/planning.types";
import { ProjectSwitcher } from "./ProjectSwitcher";

interface StudioToolbarProps {
  state: PlanningState;
  projects: PlanningProjectSummary[];
  projectId: string | null;
  projectName: string;
  onSwitchProject: (id: string) => void;
  onPreview: () => void;
  onToggleSettings: () => void;
  settingsOpen: boolean;
  onOpenTools: () => void;
  onOpenInspector: () => void;
  onToggleContext: () => void;
  contextOpen: boolean;
  inspectorOpen: boolean;
}

const MODES: { id: StudioMode; label: string; icon: LucideIcon; placeholder?: boolean }[] = [
  { id: "plan", label: "Plan", icon: Map },
  { id: "context", label: "Context", icon: Layers, placeholder: true },
  { id: "3d", label: "3D Preview", icon: Box, placeholder: true },
];

function SaveStatus({ saveState, savedAtIso }: { saveState: SaveState; savedAtIso: string | null }) {
  if (saveState === "saving") return <span className="text-muted">Saving…</span>;
  if (saveState === "saved") return <span className="inline-flex items-center gap-1 text-success"><Check size={13} aria-hidden="true" /> Saved just now</span>;
  if (saveState === "dirty") return <span className="inline-flex items-center gap-1 text-warning"><span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" /> Unsaved changes</span>;
  if (saveState === "error") return <span className="text-danger">Save failed</span>;
  if (savedAtIso) return <span className="text-muted">Saved {new Date(savedAtIso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>;
  return <span className="text-muted">Demo plan · not saved</span>;
}

/**
 * Studio-specific toolbar (the global AppHeader stays untouched).
 * Left: back + project switcher · Centre: mode selector · Right: history,
 * save, preview, settings and — below lg — drawer triggers.
 */
export function StudioToolbar({
  state,
  projects,
  projectId,
  projectName,
  onSwitchProject,
  onPreview,
  onToggleSettings,
  settingsOpen,
  onOpenTools,
  onOpenInspector,
  onToggleContext,
  contextOpen,
  inspectorOpen,
}: StudioToolbarProps) {
  const ready = state.load.status === "ready";
  const backTo = projectId ? `/app/projects/${projectId}` : "/app/projects";

  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-white px-2 sm:px-3">
      {/* left */}
      <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
        <Link
          to={backTo}
          aria-label={projectId ? "Back to project" : "Back to projects"}
          title={projectId ? "Back to Project" : "Back to Projects"}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
        >
          <ArrowLeft size={19} />
        </Link>
        <ProjectSwitcher projects={projects} currentId={projectId} currentName={projectName} onSwitch={onSwitchProject} dirty={state.saveState === "dirty"} />
      </div>

      {/* centre: mode selector */}
      <div role="tablist" aria-label="Studio mode" className="hidden shrink-0 items-center gap-0.5 rounded-xl border border-line bg-surface-2 p-0.5 md:flex">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = state.mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => state.setMode(m.id)}
              title={m.placeholder ? `${m.label} — placeholder mode` : m.label}
              className={[
                "inline-flex h-8 items-center gap-1.5 rounded-[9px] px-3 text-[12.5px] font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                active ? "bg-white text-primary shadow-soft" : "text-muted hover:text-ink",
              ].join(" ")}
            >
              <Icon size={15} aria-hidden="true" />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* right */}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5 sm:gap-1">
        <span className="mr-1 hidden max-w-[160px] truncate text-[12px] font-semibold lg:block" role="status" aria-live="polite">
          <SaveStatus saveState={state.saveState} savedAtIso={state.savedAtIso} />
        </span>
        <IconButton icon={Undo2} label="Undo (Ctrl+Z)" size="sm" onClick={state.undo} disabled={!ready || !state.canUndo} className="disabled:opacity-40" />
        <IconButton icon={Redo2} label="Redo (Ctrl+Shift+Z)" size="sm" onClick={state.redo} disabled={!ready || !state.canRedo} className="disabled:opacity-40" />
        <button
          type="button"
          onClick={() => void state.save()}
          disabled={!ready || state.saveState === "saving"}
          aria-label="Save plan (Ctrl+S)"
          title="Save plan (Ctrl+S)"
          className={[
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60",
            state.saveState === "dirty" ? "bg-primary text-white shadow-glow hover:bg-primary-dark" : "text-muted hover:bg-surface-2 hover:text-primary",
          ].join(" ")}
        >
          <Save size={17} aria-hidden="true" />
          <span className="hidden sm:inline">{state.saveState === "saving" ? "Saving…" : "Save"}</span>
        </button>
        <IconButton icon={Eye} label="Preview" size="sm" onClick={onPreview} disabled={!ready} className="hidden sm:grid disabled:opacity-40" />
        <IconButton icon={Settings2} label="Studio settings" size="sm" onClick={onToggleSettings} active={settingsOpen} aria-expanded={settingsOpen} disabled={!ready} className="hidden sm:grid disabled:opacity-40" />

        {/* below lg: panel triggers */}
        <span className="mx-0.5 hidden h-6 w-px bg-line md:block xl:hidden" aria-hidden="true" />
        <IconButton icon={Wrench} label="Tools" size="sm" onClick={onOpenTools} disabled={!ready} className="lg:hidden disabled:opacity-40" />
        <IconButton icon={Layers} label="Context layers" size="sm" onClick={onToggleContext} active={contextOpen} aria-expanded={contextOpen} disabled={!ready} className="hidden sm:grid xl:hidden disabled:opacity-40" />
        <IconButton icon={SlidersHorizontal} label="Properties" size="sm" onClick={onOpenInspector} active={inspectorOpen} aria-expanded={inspectorOpen} disabled={!ready} className="xl:hidden disabled:opacity-40" />
      </div>
    </div>
  );
}
