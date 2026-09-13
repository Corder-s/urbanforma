import type { ActivityItem } from "../../features/projects/project.types";
import { Reveal } from "../landing/Reveal";
import { SectionHeading } from "./SectionHeading";

const toneClasses: Record<ActivityItem["tone"], string> = {
  blue: "bg-primary/10 text-primary",
  green: "bg-success/10 text-success",
  amber: "bg-warning/10 text-warning",
  teal: "bg-accent/10 text-accent",
};

/** Clean vertical timeline of recent project activity. */
export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <section aria-labelledby="activity-title">
      <SectionHeading id="activity-title" title="Recent Activity" />
      <Reveal>
        <ol className="relative space-y-1 rounded-3xl border border-line bg-surface p-5 shadow-soft">
          {items.map((a, i) => (
            <li key={a.id} className="relative flex gap-3.5 pb-4 last:pb-0">
              {/* timeline connector */}
              {i < items.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-[18px] top-10 h-[calc(100%-2.2rem)] w-px bg-line"
                />
              )}
              <span
                className={`relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full ${toneClasses[a.tone]}`}
              >
                <a.icon size={17} />
              </span>
              <div className="min-w-0 pt-1">
                <p className="text-sm font-semibold text-ink">{a.label}</p>
                <p className="text-[12.5px] text-faint">{a.time}</p>
              </div>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}
