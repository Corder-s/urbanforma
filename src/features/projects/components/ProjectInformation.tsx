import { Copy, Check } from "lucide-react";
import { useState } from "react";
import type { ProjectDetail } from "../project.types";
import { formatDate, formatSiteArea } from "../project.service";
import { SectionHeading } from "../../../components/dashboard/SectionHeading";

interface Field {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — silently ignore */
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    >
      {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
    </button>
  );
}

/** Clean two-column (desktop) / one-column (mobile) information panel. */
export function ProjectInformation({ project }: { project: ProjectDetail }) {
  const current = project.stages.find((s) => s.key === project.currentStage);
  const fields: Field[] = [
    { label: "Project ID", value: project.id, mono: true, copyable: true },
    { label: "Project Type", value: project.type },
    { label: "Location", value: project.location },
    { label: "Site Area", value: formatSiteArea(project.siteAreaHa) },
    { label: "Created Date", value: formatDate(project.createdAtIso) },
    { label: "Last Updated", value: `${formatDate(project.updatedAtIso)} (${project.updatedAt})` },
    { label: "Current Stage", value: current ? current.label : project.stage },
    { label: "Project Owner", value: `${project.owner.name} — ${project.owner.role}` },
  ];

  return (
    <section aria-labelledby="info-title">
      <SectionHeading id="info-title" title="Project Information" />
      <dl className="grid gap-x-8 rounded-3xl border border-line bg-white px-5 shadow-soft sm:px-6 md:grid-cols-2">
        {fields.map((f) => (
          <div
            key={f.label}
            className="flex flex-col gap-1 border-b border-line py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:[&:nth-last-child(2)]:border-b-0"
          >
            <dt className="shrink-0 text-[12px] font-bold uppercase tracking-wider text-faint sm:text-[13px] sm:font-semibold sm:normal-case sm:tracking-normal sm:text-muted">
              {f.label}
            </dt>
            <dd
              className={[
                "flex min-w-0 items-center gap-1 text-[14px] font-bold text-ink sm:justify-end sm:text-right",
                f.mono ? "font-mono text-[13px]" : "",
              ].join(" ")}
            >
              <span className="break-words">{f.value}</span>
              {f.copyable && <CopyButton text={f.value} label={f.label} />}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
