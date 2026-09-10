import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface FormSectionProps {
  id: string;
  step: number;
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}

/** Numbered form card shared by every Create Project section. */
export function FormSection({ id, step, icon: Icon, title, description, children }: FormSectionProps) {
  const headingId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="scroll-mt-24 rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-6"
    >
      <header className="mb-5 flex items-start gap-3.5 border-b border-line pb-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary ring-1 ring-primary/15">
          <Icon size={19} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-faint">Step {step}</p>
          <h2 id={headingId} className="text-lg font-extrabold tracking-tight text-ink">
            {title}
          </h2>
          <p className="mt-0.5 text-[13.5px] text-muted">{description}</p>
        </div>
      </header>
      <div className="grid gap-5">{children}</div>
    </section>
  );
}
