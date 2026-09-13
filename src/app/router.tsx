import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { GuestRoute } from "../components/auth/GuestRoute";
import { Loader } from "../components/ui/Loader";
import {
  loadAnalysisPage,
  loadAppShell,
  loadComingSoonPage,
  loadCreateProjectPage,
  loadDashboardPage,
  loadForgotPasswordPage,
  loadLandingPage,
  loadLoginPage,
  loadLogoutPage,
  loadOptimizationPage,
  loadPlanningStudioPage,
  loadProjectDetailPage,
  loadProjectsPage,
  loadRegisterPage,
  loadReportsPage,
  loadVisualizationPage,
} from "./routeLoaders";

// Route-level code splitting. Every loader is imported from ./routeLoaders so
// the hover prefetcher warms the exact same chunk these `lazy()` calls resolve
// to — one chunk per route, no duplicated network request.
//
// AppShell is lazy too: it pulls in the sidebar, header, mobile drawer and
// their icons, none of which the public landing/login pages need. Importing it
// eagerly used to put the whole workspace chrome on every visitor's critical
// path.
const AppShell = lazy(() => loadAppShell().then((m) => ({ default: m.AppShell })));
const LandingPage = lazy(() => loadLandingPage().then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => loadLoginPage().then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => loadRegisterPage().then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() =>
  loadForgotPasswordPage().then((m) => ({ default: m.ForgotPasswordPage }))
);
const LogoutPage = lazy(() => loadLogoutPage().then((m) => ({ default: m.LogoutPage })));
const DashboardPage = lazy(() => loadDashboardPage().then((m) => ({ default: m.DashboardPage })));
const ProjectsPage = lazy(() => loadProjectsPage().then((m) => ({ default: m.ProjectsPage })));
const CreateProjectPage = lazy(() =>
  loadCreateProjectPage().then((m) => ({ default: m.CreateProjectPage }))
);
const ProjectDetailPage = lazy(() =>
  loadProjectDetailPage().then((m) => ({ default: m.ProjectDetailPage }))
);
const PlanningStudioPage = lazy(() =>
  loadPlanningStudioPage().then((m) => ({ default: m.PlanningStudioPage }))
);
const VisualizationPage = lazy(() =>
  loadVisualizationPage().then((m) => ({ default: m.VisualizationPage }))
);
const AnalysisPage = lazy(() => loadAnalysisPage().then((m) => ({ default: m.AnalysisPage })));
const OptimizationPage = lazy(() =>
  loadOptimizationPage().then((m) => ({ default: m.OptimizationPage }))
);
const ReportsPage = lazy(() => loadReportsPage().then((m) => ({ default: m.ReportsPage })));
const ComingSoonPage = lazy(() =>
  loadComingSoonPage().then((m) => ({ default: m.ComingSoonPage }))
);

function LazyRoute({ children, label = "Loading UrbanForma…" }: { children: ReactNode; label?: string }) {
  return <Suspense fallback={<Loader label={label} />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  // Public marketing landing page (available to everyone, signed-in or not).
  {
    path: "/",
    element: (
      <LazyRoute>
        <LandingPage />
      </LazyRoute>
    ),
  },
  {
    path: "/login",
    element: (
      <GuestRoute>
        <LazyRoute>
          <LoginPage />
        </LazyRoute>
      </GuestRoute>
    ),
  },
  {
    path: "/register",
    element: (
      <LazyRoute>
        <RegisterPage />
      </LazyRoute>
    ),
  },
  {
    path: "/forgot-password",
    element: (
      <LazyRoute>
        <ForgotPasswordPage />
      </LazyRoute>
    ),
  },

  // Entire authenticated application lives under /app and is protected.
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <LazyRoute label="Loading workspace…">
          <AppShell />
        </LazyRoute>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "projects", element: <ProjectsPage /> },
      { path: "projects/new", element: <CreateProjectPage /> },
      { path: "projects/:projectId", element: <ProjectDetailPage /> },
      { path: "planning", element: <PlanningStudioPage /> },
      { path: "analysis", element: <AnalysisPage /> },
      { path: "optimization", element: <OptimizationPage /> },
      { path: "visualization", element: <VisualizationPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "bim", element: <ComingSoonPage /> },
      { path: "settings", element: <ComingSoonPage /> },
      { path: "*", element: <Navigate to="/app" replace /> },
    ],
  },

  {
    path: "/logout",
    element: (
      <LazyRoute>
        <LogoutPage />
      </LazyRoute>
    ),
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
