import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { GuestRoute } from "../components/auth/GuestRoute";
import { AppShell } from "../layouts/AppShell";
import { Loader } from "../components/ui/Loader";

// Lazy-load all page routes for optimized code-splitting and faster initial page loads
const LandingPage = lazy(() => import("../pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import("../pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("../pages/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import("../pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })));
const LogoutPage = lazy(() => import("../pages/LogoutPage").then((m) => ({ default: m.LogoutPage })));
const DashboardPage = lazy(() => import("../pages/app/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const ProjectsPage = lazy(() => import("../pages/app/ProjectsPage").then((m) => ({ default: m.ProjectsPage })));
const CreateProjectPage = lazy(() => import("../pages/app/CreateProjectPage").then((m) => ({ default: m.CreateProjectPage })));
const ProjectDetailPage = lazy(() => import("../pages/app/ProjectDetailPage").then((m) => ({ default: m.ProjectDetailPage })));
const PlanningStudioPage = lazy(() => import("../pages/app/PlanningStudioPage").then((m) => ({ default: m.PlanningStudioPage })));
const VisualizationPage = lazy(() => import("../pages/app/VisualizationPage").then((m) => ({ default: m.VisualizationPage })));
const AnalysisPage = lazy(() => import("../pages/app/AnalysisPage").then((m) => ({ default: m.AnalysisPage })));
const OptimizationPage = lazy(() => import("../pages/app/OptimizationPage").then((m) => ({ default: m.OptimizationPage })));
const ComingSoonPage = lazy(() => import("../pages/app/ComingSoonPage").then((m) => ({ default: m.ComingSoonPage })));

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
        <AppShell />
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
      { path: "reports", element: <ComingSoonPage /> },
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
