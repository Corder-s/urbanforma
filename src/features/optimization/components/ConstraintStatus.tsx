import { Check, CircleAlert, Minus, TriangleAlert } from "lucide-react";
import { getConstraintDef, formatConstraintValue } from "../data/optimization.data";
import { summariseChecks } from "../lib/scenario.scoring";
import type { ConstraintCheck, ConstraintVerdict } from "../types/optimization.types";

export const VERDICT_META: Record<ConstraintVerdict, { label: string; text: string; bg: string; icon: typeof Check }> = {
  pass: { label: "Pass", text: "text-success", bg: "bg-success/10 ring-success/20", icon: Check },
  warning: { label: "Warning", text: "text-warning", bg: "bg-warning/10 ring-warning/20", icon: TriangleAlert },
  fail: { label: "Fail", text: "text-danger", bg: "bg-danger/10 ring-danger/20", icon: CircleAlert },
  off: { label: "Not enforced", text: "text-faint", bg: "bg-surface-2 ring-line", icon: Minus },
};

export function VerdictIcon({ verdict, size = 14, className = "" }: { verdict: ConstraintVerdict; size?: number; className?: string }) {
  const meta = VERDICT_META[verdict];
  const Icon = meta.icon;
  return (
    <span className={`inline-grid shrink-0 place-items-center rounded-full ring-1 ${meta.bg} ${meta.text} ${className}`} style={{ width: size + 6, height: size + 6 }} role="img" aria-label={meta.label}>
      <Icon size={size - 2} strokeWidth={2.5} aria-hidden="true" />
    </span>
  );
}

/** Compact "3 pass · 1 warning" pill for cards and tables. */
export function ConstraintSummaryPill({ checks, className = "" }: { checks: ConstraintCheck[]; className?: string }) {
  const s = summariseChecks(checks);
  const meta = VERDICT_META[s.worst];
  const text = s.worst === "off" ? "No constraints enforced" : s.worst === "pass" ? "All constraints met" : `${s.fail ? `${s.fail} fail` : ""}${s.fail && s.warning ? " · " : ""}${s.warning ? `${s.warning} warning${s.warning > 1 ? "s" : ""}` : ""}`;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${meta.bg} ${meta.text} ${className}`}>
      <VerdictIcon verdict={s.worst} size={11} />
      {text}
    </span>
  );
}

interface ConstraintStatusProps {
  checks: ConstraintCheck[];
  title?: string;
  dense?: boolean;
}

/** Per-constraint verdict list with the explicit violation text. Viewing is never blocked. */
export function ConstraintStatus({ checks, title = "Constraint Status", dense = false }: ConstraintStatusProps) {
  const s = summariseChecks(checks);
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-faint">{title}</h4>
        <span className="text-[11px] font-semibold text-muted">
          {s.pass} pass · {s.warning} warning · {s.fail} fail
        </span>
      </div>
      <ul className={`mt-2 grid ${dense ? "gap-1" : "gap-1.5"}`}>
        {checks.map((c) => {
          const def = getConstraintDef(c.constraintId);
          const meta = VERDICT_META[c.verdict];
          return (
            <li key={c.constraintId} className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 rounded-lg border border-line bg-white px-2.5 ${dense ? "py-1.5" : "py-2"}`}>
              <VerdictIcon verdict={c.verdict} size={13} className="mt-0.5" />
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[12px] font-bold text-ink">{def.label}</span>
                  <span className={`shrink-0 text-[10.5px] font-extrabold uppercase tracking-wider ${meta.text}`}>{meta.label}</span>
                </div>
                <p className="text-[11px] leading-snug text-muted">
                  {c.verdict === "off" ? "Not enforced." : c.message}
                  {c.verdict !== "off" && <span className="text-faint"> Limit {formatConstraintValue(c.constraintId, c.limit)}.</span>}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
