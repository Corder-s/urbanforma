import { ClipboardList, Check } from "lucide-react";
import { ProgressBar } from "../../../../components/dashboard/ProgressBar";
import { ProjectThumb } from "../../../../components/dashboard/ProjectThumb";
import { AREA_UNITS, parseNumber } from "../../project.service";
import type { CreateProjectForm } from "../../useCreateProjectForm";

interface Row {
  label: string;
  value: string | null;
}

function SummaryRow({ label, value }: Row) {
  const set = value !== null && value !== "";
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <dt className="shrink-0 text-[13px] font-medium text-muted">{label}</dt>
      <dd
        className={[
          "min-w-0 break-words text-right text-[13.5px] font-bold",
          set ? "text-ink" : "font-medium italic text-faint",
        ].join(" ")}
      >
        {set ? value : "Not set"}
      </dd>
    </div>
  );
}

/** Persistent, live project summary shown beside the form. */
export function ProjectSummary({ form }: { form: CreateProjectForm }) {
  const { values, completedCount, totalSetupFields } = form;
  const unit = AREA_UNITS.find((u) => u.value === values.areaUnit) ?? AREA_UNITS[0];
  const area = parseNumber(values.siteArea);
  const pop = parseNumber(values.targetPopulation);
  const pct = Math.round((completedCount / totalSetupFields) * 100);
  const complete = completedCount === totalSetupFields;

  const rows: Row[] = [
    { label: "Project Name", value: values.name.trim() || null },
    { label: "Project Type", value: values.type || null },
    { label: "Location", value: values.location.trim() || null },
    { label: "Site Area", value: area !== null && area > 0 ? `${area.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${unit.short}` : null },
    { label: "Target Population", value: pop !== null && pop >= 0 ? pop.toLocaleString("en-US") : null },
    { label: "Density", value: values.density },
    { label: "Planning Priority", value: values.planningPriority },
    { label: "Sustainability Goal", value: values.sustainabilityGoal },
  ];

  return (
    <aside aria-labelledby="summary-title" className="rounded-3xl border border-line bg-surface shadow-card">
      <div className="relative h-28 overflow-hidden rounded-t-3xl bg-surface-2">
        <ProjectThumb variant={3} label="New project preview" className="h-full w-full opacity-90" />
        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface/95 px-2.5 py-1 text-[11.5px] font-bold text-primary">
          <ClipboardList size={13} aria-hidden="true" /> New project
        </span>
      </div>

      <div className="p-5">
        <h2 id="summary-title" className="text-lg font-extrabold tracking-tight text-ink">
          Project Summary
        </h2>
        <p className="mt-0.5 truncate text-[13px] text-muted">{values.name.trim() || "Untitled project"}</p>

        <div className="mt-4 rounded-2xl bg-surface-2 p-3.5">
          <div className="mb-1.5 flex items-center justify-between text-[12px]">
            <span className="font-bold uppercase tracking-wider text-faint">Project Setup</span>
            <span className={`inline-flex items-center gap-1 font-bold ${complete ? "text-success" : "text-ink"}`} aria-live="polite">
              {complete && <Check size={13} aria-hidden="true" />}
              {completedCount} of {totalSetupFields} fields completed
            </span>
          </div>
          <ProgressBar value={pct} label="Project setup" />
        </div>

        <dl className="mt-3 divide-y divide-line" aria-live="polite">
          {rows.map((r) => (
            <SummaryRow key={r.label} {...r} />
          ))}
        </dl>
      </div>
    </aside>
  );
}
