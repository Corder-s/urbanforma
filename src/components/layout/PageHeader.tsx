import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  /** Optional breadcrumb rendered above the title (e.g. Projects / New Project). */
  breadcrumb?: ReactNode;
}

/** Reusable page title block: icon + title/description on the left, actions right. */
export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  breadcrumb,
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      {breadcrumb && <div className="mb-3">{breadcrumb}</div>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          {Icon && (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary ring-1 ring-primary/15">
              <Icon size={24} />
            </span>
          )}
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">
              {title}
            </h1>
            {description && (
              <p className="mt-0.5 text-sm text-muted sm:text-[15px]">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
