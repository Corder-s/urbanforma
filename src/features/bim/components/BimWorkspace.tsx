import { useUnitPreferences } from "../../settings/hooks/useUnitPreferences";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Check, Filter, Flag, Info, Layers, Layers3, SlidersHorizontal, X } from "lucide-react";
import { IconButton } from "../../../components/ui/IconButton";
import { PanelDrawer } from "../../../components/ui/PanelDrawer";
import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../optimization/components/ConfirmDialog";
import { NoProjectSelected, ProjectNotFound, SpatialError, SpatialLoading } from "../../visualization/components/VisualizationStates";
import { ViewControls } from "../../visualization/components/ViewControls";
import { MODES } from "../data/bim.data";
import { useBimWorkspace } from "../hooks/useBimWorkspace";
import type { UploadResult } from "../services/bim.service";
import type { BimElement, BimIssue, BimMode } from "../types/bim.types";
import { BimDashboard } from "./BimDashboard";
import { BimStatusBar } from "./BimStatusBar";
import { BimToolbar } from "./BimToolbar";
import { BimViewport } from "./BimViewport";
import { CoordinationPanel } from "./CoordinationPanel";
import { FiltersPanel } from "./FiltersPanel";
import { BimLayersPanel } from "./BimLayersPanel";
import { ImportDialog } from "./ImportDialog";
import { IssueDialog } from "./IssueDialog";
import { IssueInspector } from "./IssueInspector";
import { IssuesPanel } from "./IssuesPanel";
import { NoModelReady } from "./BimStates";
import { ModelTree } from "./ModelTree";
import { PropertiesInspector } from "./PropertiesInspector";
import { VersionsPanel } from "./VersionsPanel";
import { layerCounts } from "../lib/bimModel";

type PanelId = "tree" | "side" | "versions" | "issues" | null;
type SideTab = "properties" | "filters" | "layers";
type PendingDelete = { kind: "model"; id: string; name: string } | { kind: "issue"; id: string; name: string } | null;

/**
 * BIM Integration & Model Coordination — /app/bim[?projectId=<id>&elementId=<id>].
 *
 *   toolbar (back · project · Overview / Model / Coordination / Issues · scene · 2D/3D · import)
 *   [ model tree | viewport | properties · filters · layers ]   — Model mode
 *   [ models & versions | coordination checks + quantity links ] — Coordination mode
 *   [ issues | issue details ]                                   — Issues mode
 *   status bar
 *
 * Composition only: the dataset, camera, GIS layers and selection come from the
 * shared visualization state (Step 12/15), models and elements from
 * `useBimModels`, filters from `useBimFilters`, issues from `useBimIssues` and
 * the coordination evidence from the planning / analysis / optimization /
 * reports services. This file owns no data of its own.
 */
