import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, FolderKanban } from "lucide-react";
import { PageContainer } from "../../components/layout/PageContainer";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Reveal } from "../../components/landing/Reveal";
import { ProjectCard } from "../../components/projects/ProjectCard";
import { ProjectRow } from "../../components/projects/ProjectRow";
import { ProjectsToolbar } from "../../components/projects/ProjectsToolbar";
import {
  ProjectsSkeleton,
  ProjectsError,
  ProjectsEmpty,
  ProjectsNoResults,
} from "../../components/projects/ProjectsStates";
import { useProjectsFilters } from "../../features/projects/useProjectsFilters";
import {
  getProjects,
  filterAndSortProjects,
} from "../../features/projects/project.service";
import type { Project } from "../../features/projects/project.types";

export function ProjectsPage() {
  const { filters, setters, hasActiveFilters } = useProjectsFilters();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [archived, setArchived] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(false);
    getProjects()
      .then((data) => {
        if (!active) return;
        setProjects(data);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  // Apply the safe, local archive action to the demo data (session only).
  const handleArchive = useCallback((id: string) => {
    setArchived((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const withArchive = useMemo(
    () =>
      projects.map((p) =>
        archived.has(p.id) ? { ...p, status: "Archived" as const } : p
      ),
    [projects, archived]
  );

  const visible = useMemo(
    () =>
      filterAndSortProjects(withArchive, {
        query: filters.q,
        status: filters.status === "All" ? "all" : filters.status,
        type: filters.type === "All" ? "all" : filters.type,
        location: filters.location === "All" ? "all" : filters.location,
        updated: filters.updated,
        sort: filters.sort,
      }),
    [withArchive, filters]
  );

  return (
    <PageContainer>
      <PageHeader
        title="Projects"
        description="Manage your urban planning projects, sites and masterplans."
        icon={FolderKanban}
        actions={
          <Link to="/app/projects/new">
            <Button>
              <Plus size={18} /> New Project
            </Button>
          </Link>
        }
      />

      <div className="space-y-5">
        <ProjectsToolbar
          filters={filters}
          on={setters}
          resultCount={loading ? 0 : visible.length}
          hasActiveFilters={hasActiveFilters}
          onClear={setters.clearFilters}
        />

        {loading && <ProjectsSkeleton />}
        {!loading && error && <ProjectsError onRetry={load} />}

        {!loading && !error && withArchive.length === 0 && <ProjectsEmpty />}

        {!loading && !error && withArchive.length > 0 && visible.length === 0 && (
          <ProjectsNoResults onClear={setters.clearFilters} />
        )}

        {!loading && !error && visible.length > 0 && (
          <>
            {filters.view === "grid" ? (
              <div
                key="grid"
                className="grid animate-fade-in gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {visible.map((p) => (
                  <Reveal key={p.id} className="h-full">
                    <ProjectCard project={p} onArchive={handleArchive} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <div key="list" className="flex animate-fade-in flex-col gap-3">
                {visible.map((p) => (
                  <ProjectRow key={p.id} project={p} onArchive={handleArchive} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
}
