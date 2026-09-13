import { useUnitPreferences } from "../../settings/hooks/useUnitPreferences";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Check, Focus, FolderTree, GitBranch, Home, Info, Minus, Plus, SlidersHorizontal, Square, Target, X } from "lucide-react";
import { IconButton } from "../../../components/ui/IconButton";
import { NoProjectSelected, ProjectNotFound, SpatialError, SpatialLoading } from "../../visualization/components/VisualizationStates";
import { PanelDrawer } from "../../../components/ui/PanelDrawer";
import { useMapView } from "../../visualization/hooks/useMapView";
import { MODES, getConstraintDef } from "../data/optimization.data";
import { useOptimizationState, relativeDay, type OptimizationWorkspaceState } from "../hooks/useOptimizationState";
import { buildOptimizationExport, downloadArtifact, getLastOptimizedProject, getOptimizationProjects, type OptimizationProjectSummary, type ScoredScenario } from "../services/optimization.service";
import type { ExportFormat, OptimizationMode, PlanningVersion } from "../types/optimization.types";
import { ConfirmDialog } from "./ConfirmDialog";
import { ConstraintsPanel } from "./ConstraintsPanel";
import { GoalPerformance } from "./GoalPerformance";
import { GoalsPanel } from "./GoalsPanel";
import { ObjectiveWeights } from "./ObjectiveWeights";
import { OptimizationStatusBar } from "./OptimizationStatusBar";
import { OptimizationToolbar } from "./OptimizationToolbar";
import { PerformanceChart } from "./PerformanceChart";
import { ScenarioCard, ScenarioStatusBadge } from "./ScenarioCard";
import { ScenarioComparison } from "./ScenarioComparison";
import { ScenarioGenerator } from "./ScenarioGenerator";
import { ScenarioHistory } from "./ScenarioHistory";
import { ScenarioInspector } from "./ScenarioInspector";
import { ScenarioList } from "./ScenarioList";
import { ChangeLegend, ScenarioVisualization, SelectedObjectChip } from "./ScenarioVisualization";

type PanelId = "goals" | "inspector";
type DialogState = { kind: "select"; scenario: ScoredScenario } | { kind: "apply"; scenario: ScoredScenario } | { kind: "reset" } | null;

/**
 * Optimization & Scenario Planning workspace — /app/optimization[?projectId=<id>].
 *
 *   toolbar (back · project · Optimize / Compare / Review · 2D/3D · Generate · Save · Export)
 *   [ goals & constraints | scenario visualization | scenario details ]
 *   generated scenarios (cards)  — or the comparison / review views
 *   status bar
 *
 * Goals dock at lg, details at xl; below those breakpoints both are drawers.
 */
