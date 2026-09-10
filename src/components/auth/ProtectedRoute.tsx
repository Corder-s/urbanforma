import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthProvider";
import { Loader } from "../ui/Loader";

/** Gate for authenticated areas. Shows a loader while the session is being
 *  restored, redirects to /login when unauthenticated. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loader label="Checking your session…" />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
