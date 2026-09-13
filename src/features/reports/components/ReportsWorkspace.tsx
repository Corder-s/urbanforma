import { useUnitPreferences } from "../../settings/hooks/useUnitPreferences";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight, FileText, Printer, RefreshCw } from "lucide-react";
import { PageContainer } from "../../../components/layout/PageContainer";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import { formatDate } from "../../projects/project.service";
import {
  getVisualizationProjects,
  type VisualizationProjectSummary,
} from "../../visualization/services/visualization.service";
import { lastReportProjectId, useReports } from "../hooks/useReports";
import { useReportModel } from "../hooks/useReportModel";
import type { ReportConfig, ReportType } from "../types/report.types";
import { ReportConfigPanel } from "./ReportConfigPanel";
import { ReportConfirmDialog } from "./ReportConfirmDialog";
import { ReportList } from "./ReportList";
import { ReportPreview } from "./ReportPreview";
import {
  DocumentError,
  DocumentLoading,
  NoProjectAvailable,
  ProjectsError,
  ReportsEmpty,
  ReportsSkeleton,
} from "./ReportStates";

/**
 * /app/reports — the Reports workspace.
 *
 * Composition only: the project list comes from the visualization service, the
 * report list from `useReports` (local persistence) and every number in the
 * document from `useReportModel`, which reads the project / planning / analysis
 * / optimization / visualization services. Nothing here owns data of its own.
 *
 * URL contract: `?projectId=<id>` (required for a document) and `&reportId=<id>`
 * (which saved report is open), both written with `replace` so browsing reports
 * does not fill the history stack.
 */

type ProjectsLoad =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; projects: VisualizationProjectSummary[] };

const STATUS_TONE: Record<ReportConfig["status"], "neutral" | "blue" | "green" | "amber"> = {
  draft: "neutral",
  generating: "blue",
  ready: "green",
  failed: "amber",
};

const STATUS_LABEL: Record<ReportConfig["status"], string> = {
  draft: "Draft",
  generating: "Generating",
  ready: "Ready",
  failed: "Generation failed",
};