export function OptimizationWorkspace() {
  // Subscribe to the workspace unit preference so every formatted measurement
  // in this module re-renders when the user switches systems (Settings → Units).
  useUnitPreferences();
  const [params, setParams] = useSearchParams();
  const projectId = params.get("projectId");

  const [projects, setProjects] = useState<OptimizationProjectSummary[]>([]);
  useEffect(() => {
    let cancelled = false;
    getOptimizationProjects().then((list) => {
      if (cancelled) return;
      const last = getLastOptimizedProject();
      setProjects(last ? [...list].sort((a, b) => Number(b.id === last) - Number(a.id === last)) : list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const state = useOptimizationState(projectId);
  const ready = state.load.status === "ready" && !!state.context && !!state.state;
  const map = useMapView(state.context?.spatial.world ?? null, state.context?.spatial.siteBounds ?? null, projectId);

  const projectName = useMemo(() => {
    if (state.context?.projectName) return state.context.projectName;
    const p = projects.find((x) => x.id === projectId);
    if (p) return p.name;
    if (projectId) return projectId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return "Optimization";
  }, [projects, projectId, state.context]);

  // --- panels / dialogs -----------------------------------------------------------------------
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  const togglePanel = useCallback((p: PanelId) => setOpenPanel((cur) => (cur === p ? null : p)), []);
  const closePanel = useCallback(() => setOpenPanel(null), []);
  const [dialog, setDialog] = useState<DialogState>(null);
  const closeDialog = useCallback(() => setDialog(null), []);
  useEffect(() => {
    setOpenPanel(null);
    setDialog(null);
  }, [projectId]);

  const switchProject = useCallback(
    (id: string) => {
      setParams({ projectId: id });
      setOpenPanel(null);
    },
    [setParams]
  );

  // --- export (demo) --------------------------------------------------------------------------
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!exportNotice) return;
    const t = window.setTimeout(() => setExportNotice(null), 2600);
    return () => window.clearTimeout(t);
  }, [exportNotice]);
  const onExport = useCallback(
    (format: ExportFormat) => {
      if (!state.context || !state.inputs) return;
      const artifact = buildOptimizationExport(state.context, state.scenarios, state.inputs, state.state?.selectedScenarioId ?? null, format);
      const ok = downloadArtifact(artifact);
      setExportNotice(ok ? `Downloaded ${artifact.filename}` : "Export prepared (download unavailable here)");
    },
    [state.context, state.inputs, state.scenarios, state.state?.selectedScenarioId]
  );

  useEffect(() => {
    const prev = document.title;
    document.title = `${projectId ? `${projectName} · ` : ""}Optimization · UrbanForma`;
    return () => {
      document.title = prev;
    };
  }, [projectId, projectName]);

  // --- decisions ---------------------------------------------------------------------------------
  const requestSelect = useCallback((scenario: ScoredScenario) => setDialog({ kind: "select", scenario }), []);
  const requestApply = useCallback((scenario: ScoredScenario) => setDialog({ kind: "apply", scenario }), []);
  const requestSelectById = useCallback(
    (id: string) => {
      const s = state.scenarios.find((x) => x.id === id);
      if (s) requestSelect(s);
    },
    [state.scenarios, requestSelect]
  );
  const { selectScenario, applyScenario, resetAll, setMode, setActiveScenario } = state;
  const generate = useCallback(() => {
    if (state.mode !== "optimize") setMode("optimize");
    state.generate();
  }, [state, setMode]);
  const confirmDialog = useCallback(() => {
    if (!dialog) return;
    if (dialog.kind === "select") selectScenario(dialog.scenario.id);
    else if (dialog.kind === "apply") {
      applyScenario(dialog.scenario.id);
      setMode("review");
    } else resetAll();
    setDialog(null);
  }, [dialog, selectScenario, applyScenario, resetAll, setMode]);

  const viewScenario = useCallback(
    (id: string) => {
      setActiveScenario(id);
      if (state.mode === "compare") setMode("optimize");
    },
    [setActiveScenario, setMode, state.mode]
  );

  // Compare / Review need scenarios — fall back to Optimize when there is no generation at all
  // (fresh project, after reset). A stored generation that is still being re-derived keeps the mode.
  const hasGeneration = !!state.state?.generation;
  useEffect(() => {
    if (ready && state.mode !== "optimize" && !hasGeneration && state.generationStatus !== "generating") setMode("optimize");
  }, [ready, state.mode, hasGeneration, state.generationStatus, setMode]);

  // --- keyboard shortcuts -----------------------------------------------------------------
  const { selectObject, requestCamera, viewMode, mode } = state;
  useEffect(() => {
    if (!ready) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") {
        if (dialog) return; // the dialog handles its own Escape
        if (document.activeElement?.closest('[role="menu"], [aria-haspopup="menu"][aria-expanded="true"]')) return;
        if (openPanel) setOpenPanel(null);
        else selectObject(null);
        return;
      }
      if (openPanel || dialog || mode !== "optimize") return;
      const k = e.key.toLowerCase();
      if (k === "f") requestCamera("fit");
      else if (k === "r" || e.key === "0") requestCamera("reset");
      else if (viewMode === "3d" && k === "t") requestCamera("top");
      else if (viewMode === "3d" && k === "p") requestCamera("perspective");
      else if (viewMode === "2d" && (e.key === "+" || e.key === "=")) map.zoomIn();
      else if (viewMode === "2d" && (e.key === "-" || e.key === "_")) map.zoomOut();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, openPanel, dialog, viewMode, mode, map, selectObject, requestCamera]);

  const generating = state.generationStatus === "generating";
  const toolbar = (
    <OptimizationToolbar
      projects={projects}
      projectId={projectId}
      projectName={projectName}
      ready={ready}
      generating={generating}
      hasScenarios={state.scenarios.length > 0}
      mode={state.mode}
      onMode={state.setMode}
      viewMode={state.viewMode}
      onViewMode={state.setViewMode}
      onGenerate={generate}
      onSave={() => void state.save()}
      saving={state.saveState.status === "saving"}
      dirty={state.dirty}
      onExport={onExport}
      exportedNotice={exportNotice}
      inspectorOpen={openPanel === "inspector"}
      onToggleInspector={() => togglePanel("inspector")}
      onSwitchProject={switchProject}
    />
  );

  if (!projectId) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {toolbar}
        <div className="min-h-0 flex-1">
          <NoProjectSelected projects={projects} onOpen={switchProject} />
        </div>
      </div>
    );
  }
  if (state.load.status === "not-found") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {toolbar}
        <div className="min-h-0 flex-1">
          <ProjectNotFound projectId={projectId} />
        </div>
      </div>
    );
  }
  if (state.load.status === "error") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {toolbar}
        <div className="min-h-0 flex-1">
          <SpatialError message={state.load.message} onRetry={state.retry} />
        </div>
      </div>
    );
  }

  const context = state.context;
  const derived = state.derivedSpatial;
  const selectedObject = state.selectedObjectId ? (derived?.dataset.objects.find((o) => o.id === state.selectedObjectId) ?? derived?.removed.find((o) => o.id === state.selectedObjectId) ?? context?.spatial.objects.find((o) => o.id === state.selectedObjectId) ?? null) : null;
  const selectedKind = selectedObject && derived ? (derived.removed.some((o) => o.id === selectedObject.id) ? "removed" : derived.changeOf.get(selectedObject.id)) : undefined;
  const compared = state.scenarios.filter((s) => state.compareIds.includes(s.id));

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      {toolbar}

      <div className="relative grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_320px]">
        {/* left: goals & constraints (docked lg+) */}
        <div className="hidden min-h-0 border-r border-line bg-surface lg:block">{ready ? <GoalsSidebar state={state} idPrefix="goals-dock" onReset={() => setDialog({ kind: "reset" })} /> : <PanelSkeleton title="Goals & Constraints" />}</div>

        {/* centre */}
        <div className="relative flex min-h-0 min-w-0 flex-col">
          {ready && <MobileModeStrip mode={state.mode} onSelect={state.setMode} hasScenarios={state.scenarios.length > 0} />}

          {/* transient notice (all modes) */}
          {state.notice && (
            <div className="pointer-events-none absolute inset-x-0 top-16 z-10 flex justify-center px-3 xl:top-3">
              <p role="status" className="pointer-events-auto inline-flex max-w-full items-center gap-2 rounded-xl border border-line bg-surface/95 px-3 py-2 text-[12.5px] font-semibold text-ink shadow-float animate-pop motion-reduce:animate-none">
                <Check size={14} className="shrink-0 text-success" aria-hidden="true" />
                <span className="min-w-0 truncate">{state.notice}</span>
                <button type="button" onClick={() => state.setNotice(null)} aria-label="Dismiss" className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
                  <X size={12} />
                </button>
              </p>
            </div>
          )}

          {!ready || !context ? (
            <div className="relative min-h-0 flex-1">
              <SpatialLoading label="Loading optimization…" />
            </div>
          ) : state.mode === "compare" ? (
            <CompareView state={state} onView={viewScenario} />
          ) : state.mode === "review" ? (
            <ReviewView state={state} onView={viewScenario} onRequestSelect={requestSelect} onRequestApply={requestApply} />
          ) : (
            <>
              {/* visualization */}
              <div className="relative min-h-[280px] flex-1 lg:min-h-[320px]">
                <ScenarioVisualization current={context.spatial} derived={derived} scenarioName={state.activeScenario?.name ?? null} viewMode={state.viewMode} map={map} camera={state.camera} selectedId={state.selectedObjectId} onSelect={selectObject} />

                {/* headline card: current vs scenario */}
                <div className="pointer-events-none absolute left-3 top-16 hidden w-[276px] md:block">
                  <div className="pointer-events-auto">
                    <ScenarioHeadline state={state} onSelect={requestSelect} />
                  </div>
                </div>

                {/* legend (bottom-right) */}
                <div className="pointer-events-none absolute bottom-3 right-3 hidden w-[232px] md:block">
                  <ChangeLegend derived={derived} className="pointer-events-auto" />
                </div>

                {/* selected object chip (bottom-left, above the scale bar) */}
                {selectedObject && (
                  <div className="pointer-events-none absolute bottom-12 left-3 hidden w-[300px] md:block">
                    <div className="pointer-events-auto">
                      <SelectedObjectChip object={selectedObject} kind={selectedKind} note={derived?.modifiedNotes.get(selectedObject.id)} onClear={() => selectObject(null)} />
                    </div>
                  </div>
                )}

                {/* view controls (top-right) */}
                <div className="pointer-events-none absolute right-3 top-3 hidden md:block">
                  <div className="pointer-events-auto">
                    <ViewControls state3d={state.viewMode === "3d"} onZoomIn={map.zoomIn} onZoomOut={map.zoomOut} onPreset={state.requestCamera} />
                  </div>
                </div>

                {/* generation progress */}
                {state.generation && <ScenarioGenerator progress={state.generation} onDismiss={state.dismissGeneration} onRetry={generate} />}

              </div>

              {/* mobile: scenario summary + legend */}
              <div className="shrink-0 border-t border-line bg-surface md:hidden">
                <div className="px-3 py-2">
                  <ScenarioHeadline state={state} onSelect={requestSelect} compact />
                </div>
                {selectedObject && (
                  <div className="px-3 pb-2">
                    <SelectedObjectChip object={selectedObject} kind={selectedKind} note={derived?.modifiedNotes.get(selectedObject.id)} onClear={() => selectObject(null)} />
                  </div>
                )}
                <div className="px-3 pb-2">
                  <ChangeLegend derived={derived} compact className="shadow-none" />
                </div>
              </div>

              {/* scenario cards */}
              <div className="shrink-0 border-t border-line bg-surface">
                <ScenarioList scenarios={state.scenarios} activeId={state.activeScenarioId} compareIds={state.compareIds} generating={generating} onView={viewScenario} onToggleCompare={state.toggleCompare} onSelect={requestSelectById} onGenerate={generate} />
              </div>
            </>
          )}

          {/* phone / tablet bottom bar */}
          {ready && (
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line bg-surface px-2 py-1.5 xl:hidden" aria-label="Optimization controls">
              <div className="flex items-center gap-0.5">
                <IconButton icon={Target} label="Goals & constraints" size="sm" onClick={() => togglePanel("goals")} active={openPanel === "goals"} aria-expanded={openPanel === "goals"} className="lg:hidden" />
                <IconButton icon={SlidersHorizontal} label="Scenario details" size="sm" onClick={() => togglePanel("inspector")} active={openPanel === "inspector"} aria-expanded={openPanel === "inspector"} />
              </div>
              {state.mode === "optimize" && (
                <div className="flex items-center gap-2">
                  <div role="tablist" aria-label="Visualization" className="flex shrink-0 items-center gap-0.5 rounded-xl border border-line bg-surface-2 p-0.5 sm:hidden">
                    {(
                      [
                        { id: "2d", label: "2D" },
                        { id: "3d", label: "3D" },
                      ] as const
                    ).map((v) => (
                      <button key={v.id} type="button" role="tab" aria-selected={state.viewMode === v.id} onClick={() => state.setViewMode(v.id)} className={["inline-flex h-8 items-center rounded-[9px] px-2.5 text-[12px] font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20", state.viewMode === v.id ? "bg-surface text-primary shadow-soft" : "text-muted hover:text-ink"].join(" ")}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                  <ViewControls state3d={state.viewMode === "3d"} onZoomIn={map.zoomIn} onZoomOut={map.zoomOut} onPreset={state.requestCamera} compact />
                </div>
              )}
            </div>
          )}
        </div>

        {/* right: scenario details (docked xl+) */}
        <div className="hidden min-h-0 border-l border-line bg-surface xl:block">{ready ? <ScenarioInspector state={state} onRequestSelect={requestSelect} onRequestApply={requestApply} idPrefix="inspector-dock" /> : <PanelSkeleton title="Scenario Details" />}</div>

        {/* drawers */}
        <PanelDrawer open={openPanel === "goals"} onClose={closePanel} label="Goals & constraints" side="left" hideAt="lg">
          {ready && <GoalsSidebar state={state} idPrefix="goals-drawer" onClose={closePanel} onReset={() => setDialog({ kind: "reset" })} />}
        </PanelDrawer>
        <PanelDrawer open={openPanel === "inspector"} onClose={closePanel} label="Scenario details" side="right" hideAt="xl">
          {ready && <ScenarioInspector state={state} onClose={closePanel} onRequestSelect={requestSelect} onRequestApply={requestApply} idPrefix="inspector-drawer" />}
        </PanelDrawer>

        {/* dialogs */}
        <ConfirmDialog open={dialog?.kind === "select"} title="Select preferred scenario" description={<>Use this scenario as the preferred planning direction?{dialog?.kind === "select" && <span className="mt-1 block text-ink">Only one scenario can be preferred. This marks <strong>{dialog.scenario.name}</strong> — it does not change the project plan.</span>}</>} confirmLabel="Select Scenario" onConfirm={confirmDialog} onCancel={closeDialog} />
        <ConfirmDialog
          open={dialog?.kind === "apply"}
          title="Apply scenario to project"
          description={
            <>
              Create a new local version of the project from <strong>{dialog?.kind === "apply" ? dialog.scenario.name : ""}</strong>? The current plan stays intact and remains the working version.
              {dialog?.kind === "apply" && (
                <ul className="mt-3 grid gap-1 rounded-xl bg-surface-2 p-3 text-[12px] text-ink" aria-label="Resulting version tree">
                  <li className="flex items-center gap-2 font-bold">
                    <FolderTree size={14} className="text-primary" aria-hidden="true" /> {projectName}
                  </li>
                  <li className="ml-5 flex items-center gap-2">
                    <GitBranch size={13} className="text-muted" aria-hidden="true" /> Current Plan <span className="text-muted">· unchanged</span>
                  </li>
                  <li className="ml-5 flex items-center gap-2">
                    <GitBranch size={13} className="text-success" aria-hidden="true" /> Preferred Scenario — {dialog.scenario.name} <span className="text-muted">· new</span>
                  </li>
                </ul>
              )}
            </>
          }
          confirmLabel="Apply to Project"
          onConfirm={confirmDialog}
          onCancel={closeDialog}
        />
        <ConfirmDialog open={dialog?.kind === "reset"} title="Reset optimization?" description="Goals, priorities, constraints and generated scenarios return to the baseline for this project. Project data and saved versions are kept." confirmLabel="Reset Optimization" tone="danger" onConfirm={confirmDialog} onCancel={closeDialog} />
      </div>

      <OptimizationStatusBar state={state} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Left sidebar
// ---------------------------------------------------------------------------

function GoalsSidebar({ state, idPrefix, onClose, onReset }: { state: OptimizationWorkspaceState; idPrefix: string; onClose?: () => void; onReset: () => void }) {
  const { inputs } = state;
  if (!inputs) return null;
  const busy = state.generationStatus === "generating";
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-faint">Goals & Constraints</h2>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close goals" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
            <X size={16} />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <GoalsPanel goals={inputs.goals} onChange={state.setGoalPriority} disabled={busy} idPrefix={idPrefix} />
        <ObjectiveWeights weights={inputs.weights} onChange={state.setWeight} onReset={state.resetWeights} disabled={busy} idPrefix={idPrefix} />
        <ConstraintsPanel constraints={inputs.constraints} currentChecks={state.currentChecks} onChange={state.setConstraint} disabled={busy} idPrefix={idPrefix} />
        {state.scenarios.length > 0 && (
          <p className="mx-4 mb-3 flex items-start gap-1.5 rounded-lg bg-primary/5 px-2.5 py-2 text-[11px] leading-snug text-muted">
            <Info size={13} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <span>Priority weights and constraints re-score the existing scenarios instantly. Changing goal priorities takes effect on the next generation.</span>
          </p>
        )}
        <ScenarioHistory history={state.history} currentGenerationId={state.state?.generation?.id ?? null} onLoad={state.loadGeneration} onReset={onReset} disabled={busy} idPrefix={idPrefix} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Headline card (Current vs Scenario)
// ---------------------------------------------------------------------------

function ScenarioHeadline({ state, onSelect, compact = false }: { state: OptimizationWorkspaceState; onSelect: (s: ScoredScenario) => void; compact?: boolean }) {
  const { context, activeScenario: s } = state;
  if (!context) return null;
  const cur = context.current.metrics;
  const rows: { label: string; current: string; scenario: string | null; improved: boolean | null }[] = [
    { label: "Green Coverage", current: `${cur.greenCoverage.toFixed(1)}%`, scenario: s ? `${s.metrics.greenCoverage.toFixed(1)}%` : null, improved: s ? (s.metrics.greenCoverage > cur.greenCoverage ? true : s.metrics.greenCoverage < cur.greenCoverage ? false : null) : null },
    { label: "Heat Risk", current: heat(cur.heatIndex), scenario: s ? heat(s.metrics.heatIndex) : null, improved: s ? (s.metrics.heatIndex < cur.heatIndex ? true : s.metrics.heatIndex > cur.heatIndex ? false : null) : null },
    { label: "Mobility", current: `${Math.round(cur.mobility)}`, scenario: s ? `${Math.round(s.metrics.mobility)}` : null, improved: s ? (s.metrics.mobility > cur.mobility ? true : s.metrics.mobility < cur.mobility ? false : null) : null },
    { label: "Environment", current: `${Math.round(cur.environment)}`, scenario: s ? `${Math.round(s.metrics.environment)}` : null, improved: s ? (s.metrics.environment > cur.environment ? true : s.metrics.environment < cur.environment ? false : null) : null },
  ];
  return (
    <div className={`rounded-2xl border border-line bg-surface/95 shadow-soft ${compact ? "p-2.5" : "p-3"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint">{s ? `Scenario ${s.letter} · vs current plan` : "Current plan"}</p>
          <h2 className="truncate text-[13.5px] font-extrabold text-ink">{s ? s.name : context.projectName}</h2>
        </div>
        <div className="shrink-0 text-right">
          <span className="block text-[18px] font-extrabold leading-none tabular-nums text-ink">{s ? s.score : context.current.score}</span>
          <span className="text-[10px] font-bold text-faint">/ 100</span>
        </div>
      </div>
      {s && <ScenarioStatusBadge status={s.status} className="mt-1" />}
      <table className="mt-2 w-full text-[11.5px]">
        <caption className="sr-only">Current plan versus the active scenario</caption>
        <thead>
          <tr className="text-[10px] font-bold uppercase tracking-wider text-faint">
            <th scope="col" className="pb-1 text-left font-bold">
              Metric
            </th>
            <th scope="col" className="pb-1 text-right font-bold">
              Current
            </th>
            {s && (
              <th scope="col" className="pb-1 text-right font-bold text-primary">
                Scenario
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-line/70">
              <th scope="row" className="py-1 text-left font-semibold text-muted">
                {r.label}
              </th>
              <td className="py-1 text-right font-bold tabular-nums text-ink">{r.current}</td>
              {s && (
                <td className={`py-1 text-right font-extrabold tabular-nums ${r.improved === true ? "text-success" : r.improved === false ? "text-warning" : "text-ink"}`}>
                  {r.scenario}
                  <span className="sr-only">{r.improved === true ? " improved" : r.improved === false ? " reduced" : ""}</span>
                  {r.improved !== null && <span aria-hidden="true"> {r.improved ? "↑" : "↓"}</span>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {s && !compact && s.status !== "Selected" && s.status !== "Archived" && (
        <button type="button" onClick={() => onSelect(s)} className="mt-2 inline-flex h-8 w-full items-center justify-center rounded-lg border border-line bg-surface text-[12px] font-bold text-primary hover:border-primary hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
          Select as preferred
        </button>
      )}
    </div>
  );
}

function heat(index: number) {
  return index < 60 ? "Low" : index < 75 ? "Medium" : "High";
}

// ---------------------------------------------------------------------------
// Compare mode
// ---------------------------------------------------------------------------

function CompareView({ state, onView }: { state: OptimizationWorkspaceState; onView: (id: string) => void }) {
  const { context, inputs } = state;
  if (!context || !inputs) return null;
  const compared = state.scenarios.filter((s) => state.compareIds.includes(s.id));
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto grid w-full max-w-[1400px] gap-4 p-3 sm:p-4 lg:p-6">
        <ScenarioComparison current={context.current} scenarios={compared} activeId={state.activeScenarioId} onView={onView} all={state.scenarios} compareIds={state.compareIds} onToggleCompare={state.toggleCompare} />
        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <PerformanceChart current={context.current} scenarios={compared} activeId={state.activeScenarioId} />
          <ConstraintMatrix scenarios={compared} />
        </div>
        <GoalPerformance rows={state.goalRows} goals={inputs.goals} scenarios={compared} activeId={state.activeScenarioId} />
        <p className="text-[11px] text-faint">All values are demo estimates derived from the current plan and its analysis — not engineering calculations.</p>
      </div>
    </div>
  );
}

function ConstraintMatrix({ scenarios }: { scenarios: ScoredScenario[] }) {
  if (scenarios.length === 0) return null;
  const constraints = scenarios[0].checks.map((c) => c.constraintId);
  return (
    <section aria-labelledby="constraint-matrix-title" className="rounded-2xl border border-line bg-surface p-4">
      <h3 id="constraint-matrix-title" className="text-[15px] font-extrabold text-ink">
        Constraint Check
      </h3>
      <p className="text-[12px] text-muted">Pass / Warning / Fail per scenario. Violations never hide a scenario.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] text-[12px]">
          <caption className="sr-only">Constraint verdicts per scenario</caption>
          <thead>
            <tr className="border-b border-line text-[10.5px] font-bold uppercase tracking-wider text-faint">
              <th scope="col" className="py-2 pr-2 text-left">
                Constraint
              </th>
              {scenarios.map((s) => (
                <th key={s.id} scope="col" className="px-2 py-2 text-left">
                  {s.letter} · {s.name.split(" ")[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {constraints.map((cid) => (
              <tr key={cid} className="border-b border-line last:border-b-0">
                <th scope="row" className="py-2 pr-2 text-left font-semibold text-ink">
                  {getConstraintDef(cid).label}
                </th>
                {scenarios.map((s) => {
                  const c = s.checks.find((x) => x.constraintId === cid);
                  if (!c) return <td key={s.id} />;
                  return (
                    <td key={s.id} className="px-2 py-2 align-top">
                      <ConstraintCell verdict={c.verdict} message={c.message} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ConstraintCell({ verdict, message }: { verdict: ScoredScenario["checks"][number]["verdict"]; message: string }) {
  const tone = verdict === "pass" ? "text-success" : verdict === "warning" ? "text-warning" : verdict === "fail" ? "text-danger" : "text-faint";
  const glyph = verdict === "pass" ? "✓" : verdict === "warning" ? "⚠" : verdict === "fail" ? "✕" : "–";
  const label = verdict === "pass" ? "Pass" : verdict === "warning" ? "Warning" : verdict === "fail" ? "Fail" : "Off";
  return (
    <div className="min-w-[120px]">
      <span className={`inline-flex items-center gap-1 font-extrabold ${tone}`}>
        <span aria-hidden="true">{glyph}</span> {label}
      </span>
      {verdict !== "pass" && verdict !== "off" && <p className="text-[11px] leading-snug text-muted">{message}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review mode: preferred scenario + versions
// ---------------------------------------------------------------------------

function ReviewView({ state, onView, onRequestSelect, onRequestApply }: { state: OptimizationWorkspaceState; onView: (id: string) => void; onRequestSelect: (s: ScoredScenario) => void; onRequestApply: (s: ScoredScenario) => void }) {
  const { context } = state;
  if (!context) return null;
  const preferred = state.scenarios.find((s) => s.status === "Selected") ?? null;
  const ordered = [...state.scenarios].sort((a, b) => (a.status === "Selected" ? -1 : b.status === "Selected" ? 1 : b.score - a.score));
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto grid w-full max-w-[1400px] gap-4 p-3 sm:p-4 lg:p-6">
        <section aria-labelledby="review-title" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint">Review</p>
            <h3 id="review-title" className="mt-0.5 text-[17px] font-extrabold text-ink">
              {preferred ? `Preferred direction: ${preferred.name}` : "No preferred scenario yet"}
            </h3>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">{preferred ? preferred.description : "Select a scenario in Optimize or Compare mode to mark it as the preferred planning direction. Applying it creates a new local version while the current plan stays intact."}</p>
            {preferred && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-line p-3">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint">Overall score</p>
                  <p className="text-[24px] font-extrabold tabular-nums text-ink">
                    {preferred.score}
                    <span className="ml-1 text-[12px] text-faint">/ 100</span>
                    <span className="ml-2 text-[12px] font-bold text-muted">current {context.current.score}</span>
                  </p>
                </div>
                <div className="rounded-xl border border-line p-3">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint">Constraints</p>
                  <p className="mt-1 text-[12.5px] font-bold text-ink">
                    {preferred.checks.filter((c) => c.verdict === "pass").length} pass · {preferred.checks.filter((c) => c.verdict === "warning").length} warning · {preferred.checks.filter((c) => c.verdict === "fail").length} fail
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <button type="button" onClick={() => onView(preferred.id)} className="inline-flex h-9 items-center rounded-lg border border-line bg-surface px-3 text-[12.5px] font-bold text-primary hover:border-primary hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
                    View on map
                  </button>
                  <button type="button" onClick={() => onRequestApply(preferred)} className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-[12.5px] font-bold text-on-brand shadow-glow hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
                    Apply to Project
                  </button>
                </div>
              </div>
            )}
          </div>
          <VersionTree projectName={context.projectName} versions={state.versions} />
        </section>

        <section aria-labelledby="review-list-title">
          <h3 id="review-list-title" className="px-1 text-[11px] font-bold uppercase tracking-widest text-faint">
            All scenarios
          </h3>
          <ul className="mt-2 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            {ordered.map((s) => (
              <li key={s.id}>
                <ScenarioCard scenario={s} active={s.id === state.activeScenarioId} compared={state.compareIds.includes(s.id)} compareDisabled={state.compareIds.length >= 4} onView={onView} onToggleCompare={state.toggleCompare} onSelect={(id) => onRequestSelect(state.scenarios.find((x) => x.id === id)!)} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function VersionTree({ projectName, versions }: { projectName: string; versions: PlanningVersion[] }) {
  return (
    <section aria-labelledby="versions-title" className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 id="versions-title" className="text-[15px] font-extrabold text-ink">
          Project Versions
        </h3>
        <span className="text-[11px] font-semibold text-muted">{versions.length} local</span>
      </div>
      <p className="text-[12px] text-muted">Applying a scenario adds a version — the current plan is never overwritten.</p>
      <ul className="mt-3 grid gap-1 text-[12.5px]" aria-label="Version tree">
        <li className="flex items-center gap-2 font-extrabold text-ink">
          <FolderTree size={15} className="text-primary" aria-hidden="true" /> {projectName}
        </li>
        <li className="ml-2 border-l-2 border-line pl-3">
          <ul className="grid gap-1">
            <li className="flex items-center gap-2 py-1">
              <GitBranch size={14} className="shrink-0 text-muted" aria-hidden="true" />
              <span className="font-bold text-ink">Current Plan</span>
              <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-muted ring-1 ring-line">working</span>
            </li>
            {versions.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 py-1">
                <GitBranch size={14} className="shrink-0 text-success" aria-hidden="true" />
                <span className="font-bold text-ink">{v.name}</span>
                <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success ring-1 ring-success/20">{v.type}</span>
                <span className="text-[11px] text-muted">
                  score {v.analysisResult.overallScore} · {relativeDay(v.createdAt)}
                </span>
              </li>
            ))}
            {versions.length === 0 && <li className="py-1 text-[12px] italic text-faint">No scenario versions yet.</li>}
          </ul>
        </li>
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------

const btn = "grid h-9 w-9 place-items-center text-muted transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/20";

function ViewControls({ state3d, onZoomIn, onZoomOut, onPreset, compact = false }: { state3d: boolean; onZoomIn: () => void; onZoomOut: () => void; onPreset: (p: "fit" | "reset" | "top" | "perspective") => void; compact?: boolean }) {
  const groupCls = compact ? "flex items-center divide-x divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-soft" : "flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-soft";
  return (
    <div className={compact ? "flex items-center gap-2" : "flex flex-col gap-2"} role="group" aria-label="View controls">
      {!state3d && (
        <div className={groupCls}>
          <button type="button" className={btn} onClick={onZoomIn} aria-label="Zoom in" title="Zoom in (+)">
            <Plus size={17} />
          </button>
          <button type="button" className={btn} onClick={onZoomOut} aria-label="Zoom out" title="Zoom out (−)">
            <Minus size={17} />
          </button>
        </div>
      )}
      <div className={groupCls}>
        <button type="button" className={btn} onClick={() => onPreset("fit")} aria-label="Fit site" title="Fit Site (F)">
          <Focus size={17} />
        </button>
        {state3d && (
          <>
            <button type="button" className={btn} onClick={() => onPreset("top")} aria-label="Top view" title="Top View (T)">
              <Square size={16} />
            </button>
            <button type="button" className={btn} onClick={() => onPreset("perspective")} aria-label="Perspective view" title="Perspective (P)">
              <Box size={17} />
            </button>
          </>
        )}
        <button type="button" className={btn} onClick={() => onPreset("reset")} aria-label="Reset view" title={state3d ? "Reset View (R)" : "Reset View (0)"}>
          <Home size={16} />
        </button>
      </div>
    </div>
  );
}

/** Mode chips for < xl screens (the toolbar shows the mode tabs from xl). */
function MobileModeStrip({ mode, onSelect, hasScenarios }: { mode: OptimizationMode; onSelect: (m: OptimizationMode) => void; hasScenarios: boolean }) {
  return (
    <div className="shrink-0 border-b border-line bg-surface xl:hidden">
      <div role="tablist" aria-label="Optimization mode" className="flex gap-1.5 overflow-x-auto px-3 py-2">
        {MODES.map((m) => {
          const isActive = m.id === mode;
          const disabled = m.id !== "optimize" && !hasScenarios;
          return (
            <button key={m.id} type="button" role="tab" aria-selected={isActive} disabled={disabled} onClick={() => onSelect(m.id)} className={["inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full border px-3 text-[12px] font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-50", isActive ? "border-primary bg-primary/10 text-primary" : "border-line bg-surface text-muted hover:text-ink"].join(" ")}>
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PanelSkeleton({ title }: { title: string }) {
  return (
    <div className="flex h-full min-h-0 flex-col" aria-busy="true">
      <div className="flex h-11 shrink-0 items-center border-b border-line px-4">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-faint">{title}</h2>
      </div>
      <div className="grid gap-2 p-4" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" style={{ width: `${88 - i * 9}%` }} />
        ))}
      </div>
    </div>
  );
}
