import type { User } from "../../features/auth/auth.types";

interface AvatarProps {
  user: User;
  size?: number;
  className?: string;
}

/** Shows the user's avatar image, or initials as a fallback. */
export function Avatar({ user, size = 44, className = "" }: AvatarProps) {
  const initials =
    (user.name?.trim() || user.email)
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase())
      .slice(0, 2)
      .join("") ?? "U";

  const style = { width: size, height: size, fontSize: size * 0.38 };

  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        style={style}
        className={[
          "rounded-full object-cover ring-2 ring-white shadow-soft",
          className,
        ].join(" ")}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={style}
      className={[
        "grid place-items-center rounded-full bg-gradient-to-br from-primary to-accent font-bold text-white ring-2 ring-white shadow-soft",
        className,
      ].join(" ")}
    >
      {initials}
    </span>
  );
}
