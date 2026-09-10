import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="group relative flex h-full flex-col rounded-3xl border border-line bg-white p-7 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-card">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-105">
        <Icon size={26} strokeWidth={2} />
      </div>
      <h3 className="mt-5 text-lg font-extrabold text-ink">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">{description}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary opacity-0 transition-all duration-300 group-hover:opacity-100">
        Learn more <ArrowUpRight size={15} />
      </span>
    </div>
  );
}
