import type { ReactNode } from "react";

interface SectionHeadingProps {
  title: string;
  hint?: string;
  action?: ReactNode;
  /** Optional id for the <h2> so a parent <section aria-labelledby> can reference it. */
  id?: string;
}

/** Medium-weight section title used down the dashboard (not a page header). */
export function SectionHeading({ title, hint, action, id }: SectionHeadingProps) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 id={id} className="text-lg font-extrabold tracking-tight text-ink">{title}</h2>
        {hint && <p className="mt-0.5 text-[13px] text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
