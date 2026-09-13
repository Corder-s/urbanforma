import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import type { NextStep } from "../project.types";
import { Button } from "../../../components/ui/Button";
import { SectionHeading } from "../../../components/dashboard/SectionHeading";

/** Prominent "what should I do next?" panel driven by the project's status. */
/** Studio routes get the project id appended so the workspace opens on this project. */
function withProject(to: string, projectId?: string): string {
  if (!projectId || !["/app/planning", "/app/analysis", "/app/optimization", "/app/visualization"].some((r) => to.startsWith(r))) return to;
  return `${to}${to.includes("?") ? "&" : "?"}projectId=${encodeURIComponent(projectId)}`;
}

export function NextSteps({ steps, projectId }: { steps: NextStep[]; projectId?: string }) {
  if (steps.length === 0) return null;
  return (
    <section aria-labelledby="next-title">
      <SectionHeading id="next-title" title="Next Steps" hint="Recommended actions based on the current stage" />
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 sm:[&>li:last-child:nth-child(odd)]:col-span-2 xl:[&>li:last-child:nth-child(odd)]:col-span-1">
        {steps.map((s, i) => (
          <li
            key={s.id}
            className={[
              "flex flex-col gap-3 rounded-2xl border p-5 shadow-soft",
              s.primary ? "border-primary/30 bg-primary/5 ring-1 ring-primary/10" : "border-line bg-surface",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface text-[12px] font-extrabold text-primary ring-1 ring-primary/20">
                {i + 1}
              </span>
              {s.primary && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-on-brand">
                  <Sparkles size={12} aria-hidden="true" /> Recommended
                </span>
              )}
            </div>
            <div>
              <h3 className="text-[15px] font-extrabold text-ink">{s.title}</h3>
              <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{s.text}</p>
            </div>
            <Link to={withProject(s.to, projectId)} className="mt-auto">
              <Button size="sm" variant={s.primary ? "primary" : "secondary"} fullWidth>
                {s.actionLabel} <ArrowRight size={16} />
              </Button>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
