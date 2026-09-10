import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bookmark, Check, Columns2, Compass, Download, Info, Layers, Link2, Presentation, SlidersHorizontal, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { IconButton } from "../../../components/ui/IconButton";
import { useFullscreen } from "../hooks/useFullscreen";
import { useMapView } from "../hooks/useMapView";
import { useSlideshow } from "../hooks/useSlideshow";
import { useVisualizationState, type Camera2d } from "../hooks/useVisualizationState";
import { captureSvg, capturePng, releaseCapture, safeFileName, type CaptureResult } from "../lib/capture";
import { getLastVisualizedProject, getVisualizationProjects, type VisualizationProjectSummary } from "../services/visualization.service";
import type { CityViewHandle } from "./3d/CityView";
import { LayerPanel } from "./LayerPanel";
import { PresentMode } from "./PresentMode";
import { PresentationSettings } from "./PresentationSettings";
import { PresentationStoryboard } from "./PresentationStoryboard";
import { PresentationHeader, SlideNavigation } from "./PresentationView";
import { SceneControls } from "./SceneControls";
import { SiteContextDrawer } from "./SiteContextDrawer";
import { SpatialSearch } from "./SpatialSearch";
import { SpatialStatusBar } from "./SpatialStatusBar";
import { ViewControls } from "./ViewControls";
import { ViewManager, tabForPanel, type SideTab } from "./ViewManager";
import { NoProjectSelected, NoSpatialObjects, ProjectNotFound, SpatialError, SpatialLoading } from "./VisualizationStates";
import { VisualizationToolbar, type PanelId } from "./VisualizationToolbar";
import { VisualizationViewport } from "./VisualizationViewport";
import { WorkspaceDrawer } from "./WorkspaceDrawer";
import { PanelHeader } from "./controls";

/**
 * Visualization & Presentation workspace — /app/visualization[?projectId=<id>].
 *
 * Toolbar · [layers | viewport | side panel] · status bar. ONE viewport (2-D
 * map or 3-D city) is shared by Explore, Present and the slide show; the
 * modes only change the chrome around it. Explore docks the layer panel (lg+)
 * and the tabbed side panel (xl+); Present docks the storyboard instead. Below
 * those breakpoints everything becomes a drawer / bottom sheet.
 */
