import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { getProjectDetails, ProjectNotFoundError } from "../../features/projects/project.service";
import type { ProjectDetailState } from "../../features/projects/project.types";
import { ProjectHeader } from "../../features/projects/components/ProjectHeader";
import { ProjectOverview } from "../../features/projects/components/ProjectOverview";
import { ProjectProgress } from "../../features/projects/components/ProjectProgress";
import { ProjectMetrics } from "../../features/projects/components/ProjectMetrics";
import { SiteContext } from "../../features/projects/components/SiteContext";
import { ProjectInsights } from "../../features/projects/components/ProjectInsights";
import { EnvironmentalSnapshot } from "../../features/projects/components/EnvironmentalSnapshot";
import { ActivityTimeline } from "../../features/projects/components/ActivityTimeline";
import { NextSteps } from "../../features/projects/components/NextSteps";
import { ProjectInformation } from "../../features/projects/components/ProjectInformation";
import {
  ProjectDetailSkeleton,
  ProjectNotFound,
  ProjectDetailError,
} from "../../features/projects/components/ProjectDetailStates";

/**
 * /app/projects/:projectId — Project Details workspace.
 *
 * Data flows exclusively through project.service#getProjectDetails (the future
 * GET /api/projects/:id seam). Layout is a 12-column grid on desktop that
 * collapses to a single column on mobile; every section is a self-contained
 * component under src/features/projects/components/.
 */
export function ProjectDetailPage() {
  const { projectId = "" } = useParams();
  const [state, setState] = useState<ProjectDetailState>({ status: "loading" });

  const load = useCallback(() => {
    let active = true;
    setState({ status: "loading" });
    getProjectDetails(projectId)
      .then((project) => {
        if (active) setState({ status: "ready", project });
      })
      .catch((err: unknown) => {
        if (!active) return;
        setState({ status: err instanceof ProjectNotFoundError ? "not-found" : "error" });
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  useEffect(() => load(), [load]);

  // Keep the browser tab title in sync with the loaded project.
  useEffect(() => {
    const prev = document.title;
    if (state.status === "ready") document.title = `${state.project.name} · UrbanForma`;
    return () => {
      document.title = prev;
    };
  }, [state]);

  // Safe, session-only demo action: mark the loaded project archived.
  const handleArchive = useCallback((id: string) => {
    setState((s) =>
      s.status === "ready" && s.project.id === id
        ? { status: "ready", project: { ...s.project, status: "Archived" } }
        : s
    );
  }, []);

  if (state.status === "loading") {
    return (
      <PageContainer>
        <ProjectDetailSkeleton />
      </PageContainer>
    );
  }
  if (state.status === "not-found") {
    return (
      <PageContainer>
        <ProjectNotFound projectId={projectId} />
      </PageContainer>
    );
  }
  if (state.status === "error") {
    return (
      <PageContainer>
        <ProjectDetailError onRetry={load} />
      </PageContainer>
    );
  }

  const { project } = state;

  return (
    <PageContainer>
      <ProjectHeader project={project} onArchive={handleArchive} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* 1 · Overview — full width */}
        <div className="lg:col-span-12">
          <ProjectOverview project={project} />
        </div>

        {/* 2 · Key metrics — full width */}
        <div className="lg:col-span-12">
          <ProjectMetrics metrics={project.metrics} />
        </div>

        {/* 3 · Planning progress (7) + Environmental snapshot (5) */}
        <div className="lg:col-span-7">
          <ProjectProgress project={project} />
        </div>
        <div className="lg:col-span-5">
          <EnvironmentalSnapshot env={project.environmental} projectId={project.id} />
        </div>

        {/* 4 · Site context — full width */}
        <div className="lg:col-span-12">
          <SiteContext project={project} />
        </div>

        {/* 5 · Insights — full width */}
        <div className="lg:col-span-12">
          <ProjectInsights insights={project.insights} />
        </div>

        {/* 6 · Next steps — full width, prominent */}
        <div className="lg:col-span-12">
          <NextSteps steps={project.nextSteps} projectId={project.id} />
        </div>

        {/* 7 · Activity (5) + Project information (7) */}
        <div className="lg:col-span-5">
          <ActivityTimeline activities={project.activities} />
        </div>
        <div className="lg:col-span-7">
          <ProjectInformation project={project} />
        </div>
      </div>
    </PageContainer>
  );
}