export function BimWorkspace() {
  // Subscribe to the workspace unit preference so every formatted measurement
  // in this module re-renders when the user switches systems (Settings → Units).
  useUnitPreferences();
  const w = useBimWorkspace();
  const { prefs, models, filters, issues, coordination, selection, viz, sceneState, map, inspect } = w;

  const [openPanel, setOpenPanel] = useState<PanelId>(null);
  const [sideTab, setSideTab] = useState<SideTab>("properties");
  const [importOpen, setImportOpen] = useState(false);
  const [importResult, setImportResult] = useState<UploadResult | null>(null);
  const [issueDialog, setIssueDialog] = useState<{ open: boolean; issue: BimIssue | null; element: BimElement | null }>({ open: false, issue: null, element: null });
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [notice, setNotice] = useState<{ text: string; tone: "success" | "info" } | null>(null);
  const [syncing, setSyncing] = useState(false);

  const mode = prefs.prefs.mode;
  const dataset = viz.data;
  const ready = viz.load.status === "ready" && !!dataset && models.status === "ready";
  const index = models.index;
  const elementCount = index?.elements.length ?? 0;
  const counts = useMemo(() => (index ? layerCounts(index) : null), [index]);
  const shownCount = filters.results.length;
  const selectedIssue = useMemo(() => issues.issues.find((i) => i.id === selectedIssueId) ?? null, [issues.issues, selectedIssueId]);

  const closePanel = useCallback(() => setOpenPanel(null), []);
  const togglePanel = useCallback((id: Exclude<PanelId, null>) => setOpenPanel((p) => (p === id ? null : id)), []);
  const prefsSetMode = prefs.setMode;
  const setMode = useCallback(
    (m: BimMode) => {
      prefsSetMode(m);
      setOpenPanel(null);
    },
    [prefsSetMode]
  );

  // Escape leaves the 360° inspection first, then clears the selection (the tree,
  // drawers and dialogs handle their own). Deps are the stable callbacks, not the
  // API objects, so the listener is not re-attached on every render.
  const { selectedElementId, clearSelection } = selection;
  const inspectActive = inspect.active;
  const inspectExit = inspect.exit;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (inspectActive) {
        inspectExit();
        return;
      }
      if (selectedElementId) clearSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedElementId, clearSelection, inspectActive, inspectExit]);

  /** Transient confirmation. `info` is used for honest "this did not work" notes. */
  const notify = useCallback((text: string, tone: "success" | "info" = "success") => {
    setNotice({ text, tone });
    window.setTimeout(() => setNotice((n) => (n?.text === text ? null : n)), 4200);
  }, []);

  const onSync = useCallback(() => {
    setSyncing(true);
    // Let the button show its loading state before the synchronous derivation.
    window.setTimeout(() => {
      const ok = models.syncWithGeometry();
      setSyncing(false);
      if (ok) notify("Model re-derived from the current project geometry.");
      else notify("Nothing to re-derive — open a model first.", "info");
    }, 0);
  }, [models, notify]);

  const onUpload = useCallback(
    async (file: File) => {
      const result = await models.upload(file);
      if (!result) return;
      setImportResult(result);
      if (result.model.status === "failed") {
        notify("File registered — it could not be processed (no BIM backend connected).", "info");
      } else {
        notify("File registered.");
      }
    },
    [models, notify]
  );

  const showInModel = useCallback(
    (elementId: string) => {
      selection.selectElement(elementId, { focus: true });
      prefs.setMode("model");
      setSideTab("properties");
      setOpenPanel(null);
    },
    [selection, prefs]
  );

  const openIssueFor = useCallback(
    (element: BimElement | null) => setIssueDialog({ open: true, issue: null, element }),
    []
  );

  const submitIssue = useCallback(
    (input: Parameters<typeof issues.create>[0]) => {
      const editing = issueDialog.issue;
      if (editing) {
        issues.update(editing.id, input);
        notify("Issue updated.");
      } else {
        const created = issues.create(input);
        setSelectedIssueId(created.id);
        prefs.setMode("issues");
        notify("Issue created and stored locally.");
      }
      setIssueDialog({ open: false, issue: null, element: null });
    },
    [issueDialog.issue, issues, notify, prefs]
  );

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "model") {
      models.removeModel(pendingDelete.id);
      notify("Model record removed.");
    } else {
      issues.remove(pendingDelete.id);
      if (selectedIssueId === pendingDelete.id) setSelectedIssueId(null);
      notify("Issue deleted.");
    }
    setPendingDelete(null);
  }, [pendingDelete, models, issues, selectedIssueId, notify]);

  // --- shared chrome ---------------------------------------------------------
  const toolbar = (
    <BimToolbar
      projects={w.projectsLoad.status === "ready" ? w.projectsLoad.projects : []}
      projectId={w.projectId}
      projectName={w.projectName}
      ready={ready}
      mode={mode}
      onMode={setMode}
      viewMode={viz.viewMode}
      onViewMode={viz.setViewMode}
      sceneMode={prefs.prefs.sceneMode}
      onSceneMode={prefs.setSceneMode}
      onImport={() => {
        setImportResult(null);
        setImportOpen(true);
      }}
      onSync={onSync}
      syncing={syncing}
      openIssues={issues.counts.open + issues.counts.inReview}
      treeOpen={openPanel === "tree"}
      onToggleTree={() => togglePanel("tree")}
      inspectorOpen={openPanel === "side"}
      onToggleInspector={() => togglePanel("side")}
      onSwitchProject={w.setProjectId}
      models={models.models}
      activeModel={models.activeModel}
      onSelectModel={models.setActiveModelId}
      onManageVersions={() => setMode("coordination")}
    />
  );

  const modeStrip = (
    <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-line bg-surface px-2 py-1.5 xl:hidden" role="tablist" aria-label="BIM mode">
      {MODES.map((m) => {
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setMode(m.id)}
            title={m.hint}
            className={[
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
              active ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface-2 hover:text-ink",
            ].join(" ")}
          >
            {m.label}
            {m.id === "issues" && issues.counts.open + issues.counts.inReview > 0 && (
              <span className="rounded-full bg-warning/15 px-1.5 text-[10.5px] font-extrabold text-warning tabular-nums">
                {issues.counts.open + issues.counts.inReview}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const statusBar = (
    <BimStatusBar
      model={models.activeModel}
      elementCount={elementCount}
      shownCount={shownCount}
      sceneObjectCount={w.sceneObjectCount}
      selectedElement={selection.selectedElement}
      viewMode={viz.viewMode}
      sceneMode={prefs.prefs.sceneMode}
      scaleLabel={map.scaleLabel}
      coordinateSystem={dataset?.summary.coordinateSystem ?? "Local / Demo"}
      revision={models.revision}
    />
  );

  // --- panels (mounted twice: dock + drawer) ----------------------------------
  const treePanel = (onClose?: () => void) => (
    <ModelTree
      tree={models.tree}
      index={index}
      selectedId={selection.selectedElementId}
      onSelect={(id) => selection.selectElement(id)}
      results={filters.results}
      filtering={filters.activeCount > 0}
      filterCount={filters.activeCount}
      queryInput={filters.queryInput}
      onQueryChange={filters.setQueryInput}
      searching={filters.searching}
      onClearFilters={filters.reset}
      idPrefix={onClose ? "drawer" : "dock"}
      onClose={onClose}
    />
  );

  const sidePanel = (onClose?: () => void) => (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex shrink-0 items-center gap-0.5 border-b border-line bg-surface-2 p-1" role="tablist" aria-label="Inspector panels">
        {(
          [
            { id: "properties", label: "Properties", icon: Box },
            { id: "filters", label: "Filters", icon: Filter },
            { id: "layers", label: "Layers", icon: Layers },
          ] as const
        ).map((t) => {
          const active = sideTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSideTab(t.id)}
              className={[
                "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-[12px] font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                active ? "bg-surface text-primary shadow-soft" : "text-muted hover:text-ink",
              ].join(" ")}
            >
              <t.icon size={14} aria-hidden="true" />
              <span className="hidden sm:inline">{t.label}</span>
              {t.id === "filters" && filters.activeCount > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 text-[10.5px] font-extrabold text-primary tabular-nums">{filters.activeCount}</span>
              )}
            </button>
          );
        })}
        {onClose && <IconButton icon={X} label="Close panel" size="xs" onClick={onClose} className="ml-auto shrink-0" />}
      </div>
      <div className="min-h-0 flex-1">
        {sideTab === "properties" ? (
          <PropertiesInspector
            element={selection.selectedElement}
            index={index}
            model={models.activeModel}
            projectId={w.projectId}
            issues={issues.issues}
            onSelect={(id) => selection.selectElement(id)}
            onFocus={(id) => selection.selectElement(id, { focus: true })}
            onNewIssue={(el) => openIssueFor(el)}
            onOpenIssue={(issueId) => {
              setSelectedIssueId(issueId);
              setMode("issues");
            }}
            idPrefix={onClose ? "drawer" : "dock"}
            onClose={onClose}
          />
        ) : sideTab === "filters" ? (
          <FiltersPanel filters={filters} resultCount={shownCount} totalCount={elementCount} idPrefix={onClose ? "drawer" : "dock"} onClose={onClose} />
        ) : (
          <BimLayersPanel
            layers={prefs.prefs.layers}
            counts={counts ?? { model: 0, buildings: 0, architecture: 0, structure: 0, mep: 0, infrastructure: 0, landscape: 0, context: 0 }}
            onToggle={prefs.toggleLayer}
            onReset={prefs.resetLayers}
            sceneMode={prefs.prefs.sceneMode}
            onSceneMode={prefs.setSceneMode}
            shownCount={shownCount}
            totalCount={elementCount}
            idPrefix={onClose ? "drawer" : "dock"}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );

  // --- states ------------------------------------------------------------------
  if (w.projectsLoad.status === "loading") {
    return (
      <div className="flex h-full min-h-0 flex-col bg-canvas">
        {toolbar}
        <div className="min-h-0 flex-1">
          <SpatialLoading label="Loading BIM projects…" />
        </div>
      </div>
    );
  }
  if (w.projectsLoad.status === "error") {
    return (
      <div className="flex h-full min-h-0 flex-col bg-canvas">
        {toolbar}
        <div className="min-h-0 flex-1">
          <SpatialError message={w.projectsLoad.message} onRetry={w.retryProjects} />
        </div>
      </div>
    );
  }
  if (!w.projectId) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-canvas">
        {toolbar}
        <div className="min-h-0 flex-1">
          <NoProjectSelected projects={w.projectsLoad.projects} onOpen={w.setProjectId} />
        </div>
      </div>
    );
  }
  if (viz.load.status === "not-found") {
    return (
      <div className="flex h-full min-h-0 flex-col bg-canvas">
        {toolbar}
        {modeStrip}
        <div className="min-h-0 flex-1">
          <ProjectNotFound projectId={w.projectId} />
        </div>
      </div>
    );
  }
  if (viz.load.status === "error") {
    return (
      <div className="flex h-full min-h-0 flex-col bg-canvas">
        {toolbar}
        {modeStrip}
        <div className="min-h-0 flex-1">
          <SpatialError message={viz.load.message} onRetry={viz.retry} />
        </div>
      </div>
    );
  }

  const loading = !ready;

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      {toolbar}
      {modeStrip}

      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* transient notice */}
        {notice && (
          <div className="pointer-events-none absolute inset-x-0 top-2 z-30 flex justify-center px-3">
            <p
              role="status"
              className="pointer-events-auto inline-flex max-w-full items-center gap-2 rounded-xl border border-line bg-surface/95 px-3 py-2 text-[12.5px] font-semibold text-ink shadow-float animate-pop motion-reduce:animate-none"
            >
              {notice.tone === "success" ? (
                <Check size={14} className="shrink-0 text-success" aria-hidden="true" />
              ) : (
                <Info size={14} className="shrink-0 text-primary" aria-hidden="true" />
              )}
              <span className="min-w-0 truncate">{notice.text}</span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                aria-label="Dismiss"
                className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
              >
                <X size={12} />
              </button>
            </p>
          </div>
        )}

        {loading ? (
          <SpatialLoading label={models.status === "loading" ? "Loading BIM models…" : "Loading site geometry…"} />
        ) : mode === "overview" ? (
          <BimDashboard
            projectId={w.projectId}
            projectName={w.projectName}
            model={models.activeModel}
            models={models.models}
            quantities={models.quantities}
            index={index}
            tree={models.tree.flatMap((n) => n.children).map((n) => ({ element: n.element, descendants: n.descendants }))}
            issues={issues.issues}
            issueCounts={issues.counts}
            checks={coordination.checks}
            datasetObjects={dataset?.objects.length ?? 0}
            datasetSource={dataset?.source.kind === "demo" ? "demo dataset" : "local plan"}
            siteAreaHa={dataset?.summary.siteAreaHa ?? 0}
            onOpenMode={setMode}
            onSelectElement={showInModel}
            onSelectModel={models.setActiveModelId}
            onImport={() => {
              setImportResult(null);
              setImportOpen(true);
            }}
            onSync={onSync}
            syncing={syncing}
          />
        ) : mode === "coordination" ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)]">
            <div className="hidden min-h-0 border-r border-line xl:block">
              <VersionsPanel
                models={models.models}
                activeModel={models.activeModel}
                versions={models.versions}
                currentVersion={models.currentVersion}
                revision={models.revision}
                elementCount={elementCount}
                onSelectModel={models.setActiveModelId}
                onSelectRevision={models.setRevision}
                onImport={() => {
                  setImportResult(null);
                  setImportOpen(true);
                }}
                onSync={onSync}
                syncing={syncing}
                onRemove={(m) => setPendingDelete({ kind: "model", id: m.id, name: m.name })}
                canRemove={models.canRemove}
              />
            </div>
            <div className="min-h-0">
              <CoordinationPanel
                coordination={coordination}
                projectId={w.projectId}
                onSelectElement={showInModel}
              />
            </div>
            <PanelDrawer open={openPanel === "versions"} onClose={closePanel} label="Models & versions" side="left" hideAt="xl">
              <VersionsPanel
                models={models.models}
                activeModel={models.activeModel}
                versions={models.versions}
                currentVersion={models.currentVersion}
                revision={models.revision}
                elementCount={elementCount}
                onSelectModel={models.setActiveModelId}
                onSelectRevision={models.setRevision}
                onImport={() => {
                  setImportResult(null);
                  setImportOpen(true);
                }}
                onSync={onSync}
                syncing={syncing}
                onRemove={(m) => setPendingDelete({ kind: "model", id: m.id, name: m.name })}
                canRemove={models.canRemove}
                onClose={closePanel}
              />
            </PanelDrawer>
          </div>
        ) : mode === "issues" ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-h-0 lg:border-r lg:border-line">
              <IssuesPanel
                issues={issues.issues}
                counts={issues.counts}
                seeded={issues.seeded}
                selectedId={selectedIssueId}
                onSelect={setSelectedIssueId}
                onNew={() => openIssueFor(selection.selectedElement)}
                onReseed={() => {
                  issues.reseed();
                  notify("Demo findings restored for this model.");
                }}
                onStatusChange={(id, status) => issues.setStatus(id, status)}
              />
            </div>
            <div className="hidden min-h-0 lg:block">
              <IssueInspector
                issue={selectedIssue}
                index={index}
                onStatusChange={(id, status) => issues.setStatus(id, status)}
                onSeverityChange={(id, severity) => issues.update(id, { severity })}
                onEdit={(issue) => setIssueDialog({ open: true, issue, element: null })}
                onDelete={(issue) => setPendingDelete({ kind: "issue", id: issue.id, name: issue.title })}
                onShowInModel={showInModel}
              />
            </div>
            <PanelDrawer open={openPanel === "issues"} onClose={closePanel} label="Issue details" side="right" hideAt="lg">
              <IssueInspector
                issue={selectedIssue}
                index={index}
                onStatusChange={(id, status) => issues.setStatus(id, status)}
                onSeverityChange={(id, severity) => issues.update(id, { severity })}
                onEdit={(issue) => setIssueDialog({ open: true, issue, element: null })}
                onDelete={(issue) => setPendingDelete({ kind: "issue", id: issue.id, name: issue.title })}
                onShowInModel={showInModel}
                onClose={closePanel}
              />
            </PanelDrawer>
          </div>
        ) : (
          /* --- model mode ---------------------------------------------------- */
          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_360px]">
            <div className="hidden min-h-0 border-r border-line bg-surface lg:block">{treePanel()}</div>

            <div className="relative flex min-h-0 min-w-0 flex-col">
              <div className="relative min-h-[260px] flex-1 lg:min-h-[320px]">
                {!models.activeModel || elementCount === 0 ? (
                  <NoModelReady
                    onImport={() => {
                      setImportResult(null);
                      setImportOpen(true);
                    }}
                    onSync={onSync}
                    syncing={syncing}
                  />
                ) : (
                <BimViewport
                  state={sceneState}
                  map={map}
                  cityRef={w.cityRef}
                  model={models.activeModel}
                  elementCount={elementCount}
                  sceneObjectCount={w.sceneObjectCount}
                  sceneMode={prefs.prefs.sceneMode}
                  onSceneMode={prefs.setSceneMode}
                  selectedElement={selection.selectedElement}
                  onClearSelection={selection.clearSelection}
                  onFocus={(id) => selection.selectElement(id, { focus: true })}
                  revision={models.revision}
                  onLatestRevision={() => models.setRevision(0)}
                  inspect={inspect}
                />
                )}
              </div>

              {/* phone / tablet bar */}
              <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line bg-surface px-2 py-1.5 xl:hidden" aria-label="BIM view controls">
                <div className="flex items-center gap-0.5">
                  <IconButton icon={Layers3} label="Model tree" size="sm" onClick={() => togglePanel("tree")} active={openPanel === "tree"} aria-expanded={openPanel === "tree"} className="lg:hidden" />
                  <IconButton icon={SlidersHorizontal} label="Properties, filters and layers" size="sm" onClick={() => togglePanel("side")} active={openPanel === "side"} aria-expanded={openPanel === "side"} />
                  <IconButton icon={Flag} label="Issues" size="sm" onClick={() => setMode("issues")} />
                </div>
                <div className="flex items-center gap-1.5">
                  <div role="tablist" aria-label="Viewport" className="flex shrink-0 items-center gap-0.5 rounded-xl border border-line bg-surface-2 p-0.5 sm:hidden">
                    {(
                      [
                        { id: "2d", label: "2D" },
                        { id: "3d", label: "3D" },
                      ] as const
                    ).map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        role="tab"
                        aria-selected={viz.viewMode === v.id}
                        onClick={() => viz.setViewMode(v.id)}
                        className={[
                          "inline-flex h-8 items-center rounded-[9px] px-2.5 text-[12px] font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                          viz.viewMode === v.id ? "bg-surface text-primary shadow-soft" : "text-muted hover:text-ink",
                        ].join(" ")}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                  <ViewControls state={sceneState} map={map} compact />
                </div>
              </div>
            </div>

            <div className="hidden min-h-0 border-l border-line bg-surface xl:block">{sidePanel()}</div>

            <PanelDrawer open={openPanel === "tree"} onClose={closePanel} label="Model tree" side="left" hideAt="lg">
              {treePanel(closePanel)}
            </PanelDrawer>
            <PanelDrawer open={openPanel === "side"} onClose={closePanel} label="Properties, filters and layers" side="right" hideAt="xl">
              {sidePanel(closePanel)}
            </PanelDrawer>
          </div>
        )}

        {/* coordination mode: quick access to versions on small screens */}
        {mode === "coordination" && (
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line bg-surface px-2 py-1.5 xl:hidden">
            <Button size="sm" variant="secondary" onClick={() => togglePanel("versions")} aria-expanded={openPanel === "versions"} className="px-2.5">
              <Layers size={14} aria-hidden="true" /> Models & versions
            </Button>
            <span className="truncate text-[11.5px] text-muted">
              {models.models.length} record{models.models.length === 1 ? "" : "s"} · {models.versions.length} revisions
            </span>
          </div>
        )}
        {mode === "issues" && (
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line bg-surface px-2 py-1.5 lg:hidden">
            <Button size="sm" variant="secondary" onClick={() => togglePanel("issues")} aria-expanded={openPanel === "issues"} className="px-2.5">
              <Flag size={14} aria-hidden="true" /> Issue details
            </Button>
            <Button size="sm" variant="ghost" onClick={() => openIssueFor(selection.selectedElement)} className="px-2.5">
              New issue
            </Button>
          </div>
        )}
      </div>

      {statusBar}

      {/* dialogs */}
      <ImportDialog open={importOpen} progress={models.uploadProgress} result={importResult} onCancel={() => setImportOpen(false)} onUpload={onUpload} />
      <IssueDialog open={issueDialog.open} issue={issueDialog.issue} element={issueDialog.element} onCancel={() => setIssueDialog({ open: false, issue: null, element: null })} onSubmit={submitIssue} />
      <ConfirmDialog
        open={pendingDelete !== null}
        tone="danger"
        title={pendingDelete?.kind === "issue" ? "Delete issue" : "Remove model record"}
        description={
          pendingDelete?.kind === "issue" ? (
            <>
              Delete <strong>{pendingDelete.name}</strong>? This removes the local issue record — the element it points at is untouched.
            </>
          ) : (
            <>
              Remove <strong>{pendingDelete?.name ?? ""}</strong> from this project? The derived demo model stays available, and the file
              itself is never uploaded anywhere.
            </>
          )
        }
        confirmLabel={pendingDelete?.kind === "issue" ? "Delete issue" : "Remove record"}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
