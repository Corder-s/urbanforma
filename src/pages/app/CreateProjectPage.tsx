import { useCallback, useEffect, useMemo, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, FolderPlus } from "lucide-react";
import { PageContainer } from "../../components/layout/PageContainer";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../features/auth/AuthProvider";
import { useCreateProjectForm } from "../../features/projects/useCreateProjectForm";
import { ProjectInformationForm } from "../../features/projects/components/create/ProjectInformationForm";
import { SiteDetailsForm } from "../../features/projects/components/create/SiteDetailsForm";
import { PlanningPreferencesForm } from "../../features/projects/components/create/PlanningPreferencesForm";
import { UnitsForm } from "../../features/projects/components/create/UnitsForm";
import { ProjectSummary } from "../../features/projects/components/create/ProjectSummary";
import { CreateProjectActions } from "../../features/projects/components/create/CreateProjectActions";
import { DraftBanner } from "../../features/projects/components/create/DraftBanner";
import type { Project } from "../../features/projects/project.types";

const PAGE_TITLE = "Create New Project";

/**
 * /app/projects/new — Create Project.
 *
 * Desktop: two columns (form ≈ 70 % / live summary ≈ 30 %, summary sticky).
 * Tablet & mobile: one column with the summary below the form.
 * All state lives in useCreateProjectForm; creation goes through
 * project.service#createProject (the future POST /api/projects seam).
 */
export function CreateProjectPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const owner = useMemo(
    () => ({
      name: user?.name ?? "Planner",
      role: user?.role ?? "Urban Planner",
      email: user?.email ?? "",
    }),
    [user]
  );

  const onCreated = useCallback(
    (project: Project) => navigate(`/app/projects/${project.id}`, { replace: true }),
    [navigate]
  );

  const form = useCreateProjectForm({ owner, onCreated });

  useEffect(() => {
    const prev = document.title;
    document.title = `${PAGE_TITLE} · UrbanForma`;
    return () => {
      document.title = prev;
    };
  }, []);

  // Native "leave page?" prompt while there are unsaved edits (no custom dialogs).
  useEffect(() => {
    if (!form.dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [form.dirty]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const firstInvalid = await form.submit();
    if (!firstInvalid) return;
    const el = document.getElementById(firstInvalid);
    if (!el) return;
    el.focus({ preventScroll: true });
    // No explicit `behavior`: the document's scroll-behavior applies, which
    // globals.css switches to `auto` under prefers-reduced-motion.
    if (typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "center" });
  }

  return (
    <PageContainer>
      <PageHeader
        icon={FolderPlus}
        title={PAGE_TITLE}
        description="Set up your project and define the basic planning context."
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
                  New Project
                </span>
              </li>
            </ol>
          </nav>
        }
        actions={
          <Link to="/app/projects">
            <Button variant="secondary">
              <ArrowLeft size={16} /> Back to Projects
            </Button>
          </Link>
        }
      />

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label="Create project"
        className="grid grid-cols-1 gap-6 lg:grid-cols-10 lg:items-start"
      >
        {/* Form column (≈ 70 %) */}
        <div className="min-w-0 space-y-6 lg:col-span-7">
          {form.draft.pending && (
            <DraftBanner
              draft={form.draft.pending}
              onRestore={form.draft.restore}
              onDiscard={form.draft.discard}
            />
          )}
          <ProjectInformationForm form={form} />
          <SiteDetailsForm form={form} />
          <PlanningPreferencesForm form={form} />
          <UnitsForm form={form} />
          <CreateProjectActions form={form} />
        </div>

        {/* Summary column (≈ 30 %) — sticky on desktop, below the form otherwise */}
        <div className="min-w-0 lg:sticky lg:top-6 lg:col-span-3">
          <ProjectSummary form={form} />
        </div>
      </form>
    </PageContainer>
  );
}
