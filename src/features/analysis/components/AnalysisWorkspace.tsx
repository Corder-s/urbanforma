import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Focus, Home, LayoutGrid, Minus, Plus, SlidersHorizontal, Square } from "lucide-react";
import { IconButton } from "../../../components/ui/IconButton";
import { NoProjectSelected, ProjectNotFound, SpatialError, SpatialLoading } from "../../visualization/components/VisualizationStates";
import { PanelDrawer } from "../../../components/ui/PanelDrawer";
import { useMapView } from "../../visualization/hooks/useMapView";
import { CATEGORIES, getCategory, isCategoryId } from "../data/analysis.data";
import { useAnalysisState } from "../hooks/useAnalysisState";
import { buildExport, downloadArtifact, getAnalysisProjects, getLastAnalyzedProject, type AnalysisProjectSummary } from "../services/analysis.service";
import type { AnalysisCategoryId, ExportFormat } from "../types/analysis.types";
import { AnalysisCompare } from "./AnalysisCompare";
import { AnalysisInspector } from "./AnalysisInspector";
import { AnalysisLegend } from "./AnalysisLegend";
import { AnalysisMap } from "./AnalysisMap";
import { AnalysisMetricCard } from "./AnalysisMetricCard";
import { AnalysisNavigation } from "./AnalysisNavigation";
import { AnalysisOverview } from "./AnalysisOverview";
import { AnalysisRunProgress } from "./AnalysisRunProgress";
import { AnalysisStatusBar } from "./AnalysisStatusBar";
import { AnalysisToolbar } from "./AnalysisToolbar";

/** Three.js is only downloaded when the 3D preview is first opened. */
const AnalysisCityPreview = lazy(() => import("./AnalysisCityPreview").then((m) => ({ default: m.AnalysisCityPreview })));

type PanelId = "nav" | "inspector";

/**
 * Environmental & Urban Analysis workspace — /app/analysis[?projectId=<id>&category=<id>].
 *
 *   toolbar
 *   [ categories | visualization (overview / analysis map / 3D preview) | details ]
 *   status bar
 *
 * The category navigation docks at lg, the details panel at xl; below those
 * breakpoints both become drawers over the visualization. Phones get a
 * bottom bar with the panel triggers and the map controls.
 */
