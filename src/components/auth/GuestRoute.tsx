import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthProvider";
import { Loader } from "../ui/Loader";

/**
 * For auth-only routes (e.g. /login). Authenticated users are sent to /app;
 * during session restore a loader is shown so the login page never flashes.
 */
export function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loader label="One moment…" />;
  }
  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}