export function ReportsWorkspace() {
  // Subscribe to the workspace unit preference so every formatted measurement
  // in this module re-renders when the user switches systems (Settings → Units).
  useUnitPreferences();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramProjectId = searchParams.get("projectId");
  const paramReportId = searchParams.get("reportId");

  const [projectsLoad, setProjectsLoad] = useState<ProjectsLoad>({ status: "loading" });
  const [projectsAttempt, setProjectsAttempt] = useState(0);
  const [mobileTab, setMobileTab] = useState<"configure" | "preview">("preview");
  const [pendingDelete, setPendingDelete] = useState<ReportConfig | null>(null);
  const [generating, setGenerating] = useState(false);

  // --- projects ---------------------------------------------------------------
  useEffect(() => {
    let active = true;
    setProjectsLoad({ status: "loading" });
    getVisualizationProjects()
      .then((projects) => {
        if (active) setProjectsLoad({ status: "ready", projects });
      })
      .catch((err: unknown) => {
        if (active) {
          setProjectsLoad({
            status: "error",
            message: err instanceof Error ? err.message : "The project list did not respond.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [projectsAttempt]);

  const projects = projectsLoad.status === "ready" ? projectsLoad.projects : [];

  // --- which project is open ----------------------------------------------------
  // A project id in the URL wins (even one the picker does not list — user
  // created projects still report), then the last project used here, then the
  // first available one.
  const projectId = useMemo(() => {
    if (projectsLoad.status !== "ready") return null;
    if (paramProjectId) return paramProjectId;
    const remembered = lastReportProjectId();
    if (remembered && projects.some((p) => p.id === remembered)) return remembered;
    return projects[0]?.id ?? null;
  }, [projectsLoad.status, paramProjectId, projects]);

  const { model, load, reload } = useReportModel(projectId);
  const projectName = useMemo(() => {
    if (model?.project?.name) return model.project.name;
    return projects.find((p) => p.id === projectId)?.name ?? "";
  }, [model, projects, projectId]);

  const reports = useReports(projectId, { initialSelectedId: paramReportId, projectName });
  const selected = reports.selected;

  // --- keep the URL in step with the workspace ---------------------------------
  useEffect(() => {
    if (!projectId) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("projectId", projectId);
        if (reports.selectedId) next.set("reportId", reports.selectedId);
        else next.delete("reportId");
        return next;
      },
      { replace: true }
    );
  }, [projectId, reports.selectedId, setSearchParams]);

  // Browser back/forward to another report of the same project.
  useEffect(() => {
    if (!paramReportId || paramReportId === reports.selectedId) return;
    if (reports.reports.some((r) => r.id === paramReportId)) reports.select(paramReportId);
    // `reports.select` is stable; the list is read only to validate the id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramReportId, reports.selectedId, reports.reports]);

  // --- generation ---------------------------------------------------------------
  const generate = useCallback(async () => {
    const report = reports.selected;
    if (!report || generating) return;
    setGenerating(true);
    reports.setStatus(report.id, "generating");
    const fresh = await reload();
    // "Failed" only when the read itself broke, or every source was unreachable —
    // a partially available project still produces a document that says so.
    const ok = fresh !== null && fresh.missing.length < 5;
    reports.generated(report.id, ok ? "ready" : "failed");
    setGenerating(false);
  }, [reports, generating, reload]);

  const print = useCallback(() => {
    if (typeof window !== "undefined") window.print();
  }, []);

  const projectOptions = useMemo(() => {
    // Truncated for the toolbar pill — the full name is in the document cover.
    const short = (name: string) => (name.length > 26 ? `${name.slice(0, 25)}…` : name);
    const base = projects.map((p) => ({ value: p.id, label: short(p.name) }));
    if (projectId && !base.some((o) => o.value === projectId)) {
      base.unshift({ value: projectId, label: short(projectName || projectId) });
    }
    return base;
  }, [projects, projectId, projectName]);

  const openProject = useCallback(
    (id: string) => {
      setSearchParams({ projectId: id }, { replace: true });
    },
    [setSearchParams]
  );

  // --- render -------------------------------------------------------------------
  if (projectsLoad.status === "loading") {
    return (
      <PageContainer>
        <PageHeader icon={FileText} title="Reports" description="Planning documents built from live project data." />
        <ReportsSkeleton />
      </PageContainer>
    );
  }

  if (projectsLoad.status === "error") {
    return (
      <PageContainer>
        <PageHeader icon={FileText} title="Reports" description="Planning documents built from live project data." />
        <ProjectsError message={projectsLoad.message} onRetry={() => setProjectsAttempt((a) => a + 1)} />
      </PageContainer>
    );
  }

  if (!projectId) {
    return (
      <PageContainer>
        <PageHeader icon={FileText} title="Reports" description="Planning documents built from live project data." />
        <NoProjectAvailable projects={projects} onOpen={openProject} />
      </PageContainer>
    );
  }

  const showPreview = mobileTab === "preview";

  return (
    <PageContainer className="print:max-w-none print:px-0 print:py-0">
      {/* App-only chrome: the document alone prints. */}
      <div className="print:hidden">
        <PageHeader
          icon={FileText}
          title="Reports"
          description="Turn this project's planning, analysis and optimization work into a printable document."
          breadcrumb={
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-1.5 text-sm">
                <li>
                  <Link
                    to="/app/projects"
                    className="rounded-md font-semibold text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                  >
                    Projects
                  </Link>
                </li>
                <li aria-hidden="true" className="text-line-strong">
                  <ChevronRight size={15} />
                </li>
                <li>
                  <span aria-current="page" className="font-bold text-ink">
                    Reports
                  </span>
                </li>
              </ol>
            </nav>
          }
          actions={
            <>
              <Select label="Project" value={projectId} onChange={openProject} options={projectOptions} />
              <Button variant="secondary" onClick={() => void generate()} loading={generating} disabled={!selected}>
                <RefreshCw size={16} /> Generate
              </Button>
              <Button onClick={print} disabled={!selected || load.status !== "ready"}>
                <Printer size={16} /> Print / PDF
              </Button>
            </>
          }
        />

        {/* Mobile: the document and its controls are two screens, so switch between
            them instead of forcing a long scroll. Both are always in the DOM on
            large screens, and only the document prints. */}
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface p-1 lg:hidden" role="group" aria-label="Reports view">
          {(["preview", "configure"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              aria-pressed={mobileTab === tab}
              onClick={() => setMobileTab(tab)}
              className={[
                "h-9 rounded-lg text-[13px] font-bold capitalize transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
                mobileTab === tab ? "bg-primary text-on-brand" : "text-muted hover:bg-surface-2 hover:text-primary",
              ].join(" ")}
            >
              {tab === "preview" ? "Document" : "Configure"}
            </button>
          ))}
        </div>

      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,390px)_minmax(0,1fr)]">
        <div className={`space-y-5 print:hidden ${showPreview ? "hidden" : "block"} lg:block`}>
          <ReportList
            reports={reports.reports}
            ready={reports.ready}
            selectedId={reports.selectedId}
            full={reports.full}
            maxReports={reports.maxReports}
            onSelect={reports.select}
            onCreate={(type: ReportType) => {
              reports.create(type);
              setMobileTab("preview");
            }}
            onDuplicate={(id) => {
              reports.duplicate(id);
              setMobileTab("preview");
            }}
            onRename={(id, title) => reports.rename(id, title)}
            onDelete={(id) => setPendingDelete(reports.reports.find((r) => r.id === id) ?? null)}
          />

          {selected && model && (
            <ReportConfigPanel
              key={selected.id}
              report={selected}
              missing={model.missing}
              onChangeType={(type) => reports.changeType(selected.id, type)}
              onChangeTitle={(title) => reports.rename(selected.id, title)}
              onChangeDescription={(description) => reports.rename(selected.id, selected.title, description)}
              onToggleSection={(sectionId) => reports.toggleSection(selected.id, sectionId)}
              onMoveSection={(sectionId, direction) => reports.moveSection(selected.id, sectionId, direction)}
              onSetAllSections={(enabled) => reports.setAllSections(selected.id, enabled)}
              onResetSections={() => reports.resetSections(selected.id)}
            />
          )}
        </div>

        <div className={`min-w-0 print:block ${showPreview ? "block" : "hidden"} lg:block`}>
          {!reports.ready ? (
            <DocumentLoading />
          ) : !selected ? (
            <ReportsEmpty
              full={reports.full}
              onCreate={(type) => {
                reports.create(type);
                setMobileTab("preview");
              }}
            />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-soft print:hidden">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                  <Badge tone={STATUS_TONE[selected.status]} dot>
                    {generating ? "Generating" : STATUS_LABEL[selected.status]}
                  </Badge>
                  <span className="truncate text-[13px] font-bold text-ink">{selected.title}</span>
                  <span className="text-[12px] text-muted">
                    revision v{selected.version} ·{" "}
                    {selected.lastGeneratedAt ? `generated ${formatDate(selected.lastGeneratedAt)}` : "not generated yet"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => void generate()} loading={generating}>
                    <RefreshCw size={15} /> Generate
                  </Button>
                  <Button size="sm" onClick={print} disabled={load.status !== "ready"}>
                    <Printer size={15} /> Print
                  </Button>
                </div>
              </div>

              {load.status === "loading" ? (
                <DocumentLoading generating={generating} />
              ) : load.status === "error" ? (
                <DocumentError message={load.message} onRetry={() => void generate()} />
              ) : load.status === "ready" ? (
                <ReportPreview report={selected} model={load.model} />
              ) : (
                <DocumentLoading />
              )}
            </>
          )}
        </div>
      </div>

      <ReportConfirmDialog
        open={pendingDelete !== null}
        title="Delete this report?"
        description={
          <>
            <strong className="font-bold text-ink">{pendingDelete?.title}</strong> and its section configuration will be
            removed from this browser. The project's planning, analysis and optimization data is untouched.
          </>
        }
        confirmLabel="Delete report"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) reports.remove(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </PageContainer>
  );
}
