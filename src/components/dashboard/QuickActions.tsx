import { Link } from "react-router-dom";
import { Plus, FolderOpen, Activity, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Reveal } from "../landing/Reveal";
import { SectionHeading } from "./SectionHeading";

interface Action {
  icon: LucideIcon;
  label: string;
  to: string;
  hint: string;
}

const ACTIONS: Action[] = [
  { icon: Plus, label: "Create Project", to: "/app/projects/new", hint: "Start a new site" },
  { icon: FolderOpen, label: "Open Project", to: "/app/projects", hint: "Browse your work" },
  { icon: Activity, label: "Run Analysis", to: "/app/analysis", hint: "Environmental studies" },
  { icon: FileText, label: "View Reports", to: "/app/reports", hint: "Exports & BIM" },
];

/** Exactly four compact, keyboard-accessible action cards. */
export function QuickActions() {
  return (
    <section aria-labelledby="qa-title">
      <SectionHeading id="qa-title" title="Quick Actions" />
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map((a, i) => (
          <Reveal key={a.label} delay={i * 70} className="h-full">
            <Link
              to={a.to}
              className="group flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary ring-1 ring-primary/15 transition-transform duration-300 group-hover:scale-105">
                <a.icon size={20} />
              </span>
              <span>
                <span className="block text-sm font-extrabold text-ink">{a.label}</span>
                <span className="block text-[12px] text-muted">{a.hint}</span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
