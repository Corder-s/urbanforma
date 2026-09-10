import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { GuestRoute } from "../components/auth/GuestRoute";
import { AppShell } from "../layouts/AppShell";
import { LandingPage } from "../pages/LandingPage";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { LogoutPage } from "../pages/LogoutPage";
import { DashboardPage } from "../pages/app/DashboardPage";
import { ProjectsPage } from "../pages/app/ProjectsPage";
import { CreateProjectPage } from "../pages/app/CreateProjectPage";
import { ProjectDetailPage } from "../pages/app/ProjectDetailPage";
import { PlanningStudioPage } from "../pages/app/PlanningStudioPage";
import { VisualizationPage } from "../pages/app/VisualizationPage";
import { AnalysisPage } from "../pages/app/AnalysisPage";
import { OptimizationPage } from "../pages/app/OptimizationPage";
import { ComingSoonPage } from "../pages/app/ComingSoonPage";

export const router = createBrowserRouter([
  // Public marketing landing page (available to everyone, signed-in or not).
  { path: "/", element: <LandingPage /> },
  {
    path: "/login",
    element: (
      <GuestRoute>
        <LoginPage />
      </GuestRoute>
    ),
  },
  { path: "/register", element: <RegisterPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },

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

  { path: "/logout", element: <LogoutPage /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);