export function AnalysisWorkspace() {
  const [params, setParams] = useSearchParams();
  const projectId = params.get("projectId");
  const urlCategory = params.get("category");

  const [projects, setProjects] = useState<AnalysisProjectSummary[]>([]);
  useEffect(() => {
    let cancelled = false;
    getAnalysisProjects().then((list) => {
      if (cancelled) return;
      const last = getLastAnalyzedProject();
      setProjects(last ? [...list].sort((a, b) => Number(b.id === last) - Number(a.id === last)) : list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const state = useAnalysisState(projectId, isCategoryId(urlCategory) ? urlCategory : null);
  const ready = state.load.status === "ready" && !!state.data;
  const map = useMapView(state.data?.world ?? null, state.data?.siteBounds ?? null, projectId);

  // keep ?category= in sync so a refresh restores the exact view (replace, not push)
  useEffect(() => {
    if (!projectId) return;
    const current = params.get("category");
    const wanted = state.activeCategory === "overview" ? null : state.activeCategory;
    if (current === wanted) return;
    const next = new URLSearchParams(params);
    if (wanted) next.set("category", wanted);
    else next.delete("category");
    setParams(next, { replace: true });
  }, [projectId, state.activeCategory, params, setParams]);

  const projectName = useMemo(() => {
    if (state.data?.projectName) return state.data.projectName;
    const p = projects.find((x) => x.id === projectId);
    if (p) return p.name;
    if (projectId) return projectId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return "Analysis";
  }, [projects, projectId, state.data]);

  // --- panels ---------------------------------------------------------------------------------
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  const togglePanel = useCallback((p: PanelId) => setOpenPanel((cur) => (cur === p ? null : p)), []);
  const closePanel = useCallback(() => setOpenPanel(null), []);
  useEffect(() => setOpenPanel(null), [projectId]);

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
      if (!state.result) return;
      const artifact = buildExport(state.result, format);
      const ok = downloadArtifact(artifact);
      setExportNotice(ok ? `Downloaded ${artifact.filename}` : "Export prepared (download unavailable here)");
    },
    [state.result]
  );

  useEffect(() => {
    const prev = document.title;
    document.title = `${projectId ? `${projectName} · ` : ""}Analysis · UrbanForma`;
    return () => {
      document.title = prev;
    };
  }, [projectId, projectName]);

  // --- keyboard shortcuts -----------------------------------------------------------------
  const { selectArea, requestCamera, setCompareOpen, compareOpen, viewMode, activeCategory } = state;
  useEffect(() => {
    if (!ready) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") {
        if (document.activeElement?.closest('[role="menu"], [aria-haspopup="menu"][aria-expanded="true"]')) return;
        if (openPanel) setOpenPanel(null);
        else if (compareOpen) setCompareOpen(false);
        else selectArea(null);
        return;
      }
      if (openPanel || activeCategory === "overview") return;
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
  }, [ready, openPanel, compareOpen, viewMode, activeCategory, map, selectArea, requestCamera, setCompareOpen]);

  const running = state.analysisStatus === "running";
  const toolbar = (
    <AnalysisToolbar
      projects={projects}
      projectId={projectId}
      projectName={projectName}
      ready={ready}
      running={running}
      mode={state.mode}
      onMode={state.setMode}
      viewMode={state.viewMode}
      onViewMode={state.setViewMode}
      onRun={state.startRun}
      compareOpen={state.compareOpen}
      onToggleCompare={() => state.setCompareOpen(!state.compareOpen)}
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

  const isOverview = state.activeCategory === "overview";
  const category = getCategory(state.activeCategory);
  const headlineMetric = state.categoryMetrics[0] ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      {toolbar}

      <div className="relative grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_320px]">
        {/* left: categories (docked lg+) */}
        <div className="hidden min-h-0 border-r border-line bg-white lg:block">{ready ? <AnalysisNavigation state={state} idPrefix="nav-dock" /> : <PanelSkeleton title="Analysis" />}</div>

        {/* centre */}
        <div className="flex min-h-0 min-w-0 flex-col">
          {/* mobile mode strip (the toolbar hides the mode tabs below md) */}
          {ready && <MobileCategoryStrip active={state.activeCategory} onSelect={state.setCategory} />}

          <div className="relative min-h-0 flex-1">
            {!ready ? (
              <SpatialLoading label="Loading analysis…" />
            ) : isOverview ? (
              <AnalysisOverview state={state} />
            ) : (
              <>
                {state.viewMode === "2d" ? (
                  <AnalysisMap state={state} map={map} />
                ) : (
                  <Suspense fallback={<SpatialLoading label="Loading 3D preview…" />}>
                    <AnalysisCityPreview state={state} />
                  </Suspense>
                )}

                {/* category headline card (top-left, under the north arrow) */}
                <div className="pointer-events-none absolute left-3 top-16 hidden w-[260px] md:block">
                  <div className="pointer-events-auto rounded-2xl border border-line bg-white/95 p-3 shadow-soft">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                        <category.icon size={15} />
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate text-[13px] font-extrabold text-ink">{category.label}</h2>
                        <p className="truncate text-[11px] text-muted">{category.blurb}</p>
                      </div>
                    </div>
                    {headlineMetric && (
                      <div className="mt-2">
                        <AnalysisMetricCard metric={headlineMetric} dense selected={state.selectedMetric?.id === headlineMetric.id} onSelect={(m) => state.selectMetric(m.id)} />
                      </div>
                    )}
                  </div>
                </div>

                {/* legend (bottom-right) */}
                {state.activeOverlay && (
                  <div className="pointer-events-none absolute bottom-3 right-3 hidden w-[220px] md:block">
                    <AnalysisLegend overlay={state.activeOverlay} compact showFocus={!!state.focusZone && !state.selectedArea} className="pointer-events-auto" />
                  </div>
                )}

                {/* view controls (top-right) */}
                <div className="pointer-events-none absolute right-3 top-3 hidden md:block">
                  <div className="pointer-events-auto">
                    <ViewControls state3d={state.viewMode === "3d"} onZoomIn={map.zoomIn} onZoomOut={map.zoomOut} onPreset={state.requestCamera} />
                  </div>
                </div>
              </>
            )}

            {/* run progress */}
            {ready && state.run && <AnalysisRunProgress run={state.run} onDismiss={state.dismissRun} onRetry={state.startRun} />}

            {/* compare */}
            {ready && state.compareOpen && (
              <div className="absolute inset-0 z-10 grid place-items-center overflow-y-auto bg-ink/20 p-3 sm:p-6" onClick={(e) => e.target === e.currentTarget && state.setCompareOpen(false)}>
                <AnalysisCompare rows={state.comparison} projectName={projectName} onClose={() => state.setCompareOpen(false)} />
              </div>
            )}

            {/* drawers */}
            <PanelDrawer open={openPanel === "nav"} onClose={closePanel} label="Analysis categories" side="left" hideAt="lg">
              {ready && <AnalysisNavigation state={state} onClose={closePanel} idPrefix="nav-drawer" />}
            </PanelDrawer>
            <PanelDrawer open={openPanel === "inspector"} onClose={closePanel} label="Details" side="right" hideAt="xl">
              {ready && <AnalysisInspector state={state} onClose={closePanel} idPrefix="inspector-drawer" />}
            </PanelDrawer>
          </div>

          {/* mobile: compact legend + metric strip for the analysis map */}
          {ready && !isOverview && (
            <div className="shrink-0 border-t border-line bg-white md:hidden">
              <div className="flex gap-2 overflow-x-auto px-3 py-2" aria-label={`${category.label} metrics`}>
                {state.categoryMetrics.slice(0, 4).map((m) => (
                  <div key={m.id} className="w-[200px] shrink-0">
                    <AnalysisMetricCard
                      metric={m}
                      dense
                      selected={state.selectedMetric?.id === m.id}
                      onSelect={(x) => {
                        state.selectMetric(x.id);
                        setOpenPanel("inspector");
                      }}
                    />
                  </div>
                ))}
              </div>
              {state.activeOverlay && (
                <div className="px-3 pb-2">
                  <AnalysisLegend overlay={state.activeOverlay} compact showFocus={!!state.focusZone && !state.selectedArea} className="shadow-none" />
                </div>
              )}
            </div>
          )}

          {/* phone bottom bar */}
          {ready && (
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line bg-white px-2 py-1.5 lg:hidden" aria-label="Analysis controls">
              <div className="flex items-center gap-0.5">
                <IconButton icon={LayoutGrid} label="Analysis categories" size="sm" onClick={() => togglePanel("nav")} active={openPanel === "nav"} aria-expanded={openPanel === "nav"} />
                <IconButton icon={SlidersHorizontal} label="Details" size="sm" onClick={() => togglePanel("inspector")} active={openPanel === "inspector"} aria-expanded={openPanel === "inspector"} className="xl:hidden" />
              </div>
              {!isOverview && <ViewControls state3d={state.viewMode === "3d"} onZoomIn={map.zoomIn} onZoomOut={map.zoomOut} onPreset={state.requestCamera} compact />}
            </div>
          )}
        </div>

        {/* right: details (docked xl+) */}
        <div className="hidden min-h-0 border-l border-line bg-white xl:block">{ready ? <AnalysisInspector state={state} idPrefix="inspector-dock" /> : <PanelSkeleton title="Details" />}</div>
      </div>

      <AnalysisStatusBar state={state} map={map} />
    </div>
  );
}

// ---------------------------------------------------------------------------

const btn = "grid h-9 w-9 place-items-center text-muted transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/20";

function ViewControls({ state3d, onZoomIn, onZoomOut, onPreset, compact = false }: { state3d: boolean; onZoomIn: () => void; onZoomOut: () => void; onPreset: (p: "fit" | "reset" | "top" | "perspective") => void; compact?: boolean }) {
  const groupCls = compact ? "flex items-center divide-x divide-line overflow-hidden rounded-xl border border-line bg-white shadow-soft" : "flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line bg-white shadow-soft";
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

/** Horizontal category chips for < lg screens (the docked nav is hidden there). */
function MobileCategoryStrip({ active, onSelect }: { active: AnalysisCategoryId; onSelect: (c: AnalysisCategoryId) => void }) {
  return (
    <div className="shrink-0 border-b border-line bg-white lg:hidden">
      <div role="tablist" aria-label="Analysis categories" className="flex gap-1.5 overflow-x-auto px-3 py-2">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const isActive = c.id === active;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(c.id)}
              className={[
                "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[12px] font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                isActive ? "border-primary bg-primary/10 text-primary" : "border-line bg-white text-muted hover:text-ink",
              ].join(" ")}
            >
              <Icon size={14} aria-hidden="true" />
              {c.id === "overview" ? "Overview" : c.label}
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
