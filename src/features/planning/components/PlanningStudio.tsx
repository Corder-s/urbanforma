import { useUnitPreferences } from "../../settings/hooks/useUnitPreferences";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getPlanningProjects, type PlanningProjectSummary } from "../services/planning.service";
import { usePlanningState } from "../hooks/usePlanningState";
import { useCanvasView } from "../hooks/useCanvasView";
import { TOOLS } from "../data/tools.data";
import { StudioToolbar } from "./StudioToolbar";
import { PlanningToolPanel } from "./PlanningToolPanel";
import { PlanningCanvas } from "./PlanningCanvas";
import { InspectorPanel } from "./InspectorPanel";
import { ContextPanel } from "./ContextPanel";
import { StatusBar } from "./StatusBar";
import { PanelDrawer } from "../../../components/ui/PanelDrawer";
import { StudioSettings } from "./StudioSettings";
import { ModePlaceholder } from "./ModePlaceholder";
import { CanvasLoading, NoProjectSelected, ProjectNotFound, StudioError, StudioLoading } from "./StudioStates";

/**
 * Planning Studio workspace.
 *
 *   ┌──────────────────────── toolbar ────────────────────────┐
 *   │ tools │            canvas             │ inspector       │
 *   │ (lg+) │                               │ (xl+)           │
 *   │       │                               │ context (lg+)   │
 *   ├──────────────────────── status bar ─────────────────────┤
 *
 * Below the breakpoints the side panels become drawers scoped to this box.
 * The workspace fills the AppShell's <main> exactly (h-full), so the page
 * never scrolls — only the panels' own lists do.
 */
