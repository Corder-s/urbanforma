import { CHANGE_TYPE_META } from "../data/optimization.data";
import type { ScenarioChange } from "../types/optimization.types";

interface ScenarioChangesProps {
  changes: ScenarioChange[];
  title?: string;
}

/** Typed scenario change list (Added / Reduced / Moved / Reconfigured) — descriptive, not engineering output. */
export function ScenarioChanges({ changes, title = "Scenario Changes" }: ScenarioChangesProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-faint">{title}</h4>
        <span className="text-[11px] font-semibold text-muted">{changes.length} items</span>
      </div>
      <ul className="mt-2 grid gap-1.5">
        {changes.map((c) => {
          const meta = CHANGE_TYPE_META[c.type];
          return (
            <li key={c.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2.5 rounded-lg border border-line bg-white px-2.5 py-2">
              <span className={`mt-0.5 inline-flex min-w-[76px] items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ring-1 ${meta.tone}`}>{c.type}</span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-bold text-ink">{c.text}</p>
                {c.detail && <p className="text-[11px] leading-snug text-muted">{c.detail}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
