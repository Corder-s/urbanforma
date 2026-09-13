import type { ReactNode } from "react";
import type { DocRow } from "../lib/reportData";

/**
 * Document tables and lists.
 *
 * Built for print: `<thead>` is a header group (browsers repeat it on every
 * printed page), rows are marked `break-inside: avoid` by the print stylesheet,
 * and every status carries a text label plus a glyph so nothing is colour-only.
 */

export type DocTone = "good" | "watch" | "poor" | "neutral" | "accent";

const TONE_CLASS: Record<DocTone, string> = {
  good: "border-success/40 bg-success/10 text-success",
  watch: "border-warning/40 bg-warning/10 text-warning",
  poor: "border-danger/40 bg-danger/10 text-danger",
  neutral: "border-line bg-surface-2 text-muted",
  accent: "border-primary/30 bg-primary/10 text-primary",
};

/** Compact status tag — label first, glyph second, never colour alone. */
export function StatusTag({ tone = "neutral", children, glyph }: { tone?: DocTone; children: ReactNode; glyph?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${TONE_CLASS[tone]}`}>
      {glyph && <span aria-hidden="true">{glyph}</span>}
      {children}
    </span>
  );
}

export const VERDICT_GLYPH: Record<"pass" | "warning" | "fail" | "off", string> = {
  pass: "✓",
  warning: "!",
  fail: "✕",
  off: "–",
};

export function verdictTone(verdict: "pass" | "warning" | "fail" | "off"): DocTone {
  return verdict === "pass" ? "good" : verdict === "warning" ? "watch" : verdict === "fail" ? "poor" : "neutral";
}

/** Signed change with a direction glyph; `null` renders an em dash. */
export function DeltaCell({ deltaPct, higherIsBetter }: { deltaPct: number | null; higherIsBetter: boolean }) {
  if (deltaPct === null || !Number.isFinite(deltaPct)) return <span className="text-faint">—</span>;
  const flat = Math.abs(deltaPct) < 0.05;
  const improved = flat ? null : deltaPct > 0 === higherIsBetter;
  const glyph = flat ? "→" : deltaPct > 0 ? "▲" : "▼";
  const tone: DocTone = improved === null ? "neutral" : improved ? "good" : "poor";
  return (
    <span className={`inline-flex items-center gap-1 font-bold tabular-nums ${improved === null ? "text-muted" : improved ? "text-success" : "text-danger"}`}>
      <span aria-hidden="true">{glyph}</span>
      {flat ? "no change" : `${Math.abs(deltaPct).toFixed(1)}%`}
      <span className="sr-only"> ({tone === "good" ? "improvement" : tone === "poor" ? "reduction" : "unchanged"})</span>
    </span>
  );
}

export interface DocColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
  /** Extra classes on every cell of the column. */
  cellClass?: string;
}

interface DataTableProps<T> {
  caption: string;
  columns: DocColumn<T>[];
  rows: (T & { id: string })[];
  empty?: string;
  /** Tighter type for dense metric tables. */
  dense?: boolean;
}

export function DataTable<T>({ caption, columns, rows, empty = "No data recorded.", dense = false }: DataTableProps<T>) {
  const pad = dense ? "px-2 py-1.5" : "px-2.5 py-2";
  return (
    <div className="report-table w-full overflow-x-auto">
      <table className={`w-full min-w-[420px] border-collapse text-left ${dense ? "text-[11.5px]" : "text-[12.5px]"}`}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line-strong">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={`${pad} whitespace-nowrap text-[10.5px] font-extrabold uppercase tracking-wide text-muted ${
                  c.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-line/70 align-top last:border-b-0">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`${pad} ${c.cellClass ?? ""} ${c.align === "right" ? "text-right tabular-nums" : ""} text-ink`}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="px-2.5 py-3 text-[12px] text-muted">{empty}</p>}
    </div>
  );
}

/** Two-column label/value list — the document's definition table. */
export function DefinitionList({ rows, columns = 2 }: { rows: DocRow[]; columns?: 1 | 2 }) {
  if (rows.length === 0) return null;
  return (
    <dl className={`report-block grid gap-x-6 gap-y-3 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
      {rows.map((r) => (
        <div key={r.label} className="min-w-0 border-b border-line/60 pb-2">
          <dt className="text-[10.5px] font-extrabold uppercase tracking-wide text-muted">{r.label}</dt>
          <dd className="mt-0.5 text-[13px] font-semibold leading-snug text-ink">{r.value}</dd>
          {r.note && <dd className="mt-0.5 text-[11.5px] leading-snug text-muted">{r.note}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** Simple bullet list used for narrative content (findings, actions, changes). */
export function BulletList({ items, ordered = false }: { items: string[]; ordered?: boolean }) {
  if (items.length === 0) return null;
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={`space-y-1.5 text-[12.5px] leading-relaxed text-ink ${ordered ? "list-decimal" : "list-disc"} pl-5`}>
      {items.map((text, i) => (
        <li key={`${i}-${text.slice(0, 24)}`} className="pl-1">
          {text}
        </li>
      ))}
    </Tag>
  );
}