export function PlanningStudio() {
  // Subscribe to the workspace unit preference so every formatted measurement
  // in this module re-renders when the user switches systems (Settings → Units).
  useUnitPreferences();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = params.get("projectId");

  const [projects, setProjects] = useState<PlanningProjectSummary[]>([]);
  useEffect(() => {
    let cancelled = false;
    getPlanningProjects().then((list) => {
      if (!cancelled) setProjects(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const state = usePlanningState(projectId);
  const ready = state.load.status === "ready";
  const world = ready && state.doc ? state.doc.site.world : null;
  const siteBounds = ready && state.doc ? state.doc.site.bounds : null;
  const camera = useCanvasView(world, siteBounds);

  const projectName = useMemo(() => {
    const p = projects.find((x) => x.id === projectId);
    if (p) return p.name;
    if (projectId) return projectId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return "Planning Studio";
  }, [projects, projectId]);

  // --- drawers / popovers -------------------------------------------------------
  const [toolsOpen, setToolsOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preview, setPreview] = useState(false);

  const closeTools = useCallback(() => setToolsOpen(false), []);
  const closeInspector = useCallback(() => setInspectorOpen(false), []);
  const closeContext = useCallback(() => setContextOpen(false), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const switchProject = useCallback(
    (id: string) => {
      setParams({ projectId: id });
      setInspectorOpen(false);
      setToolsOpen(false);
    },
    [setParams]
  );

  const reload = useCallback(() => state.retry(), [state]);

  // --- keyboard shortcuts ------------------------------------------------------
  useEffect(() => {
    if (!ready) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void state.save();
        return;
      }
      if (typing) return; // leave native text editing (incl. Ctrl+Z) alone
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) state.redo();
        else state.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        state.redo();
        return;
      }
      if (toolsOpen || inspectorOpen || contextOpen || settingsOpen) return; // overlays own Escape
      if (e.key === "Escape") {
        if (state.draft.length > 0) state.cancelDraft();
        else if (state.tool !== "select") state.setTool("select");
        else state.select(null);
        return;
      }
      if (e.key === "Enter" && state.draft.length > 0) {
        e.preventDefault();
        state.finishDraft();
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && state.selectedObject) {
        e.preventDefault();
        state.deleteObject(state.selectedObject.id);
        return;
      }
      if (e.key === "+" || e.key === "=") camera.zoomIn();
      else if (e.key === "-" || e.key === "_") camera.zoomOut();
      else if (e.key === "0") camera.resetView();
      else if (e.key.toLowerCase() === "f" && !mod) camera.fitSite();
      else {
        const tool = TOOLS.find((t) => t.key && t.key.toLowerCase() === e.key.toLowerCase());
        if (tool && !mod) state.setTool(tool.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, state, camera, toolsOpen, inspectorOpen, contextOpen, settingsOpen]);

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    if (state.saveState !== "dirty") return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [state.saveState]);

  useEffect(() => {
    const prev = document.title;
    document.title = `${projectId ? `${projectName} · ` : ""}Planning Studio · UrbanForma`;
    return () => {
      document.title = prev;
    };
  }, [projectId, projectName]);

  // --- whole-studio states --------------------------------------------------------
  if (!projectId) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <StudioToolbar
          state={state}
          projects={projects}
          projectId={null}
          projectName="Planning Studio"
          onSwitchProject={switchProject}
          onPreview={() => undefined}
          onToggleSettings={() => undefined}
          settingsOpen={false}
          onOpenTools={() => undefined}
          onOpenInspector={() => undefined}
          onToggleContext={() => undefined}
          contextOpen={false}
          inspectorOpen={false}
        />
        <div className="min-h-0 flex-1">
          <NoProjectSelected projects={projects} onOpen={switchProject} />
        </div>
      </div>
    );
  }

  if (state.load.status === "not-found") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <StudioToolbar
          state={state}
          projects={projects}
          projectId={projectId}
          projectName="Unknown project"
          onSwitchProject={switchProject}
          onPreview={() => undefined}
          onToggleSettings={() => undefined}
          settingsOpen={false}
          onOpenTools={() => undefined}
          onOpenInspector={() => undefined}
          onToggleContext={() => undefined}
          contextOpen={false}
          inspectorOpen={false}
        />
        <div className="min-h-0 flex-1">
          <ProjectNotFound projectId={projectId} />
        </div>
      </div>
    );
  }

  if (state.load.status === "error") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1">
          <StudioError message={state.load.message} onRetry={reload} />
        </div>
      </div>
    );
  }

  const firstLoad = state.load.status === "loading" && !state.doc;
  if (firstLoad && projects.length === 0) {
    return <StudioLoading />;
  }

  const canvasArea = state.load.status === "loading" ? (
    <CanvasLoading />
  ) : state.mode !== "plan" ? (
    <ModePlaceholder mode={state.mode} onBackToPlan={() => state.setMode("plan")} />
  ) : (
    <PlanningCanvas state={state} camera={camera} />
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      <StudioToolbar
        state={state}
        projects={projects}
        projectId={projectId}
        projectName={projectName}
        onSwitchProject={switchProject}
        onPreview={() => setPreview((p) => !p)}
        onToggleSettings={() => setSettingsOpen((o) => !o)}
        settingsOpen={settingsOpen}
        onOpenTools={() => setToolsOpen(true)}
        onOpenInspector={() => setInspectorOpen((o) => !o)}
        onToggleContext={() => setContextOpen((o) => !o)}
        contextOpen={contextOpen}
        inspectorOpen={inspectorOpen}
      />

      {/* mobile-only mode selector row */}
      <div role="tablist" aria-label="Studio mode" className="flex shrink-0 items-center gap-1 border-b border-line bg-surface px-2 py-1.5 md:hidden">
        {(["plan", "context", "3d"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={state.mode === m}
            onClick={() => state.setMode(m)}
            className={[
              "h-8 flex-1 rounded-lg text-[12.5px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
              state.mode === m ? "bg-primary/10 text-primary" : "text-muted",
            ].join(" ")}
          >
            {m === "plan" ? "Plan" : m === "context" ? "Context" : "3D Preview"}
          </button>
        ))}
      </div>

      {/* workspace */}
      <div className="relative grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[216px_minmax(0,1fr)] xl:grid-cols-[216px_minmax(0,1fr)_296px] 2xl:grid-cols-[232px_minmax(0,1fr)_320px]">
        {/* left: tools (docked lg+) */}
        <div className={`hidden min-h-0 border-r border-line bg-surface lg:block ${preview ? "lg:hidden" : ""}`}>
          <PlanningToolPanel active={state.tool} onSelect={state.setTool} />
        </div>

        {/* centre: canvas */}
        <div className="relative min-h-0 min-w-0">
          {canvasArea}
          {settingsOpen && ready && <StudioSettings state={state} projectId={projectId} onClose={closeSettings} onReload={reload} />}
          {preview && (
            <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2">
              <span className="rounded-full bg-scrim/85 px-3 py-1 text-[12px] font-bold text-on-brand shadow-soft">Preview — panels hidden · press Preview again to exit</span>
            </div>
          )}

          {/* drawers (scoped to the canvas box) */}
          <PanelDrawer open={toolsOpen} onClose={closeTools} label="Planning tools" side="bottom" hideAt="lg">
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-faint">Tools</h2>
              <button type="button" onClick={closeTools} className="text-[12.5px] font-bold text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 rounded-md px-1">
                Done
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="p-2">
                <PlanningToolPanel
                  active={state.tool}
                  onSelect={(t) => {
                    state.setTool(t);
                    closeTools();
                  }}
                  layout="grid"
                />
              </div>
              {/* phones have no room for a Context button in the toolbar — layers live here */}
              <div className="border-t border-line sm:hidden">
                <ContextPanel state={state} />
              </div>
            </div>
          </PanelDrawer>
          <PanelDrawer open={contextOpen} onClose={closeContext} label="Context layers" side="left" hideAt="xl">
            <ContextPanel state={state} onClose={closeContext} />
          </PanelDrawer>
          <PanelDrawer open={inspectorOpen} onClose={closeInspector} label="Properties" side="right" hideAt="xl">
            <InspectorPanel state={state} onClose={closeInspector} />
          </PanelDrawer>
        </div>

        {/* right: inspector + context (docked xl+) */}
        <div className={`hidden min-h-0 flex-col border-l border-line bg-surface xl:flex ${preview ? "xl:hidden" : ""}`}>
          <div className="min-h-0 flex-[3] overflow-hidden border-b border-line">
            <InspectorPanel state={state} />
          </div>
          <div className="min-h-0 flex-[2] overflow-hidden">
            <ContextPanel state={state} />
          </div>
        </div>
      </div>

      <StatusBar state={state} scaleLabel={camera.scaleLabel} />
    </div>
  );
}
