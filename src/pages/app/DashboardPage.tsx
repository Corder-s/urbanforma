import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { PageContainer } from "../../components/layout/PageContainer";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/layout/PageHeader";
import { Compass } from "lucide-react";
import { loadDashboard, greeting } from "../../features/projects/project.service";
import type { DashboardState } from "../../features/projects/project.types";
import { useAuth } from "../../features/auth/AuthProvider";

import { DashboardSkeleton } from "../../components/dashboard/DashboardSkeleton";
import { DashboardError } from "../../components/dashboard/DashboardError";
import { DashboardEmpty } from "../../components/dashboard/DashboardEmpty";
import { ContinueWorking } from "../../components/dashboard/ContinueWorking";
import { QuickActions } from "../../components/dashboard/QuickActions";
import { PortfolioOverview } from "../../components/dashboard/PortfolioOverview";
import { RecentProjects } from "../../components/dashboard/RecentProjects";
import { ActivityFeed } from "../../components/dashboard/ActivityFeed";
import { AttentionPanel } from "../../components/dashboard/AttentionPanel";
import { EnvironmentalSnapshotCard } from "../../components/dashboard/EnvironmentalSnapshotCard";

export function DashboardPage() {
  const { user } = useAuth();
  const [state, setState] = useState<DashboardState>({ status: "loading" });

  const load = useCallback(() => {
    let active = true;
    setState({ status: "loading" });
    loadDashboard()
      .then((data) => {
        if (!active) return;
        const isEmpty = !data.featured && data.recent.length === 0;
        setState(isEmpty ? { status: "empty" } : { status: "ready", data });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  const firstName = user?.name?.split(" ")[0] ?? "Planner";

  return (
    <PageContainer>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description="Design, analyze and improve your urban projects."
        icon={Compass}
        actions={
          <Link to="/app/projects/new">
            <Button size="md">
              <Plus size={18} /> New Project
            </Button>
          </Link>
        }
      />

      {state.status === "loading" && <DashboardSkeleton />}

      {state.status === "error" && <DashboardError onRetry={load} />}

      {state.status === "empty" && <DashboardEmpty />}

      {state.status === "ready" && (
        <div className="space-y-8">
          {/* Current project + what to do next */}
          <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
            <ContinueWorking project={state.data.featured!} stages={state.data.stages} />
            <QuickActions />
          </div>

          {/* Portfolio */}
          <PortfolioOverview portfolio={state.data.portfolio} />

          {/* Recent projects */}
          <RecentProjects projects={state.data.recent} />

          {/* Attention (first on mobile) → Activity → Environment.
              On desktop, Activity leads the row, Attention is centered. */}
          <div className="grid items-start gap-6 lg:grid-cols-3">
            <div className="order-2 lg:order-1">
              <ActivityFeed items={state.data.activity} />
            </div>
            <div className="order-1 lg:order-2">
              <AttentionPanel items={state.data.attention} />
            </div>
            {state.data.featured && (
              <div className="order-3">
                <EnvironmentalSnapshotCard
                  env={state.data.featured.env}
                  projectName={state.data.featured.name}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
