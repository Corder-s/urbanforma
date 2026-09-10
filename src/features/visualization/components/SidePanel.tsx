import { useId, type ReactNode } from "react";
import { X } from "lucide-react";

export interface SidePanelTab<T extends string> {
  id: T;
  label: string;
  /** Small count / status shown next to the label. */
  badge?: string | number;
}

interface SidePanelProps<T extends string> {
  tabs: SidePanelTab<T>[];
  active: T;
  onTab: (id: T) => void;
  onClose?: () => void;
  label: string;
  idPrefix: string;
  children: ReactNode;
}

/**
 * Tabbed side column used on the right of the workspace (docked at xl,
 * drawer below). Tabs are a real tablist; the body scrolls.
 */
export function SidePanel<T extends string>({ tabs, active, onTab, onClose, label, idPrefix, children }: SidePanelProps<T>) {
  const uid = useId();
  const tabId = (id: T) => `${idPrefix}-tab-${id}-${uid}`;
  const panelId = `${idPrefix}-panel-${uid}`;
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-line px-2">
        <div role="tablist" aria-label={label} className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
          {tabs.map((t) => {
            const on = t.id === active;
            return (
              <button
                key={t.id}
                id={tabId(t.id)}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={panelId}
                tabIndex={on ? 0 : -1}
                onClick={() => onTab(t.id)}
                onKeyDown={(e) => {
                  const i = tabs.findIndex((x) => x.id === active);
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
                    onTab(next.id);
                    document.getElementById(tabId(next.id))?.focus();
                  }
                }}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[11.5px] font-bold uppercase tracking-wider transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 ${on ? "bg-primary/10 text-primary" : "text-faint hover:bg-surface-2 hover:text-ink"}`}
              >
                {t.label}
                {t.badge !== undefined && <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${on ? "bg-primary/15" : "bg-surface-2"}`}>{t.badge}</span>}
              </button>
            );
          })}
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label={`Close ${label.toLowerCase()}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
            <X size={16} />
          </button>
        )}
      </div>
      <div id={panelId} role="tabpanel" aria-labelledby={tabId(active)} className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