export function VisualizationWorkspace() {
  const [params, setParams] = useSearchParams();
  const projectId = params.get("projectId");

  const [projects, setProjects] = useState<VisualizationProjectSummary[]>([]);
  useEffect(() => {
    let cancelled = false;
    getVisualizationProjects().then((list) => {
      if (cancelled) return;
      const last = getLastVisualizedProject();
      setProjects(last ? [...list].sort((a, b) => Number(b.id === last) - Number(a.id === last)) : list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const state = useVisualizationState(projectId);
  const ready = state.load.status === "ready" && !!state.data;
  const map = useMapView(state.data?.world ?? null, state.data?.siteBounds ?? null, projectId);
  const camera2d = useMemo<Camera2d>(() => ({ center: map.center, scale: map.view.scale }), [map.center, map.view.scale]);
  const show = useSlideshow(state);
  const present = state.mode === "present";

  const project = useMemo(() => projects.find((x) => x.id === projectId) ?? null, [projects, projectId]);
  const projectName = useMemo(() => {
    if (state.data?.projectName) return state.data.projectName;
    if (project) return project.name;
    if (projectId) return projectId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return "Visualization";
  }, [project, projectId, state.data]);

  // --- panels / fullscreen ----------------------------------------------------------------------
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  const [sideTab, setSideTab] = useState<SideTab>("scene");
  const togglePanel = useCallback((p: PanelId) => {
    const t = tabForPanel(p);
    if (t) setSideTab(t);
    setOpenPanel((cur) => (cur === p ? null : p));
  }, []);
  const closePanel = useCallback(() => setOpenPanel(null), []);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const fullscreen = useFullscreen(root);
  const docked = !fullscreen.active;
  const [activeAnnotation, setActiveAnnotation] = useState<string | null>(null);
  const cityRef = useRef<CityViewHandle>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // mode switch: default side tab per mode, close transient panels
  useEffect(() => {
    setSideTab(present ? "storyboard" : "scene");
    setOpenPanel(null);
    if (present) state.select(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [present]);

  const switchProject = useCallback(
    (id: string) => {
      setParams({ projectId: id });
      setOpenPanel(null);
    },
    [setParams]
  );

  useEffect(() => {
    const prev = document.title;
    document.title = `${projectId ? `${projectName} · ` : ""}Visualization · UrbanForma`;
    return () => {
      document.title = prev;
    };
  }, [projectId, projectName]);

  // --- notices ---------------------------------------------------------------------------------------
  const [notice, setNotice] = useState<{ text: string; token: number } | null>(null);
  const noticeTimer = useRef<number | null>(null);
  const onNotice = useCallback((text: string) => {
    setNotice((n) => ({ text, token: (n?.token ?? 0) + 1 }));
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3200);
  }, []);
  useEffect(() => () => void (noticeTimer.current && window.clearTimeout(noticeTimer.current)), []);

  // --- capture / share (local demo) ---------------------------------------------------------------
  const [capture, setCapture] = useState<CaptureResult | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [share, setShare] = useState<{ url: string; copied: boolean } | null>(null);
  useEffect(() => () => releaseCapture(capture), [capture]);
  const onCapture = useCallback(() => {
    if (!ready) return;
    setCapturing(true);
    // let the current frame settle before reading the canvas
    window.requestAnimationFrame(() => {
      const name = safeFileName(projectName, state.selectedScenarioOption?.name ?? "current-plan", state.viewMode, state.lastPreset);
      let result: CaptureResult | null = null;
      if (state.viewMode === "3d") {
        const host = viewportRef.current;
        result = capturePng(cityRef.current?.capture() ?? null, name, { width: host?.clientWidth ?? 0, height: host?.clientHeight ?? 0 });
      } else {
        result = captureSvg(viewportRef.current, name);
      }
      setCapture((prev) => {
        releaseCapture(prev);
        return result;
      });
      setCapturing(false);
      onNotice(result ? "View captured" : "Capture unavailable for this view in this browser");
    });
  }, [ready, projectName, state.selectedScenarioOption, state.viewMode, state.lastPreset, onNotice]);

  const onShare = useCallback(() => {
    if (!projectId) return;
    const url = new URL(window.location.href);
    url.searchParams.set("projectId", projectId);
    url.searchParams.set("mode", state.mode);
    if (state.selectedScenario) url.searchParams.set("scenario", state.selectedScenario);
    else url.searchParams.delete("scenario");
    setShare({ url: url.toString(), copied: false });
  }, [projectId, state.mode, state.selectedScenario]);

  // --- global shortcuts (viewports handle their own when focused and stop propagation) ---
  useEffect(() => {
    if (!ready || show.active) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "/" && !present) {
        e.preventDefault();
        setOpenPanel("search");
        return;
      }
      if (e.key === "Escape") {
        if (document.activeElement?.closest('[role="menu"], [aria-haspopup="menu"][aria-expanded="true"], [role="alertdialog"], [role="dialog"]')) return;
        if (share) setShare(null);
        else if (capture) setCapture(null);
        else if (openPanel) setOpenPanel(null);
        else if (activeAnnotation) setActiveAnnotation(null);
        else state.select(null);
        return;
      }
      if (openPanel || share || capture) return;
      const k = e.key.toLowerCase();
      if (k === "f") state.requestCamera("fit");
      else if (k === "r" || e.key === "0") state.requestCamera("reset");
      else if (state.viewMode === "3d" && k === "t") state.requestCamera("top");
      else if (state.viewMode === "3d" && k === "p") state.requestCamera("perspective");
      else if (state.viewMode === "2d" && (e.key === "+" || e.key === "=")) map.zoomIn();
      else if (state.viewMode === "2d" && (e.key === "-" || e.key === "_")) map.zoomOut();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, openPanel, state, map, present, show.active, share, capture, activeAnnotation]);

  // --- toolbar -----------------------------------------------------------------------------------
  const toolbar = !show.active && (
    <VisualizationToolbar
      projects={projects}
      projectId={projectId}
      projectName={projectName}
      ready={ready}
      mode={state.mode}
      onMode={state.setMode}
      viewMode={state.viewMode}
      onViewMode={state.setViewMode}
      basemap={state.basemap}
      onBasemap={state.setBasemap}
      openPanel={openPanel}
      onTogglePanel={togglePanel}
      onCapture={onCapture}
      capturing={capturing}
      onShare={onShare}
      fullscreen={fullscreen.active}
      fullscreenSupported={fullscreen.supported}
      onToggleFullscreen={fullscreen.toggle}
      onSwitchProject={switchProject}
      panelsDocked={docked}
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

  const empty = ready && state.planFeatureCount === 0;
  const selected = state.selectedObject;
  const ps = state.presentation.presentation?.settings;
  const shownAnnotations = present ? (ps?.showAnnotations ? state.annotations : []) : state.annotations;
  const annotationEditor = !present && state.viewMode === "2d" ? { activeId: activeAnnotation, onPick: setActiveAnnotation, onMove: (id: string, position: { x: number; y: number }) => state.presentation.updateAnnotation(id, { position }) } : undefined;
  const sidePanel = (idPrefix: string, onClose?: () => void) => <ViewManager state={state} camera2d={camera2d} tab={sideTab} onTab={setSideTab} onClose={onClose} onNotice={onNotice} onPlay={show.start} activeAnnotation={activeAnnotation} onActiveAnnotation={setActiveAnnotation} idPrefix={idPrefix} />;
  // grid: Explore = layers (lg) + side panel (xl); Present = storyboard (lg) on the right only
  const gridCols = !docked || show.active ? "" : present ? "lg:grid-cols-[minmax(0,1fr)_320px]" : "lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_340px]";

  return (
    <div ref={setRoot} className="flex h-full min-h-0 flex-col bg-canvas">
      {toolbar}
      {show.active && <PresentationHeader state={state} show={show} root={root} />}

      <div className={["relative grid min-h-0 flex-1 grid-cols-1", gridCols].join(" ")}>
        {/* left: layers (Explore, docked lg+) */}
        {docked && !present && !show.active && <div className="hidden min-h-0 border-r border-line bg-white lg:block">{ready ? <LayerPanel state={state} idPrefix="layers-dock" /> : <PanelSkeleton title="Layers" />}</div>}

        {/* centre: viewport column */}
        <div className="flex min-h-0 min-w-0 flex-col">
          <div ref={viewportRef} className="relative min-h-0 flex-1">
            {!ready ? <SpatialLoading /> : <VisualizationViewport state={state} map={map} cityRef={cityRef} presentation={present} annotations={shownAnnotations} annotationEditor={annotationEditor} />}

            {/* Present chrome */}
            {ready && present && <PresentMode state={state} location={project?.location} footer={show.active ? <SlideNavigation show={show} /> : undefined} caption={show.active && show.slide ? { index: show.index + 1, total: show.total, title: show.slide.title, description: show.slide.description } : null} />}

            {/* view controls (Explore desktop) */}
            {ready && !present && (
              <div className="pointer-events-none absolute inset-0 hidden md:block">
                <div className="pointer-events-auto absolute right-3 top-3">
                  <ViewControls state={state} map={map} />
                </div>
              </div>
            )}

            {ready && empty && !present && <NoSpatialObjects projectId={projectId} />}

            {/* selection chip when the inspector is not visible */}
            {ready && !present && selected && !(openPanel === "inspector" || (docked && sideTab === "inspector")) && (
              <div className={`absolute bottom-3 right-3 ${docked && sideTab === "inspector" ? "xl:hidden" : ""}`}>
                <button
                  type="button"
                  onClick={() => togglePanel("inspector")}
                  className="flex max-w-[min(420px,calc(100vw_-_9rem))] items-center gap-2 rounded-full border border-line bg-white/95 py-1.5 pl-3.5 pr-2 text-left shadow-float focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                  aria-label={`Inspect ${selected.type === "building" ? `Building ${selected.name}` : selected.name}`}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <span className="min-w-0 truncate text-[13px] font-bold text-ink">{selected.type === "building" ? `Building ${selected.name}` : selected.name}</span>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11.5px] font-bold text-primary">Inspect</span>
                </button>
              </div>
            )}

            {/* notice toast (outside mode-only blocks) */}
            {notice && (
              <div key={notice.token} className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
                <div role="status" className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-line bg-white/95 px-3.5 py-1.5 text-[12.5px] font-bold text-ink shadow-float animate-rise-in motion-reduce:animate-none">
                  <Check size={14} className="shrink-0 text-success" aria-hidden="true" />
                  <span className="truncate">{notice.text}</span>
                </div>
              </div>
            )}

            {/* search popover */}
            {ready && openPanel === "search" && !present && (
              <div className="absolute left-1/2 top-3 z-20 w-[min(520px,calc(100%_-_1.5rem))] -translate-x-1/2" style={{ maxHeight: "calc(100% - 1.5rem)" }}>
                <SpatialSearch state={state} onClose={closePanel} />
              </div>
            )}

            {/* capture preview */}
            {capture && (
              <div className="absolute inset-0 z-30 grid place-items-center bg-ink/30 p-3" role="presentation" onClick={() => setCapture(null)}>
                <div role="dialog" aria-modal="true" aria-label="Captured view" className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-white shadow-float" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
                    <p className="text-[13.5px] font-bold text-ink">View captured</p>
                    <button type="button" onClick={() => setCapture(null)} aria-label="Close capture preview" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="bg-surface-2 p-3">
                    <img src={capture.url} alt={`Snapshot of the ${state.viewMode === "3d" ? "3D city" : "2D plan"} view`} className="mx-auto max-h-[min(50vh,360px)] w-auto max-w-full rounded-lg border border-line bg-white" />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <p className="text-[11.5px] text-muted">
                      {capture.kind.toUpperCase()} · {capture.width} × {capture.height} · local snapshot, nothing uploaded
                    </p>
                    <a href={capture.url} download={capture.fileName} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[12.5px] font-bold text-white hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30">
                      <Download size={14} aria-hidden="true" /> Download
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* share preview (demo) */}
            {share && (
              <div className="absolute inset-0 z-30 grid place-items-center bg-ink/30 p-3" role="presentation" onClick={() => setShare(null)}>
                <div role="dialog" aria-modal="true" aria-labelledby="share-title" className="w-full max-w-md rounded-2xl border border-line bg-white p-4 shadow-float" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p id="share-title" className="text-[14px] font-bold text-ink">
                        Share Preview
                      </p>
                      <p className="mt-0.5 text-[12px] text-muted">Demo link to this project's visualization in the current mode. Sharing outside this demo is not available yet.</p>
                    </div>
                    <button type="button" onClick={() => setShare(null)} aria-label="Close share preview" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 py-2">
                    <Link2 size={14} className="shrink-0 text-muted" aria-hidden="true" />
                    <input readOnly value={share.url} aria-label="Preview link" onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-ink focus:outline-none" />
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setShare(null)}>
                      Close
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const done = () => {
                          setShare((s) => (s ? { ...s, copied: true } : s));
                          onNotice("Preview link copied");
                        };
                        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(share.url).then(done, done);
                        else done();
                      }}
                    >
                      {share.copied ? "Copied" : "Copy link"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* drawers */}
            <WorkspaceDrawer open={openPanel === "layers"} onClose={closePanel} label="Layers" side="left" hideAt={docked && !present ? "lg" : undefined}>
              {ready && <LayerPanel state={state} onClose={closePanel} idPrefix="layers-drawer" />}
            </WorkspaceDrawer>
            <WorkspaceDrawer open={openPanel === "inspector" || openPanel === "scene" || openPanel === "views" || openPanel === "compare" || (openPanel === "storyboard" && !present)} onClose={closePanel} label={present ? "Presentation panels" : "Workspace panels"} side="right" hideAt={docked && !present ? "xl" : undefined}>
              {ready && sidePanel("side-drawer", closePanel)}
            </WorkspaceDrawer>
            <WorkspaceDrawer open={openPanel === "storyboard" && present} onClose={closePanel} label="Storyboard" side="bottom" hideAt={docked ? "lg" : undefined}>
              {ready && <PresentationStoryboard state={state} camera2d={camera2d} onClose={closePanel} onPlay={show.start} onNotice={onNotice} horizontal idPrefix="storyboard-sheet" />}
            </WorkspaceDrawer>
            <WorkspaceDrawer open={openPanel === "settings"} onClose={closePanel} label={present ? "Presentation settings" : "Scene settings"} side="right">
              {ready && (
                <div className="flex h-full min-h-0 flex-col">
                  <PanelHeader id="settings-drawer-title" title={present ? "Presentation settings" : "Scene settings"} onClose={closePanel} closeLabel="Close settings" />
                  <div className="min-h-0 flex-1 overflow-y-auto p-4">{present ? <PresentationSettings state={state} idPrefix="pres-drawer" /> : <SceneControls state={state} idPrefix="scene-drawer" initialOpen="settings" embedded />}</div>
                </div>
              )}
            </WorkspaceDrawer>
            <WorkspaceDrawer open={openPanel === "context"} onClose={closePanel} label="Site context" side="right">
              {ready && <SiteContextDrawer state={state} onClose={closePanel} />}
            </WorkspaceDrawer>
          </div>

          {/* phone / tablet-portrait bottom controls */}
          {ready && !show.active && (
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line bg-white px-2 py-1.5 md:hidden" aria-label="Visualization controls">
              <div className="flex min-w-0 items-center gap-0.5">
                <div role="tablist" aria-label="Workspace mode" className="mr-1 flex shrink-0 items-center gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5 sm:hidden">
                  {(["explore", "present"] as const).map((m) => (
                    <button key={m} type="button" role="tab" aria-selected={state.mode === m} onClick={() => state.setMode(m)} className={`h-7 rounded-md px-2 text-[11.5px] font-bold capitalize focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 ${state.mode === m ? "bg-white text-primary shadow-soft" : "text-muted"}`}>
                      {m}
                    </button>
                  ))}
                </div>
                {present ? (
                  <>
                    <IconButton icon={Presentation} label="Storyboard" size="sm" onClick={() => togglePanel("storyboard")} active={openPanel === "storyboard"} aria-expanded={openPanel === "storyboard"} />
                    <IconButton icon={Bookmark} label="Saved views" size="sm" onClick={() => togglePanel("views")} active={openPanel === "views"} aria-expanded={openPanel === "views"} />
                    <IconButton icon={Columns2} label="Before / After" size="sm" onClick={() => togglePanel("compare")} active={openPanel === "compare"} aria-expanded={openPanel === "compare"} />
                  </>
                ) : (
                  <>
                    <IconButton icon={Layers} label="Layers" size="sm" onClick={() => togglePanel("layers")} active={openPanel === "layers"} aria-expanded={openPanel === "layers"} />
                    <IconButton icon={Compass} label="Scene controls" size="sm" onClick={() => togglePanel("scene")} active={openPanel === "scene"} aria-expanded={openPanel === "scene"} />
                    <IconButton icon={SlidersHorizontal} label="Inspector" size="sm" onClick={() => togglePanel("inspector")} active={openPanel === "inspector"} aria-expanded={openPanel === "inspector"} />
                    <IconButton icon={Bookmark} label="Saved views" size="sm" onClick={() => togglePanel("views")} active={openPanel === "views"} aria-expanded={openPanel === "views"} />
                    <IconButton icon={Info} label="Site context" size="sm" onClick={() => togglePanel("context")} active={openPanel === "context"} aria-expanded={openPanel === "context"} className="hidden sm:grid" />
                  </>
                )}
              </div>
              <ViewControls state={state} map={map} compact />
            </div>
          )}
        </div>

        {/* right: Explore side panel (docked xl+) / Present storyboard (docked lg+) */}
        {docked && !show.active && (present ? <div className="hidden min-h-0 border-l border-line bg-white lg:block">{ready ? sidePanel("side-dock") : <PanelSkeleton title="Presentation" />}</div> : <div className="hidden min-h-0 border-l border-line bg-white xl:block">{ready ? sidePanel("side-dock") : <PanelSkeleton title="Scene" />}</div>)}
      </div>

      {!show.active && <SpatialStatusBar state={state} map={map} />}
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
