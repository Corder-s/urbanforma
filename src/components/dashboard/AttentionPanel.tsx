import { Link } from "react-router-dom";
import { BellRing, CheckCircle2, ArrowRight } from "lucide-react";
import type { AttentionItem } from "../../features/projects/project.types";
import { Reveal } from "../landing/Reveal";
import { SectionHeading } from "./SectionHeading";
import { Button } from "../ui/Button";

/** Items that genuinely need the user's action. Never invents critical warnings. */
export function AttentionPanel({ items }: { items: AttentionItem[] }) {
  return (
    <section aria-labelledby="attention-title">
      <SectionHeading id="attention-title" title="Needs Your Attention" />
      <Reveal className="h-full">
        <div className="flex h-full flex-col gap-3 rounded-3xl border border-line bg-surface p-5 shadow-soft">
          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-success/10 text-success">
                <CheckCircle2 size={24} />
              </span>
              <p className="text-sm font-extrabold text-ink">All caught up</p>
              <p className="max-w-[220px] text-[13px] text-muted">Nothing needs your attention.</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-2xl border border-line bg-surface-2/60 p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-warning/10 text-warning">
                    <BellRing size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-ink">{item.title}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{item.text}</p>
                  </div>
                </div>
                <Link to={item.to} className="self-start">
                  <Button size="sm" variant="secondary">
                    {item.actionLabel} <ArrowRight size={15} />
                  </Button>
                </Link>
              </div>
            ))
          )}
        </div>
      </Reveal>
    </section>
  );
}
