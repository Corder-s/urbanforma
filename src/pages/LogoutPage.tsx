import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";

/**
 * /logout — instantly performs logout() and redirects to /login.
 * Renders no persistent "logout screen".
 */
export function LogoutPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    logout(); // reusable logout(): clears user + session + auth state
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  return null;
}
