import {
  Activity,
  Building2,
  FileOutput,
  FolderPlus,
  MapPinned,
  MessageSquare,
  SlidersHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActivityKind, ProjectActivity } from "../project.types";
import { SectionHeading } from "../../../components/dashboard/SectionHeading";

const KIND: Record<ActivityKind, { icon: LucideIcon; tone: string }> = {
  analysis: { icon: Activity, tone: "bg-success/10 text-success" },
  boundary: { icon: MapPinned, tone: "bg-primary/10 text-primary" },
  layout: { icon: Building2, tone: "bg-accent/10 text-accent" },
  created: { icon: FolderPlus, tone: "bg-primary/10 text-primary" },
  optimization: { icon: SlidersHorizontal, tone: "bg-warning/10 text-warning" },
  export: { icon: FileOutput, tone: "bg-warning/10 text-warning" },
  comment: { icon: MessageSquare, tone: "bg-surface-2 text-muted" },
};

/** Vertical timeline of project activity (typed demo data). */
export function ActivityTimeline({ activities }: { activities: ProjectActivity[] }) {
  return (
    <section aria-labelledby="activity-title" className="flex h-full flex-col">
      <SectionHeading id="activity-title" title="Recent Activity" hint={`${activities.length} recent events`} />
      <div className="flex-1 rounded-3xl border border-line bg-surface p-5 shadow-soft">
        {activities.length === 0 ? (
          <p className="rounded-xl bg-surface-2 px-3 py-2 text-[13px] text-muted">No activity recorded yet.</p>
        ) : (
          <ol className="relative">
            {activities.map((a, i) => {
              const k = KIND[a.kind];
              return (
                <li key={a.id} className="relative flex gap-3.5 pb-4 last:pb-0">
                  {i < activities.length - 1 && (
                    <span aria-hidden="true" className="absolute left-[18px] top-10 h-[calc(100%-2.2rem)] w-px bg-line" />
                  )}
                  <span className={`relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full ${k.tone}`}>
                    <k.icon size={17} />
                  </span>
                  <div className="min-w-0 pt-1">
                    <p className="text-sm font-semibold leading-snug text-ink">{a.title}</p>
                    {a.detail && <p className="mt-0.5 text-[12.5px] text-muted">{a.detail}</p>}
                    <p className="mt-0.5 text-[12px] text-faint">
                      <time dateTime={a.atIso}>{a.time}</time>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
