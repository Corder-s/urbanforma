import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../../features/auth/AuthProvider";
import { Avatar } from "../ui/Avatar";

interface SidebarUserProps {
  collapsed?: boolean;
  onSignOut?: () => void;
}

/** User profile block pinned to the bottom of the sidebar, with real logout. */
export function SidebarUser({ collapsed = false, onSignOut }: SidebarUserProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  function handleSignOut() {
    logout(); // reusable logout() — clears user + session
    navigate("/login", { replace: true });
    onSignOut?.();
  }

  if (collapsed) {
    return (
      <div className="mt-auto flex flex-col items-center gap-2 border-t border-line pt-4">
        <Avatar user={user} size={36} />
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sign out"
          title="Sign out"
          className="grid h-10 w-10 place-items-center rounded-xl text-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-danger/20"
        >
          <LogOut size={19} />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-auto border-t border-line pt-4">
      <div className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5">
        <Avatar user={user} size={40} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-bold text-ink">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.role}</p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sign out"
          title="Sign out"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-danger/20"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}
