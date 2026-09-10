import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User as UserIcon, Settings, ChevronsUpDown, BadgeInfo } from "lucide-react";
import { useAuth } from "../../features/auth/AuthProvider";
import { Avatar } from "../ui/Avatar";

/**
 * Header user menu. Avatar + name/role trigger opens a clean white dropdown.
 * "Profile" is a placeholder; "Settings" navigates to /app/settings;
 * "Sign out" uses the shared logout() and returns to /login.
 */
export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDown(e: globalThis.MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  function handleSignOut(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    setOpen(false);
    logout();
    navigate("/login", { replace: true });
  }

  function placeholder(name: string) {
    setNotice(`${name} will be available in a later step.`);
    window.setTimeout(() => setNotice(null), 2600);
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className="flex items-center gap-2.5 rounded-2xl border border-line bg-white py-1.5 pl-1.5 pr-2.5 shadow-soft transition-all hover:border-line-strong hover:shadow-float focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
      >
        <Avatar user={user} size={36} />
        <span className="hidden text-left leading-tight md:block">
          <span className="block max-w-[160px] truncate text-sm font-bold text-ink">
            {user.name}
          </span>
          <span className="block max-w-[160px] truncate text-xs text-muted">
            {user.role}
          </span>
        </span>
        <ChevronsUpDown
          size={16}
          className={`hidden text-faint transition-transform sm:block ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] origin-top-right animate-pop rounded-2xl border border-line bg-white p-1.5 shadow-float"
        >
          <div className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-3">
            <Avatar user={user} size={44} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
              <p className="mt-0.5 inline-block rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                {user.role}
              </p>
            </div>
          </div>

          {notice && (
            <div
              role="status"
              className="mt-1.5 flex items-center gap-2 rounded-lg bg-warning/5 px-3 py-2 text-[12.5px] font-medium text-warning animate-pop"
            >
              <BadgeInfo size={15} className="shrink-0" />
              {notice}
            </div>
          )}

          <div className="mt-1.5 border-t border-line pt-1.5">
            <MenuItem
              icon={<UserIcon size={17} />}
              label="Profile"
              onClick={() => placeholder("Profile")}
            />
            <MenuItem
              icon={<Settings size={17} />}
              label="Settings"
              onClick={() => {
                setOpen(false);
                navigate("/app/settings");
              }}
            />
            <MenuItem
              icon={<LogOut size={17} />}
              label="Sign out"
              danger
              onClick={handleSignOut}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
        danger ? "text-danger hover:bg-danger/5" : "text-ink hover:bg-surface-2",
      ].join(" ")}
    >
      <span className={danger ? "text-danger" : "text-muted"}>{icon}</span>
      {label}
    </button>
  );
}
