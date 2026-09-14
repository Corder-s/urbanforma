import { useCallback, useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { useSettings } from "../../hooks/useSettings";
import { downloadTextFile, formatBytes } from "../../lib/download";
import {
  clearCategory,
  exportLocalData,
  exportSettings,
  resetLocalData,
  storageInventory,
  type DataCategory,
} from "../../services/settingsData.service";
import { ConfirmAction } from "../ConfirmAction";
import { InlineNote, SettingsPanel } from "../controls";

type PendingAction =
  | { kind: "category"; category: DataCategory; label: string; hint: string; keys: number }
  | { kind: "everything"; keys: number }
  | null;

/**
 * Data & storage (§13).
 *
 * The whole local footprint in one place: what is stored, how big it is, an
 * export of it, and a per-category clear. Every deletion goes through
 * `ConfirmAction`, and authentication keys are structurally excluded — they are
 * not in the inventory's clearable list, so this screen cannot sign anyone out
 * by accident.
 */
export function DataSection() {
  const { reload } = useSettings();
  const [inventory, setInventory] = useState(() => storageInventory());
  const [pending, setPending] = useState<PendingAction>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(() => setInventory(storageInventory()), []);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(id);
  }, [notice]);

  const totalKeys = inventory.categories.reduce((sum, category) => sum + category.keys.length, 0);

  const onExportSettings = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(`urbanforma-settings-${stamp}.json`, exportSettings());
    setNotice("Settings exported as JSON.");
  };

  const onExportEverything = () => {
    const { fileName, payload, keys } = exportLocalData();
    downloadTextFile(fileName, payload);
    setNotice(`Exported ${keys} stored ${keys === 1 ? "key" : "keys"} — authentication excluded.`);
  };

  const onConfirm = () => {
    if (!pending) return;
    if (pending.kind === "category") {
      const removed = clearCategory(pending.category);
      setNotice(`Cleared ${removed} ${removed === 1 ? "key" : "keys"} from “${pending.label}”.`);
    } else {
      const { removed, keptAuth } = resetLocalData();
      setNotice(
        keptAuth
          ? `Demo data reset — ${removed} ${removed === 1 ? "key" : "keys"} removed. Your session was kept.`
          : "The browser refused to clear storage. Nothing was removed."
      );
    }
    setPending(null);
    refresh();
    // Clearing the "preferences" category removes the settings blob itself, so
    // the provider re-reads (and falls back to defaults) rather than holding a
    // stale tree in memory.
    reload();
  };

  return (
    <>
      <SettingsPanel title="Export" description="Take a copy of what this browser holds.">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="sm" variant="secondary" onClick={onExportSettings}>
            Export settings (JSON)
          </Button>
          <Button size="sm" variant="secondary" onClick={onExportEverything}>
            Export all local data (JSON)
          </Button>
        </div>
        {notice && (
          <p role="status" className="mt-3 text-[12px] font-semibold text-muted">
            {notice}
          </p>
        )}
        <InlineNote>
          Exports are plain JSON built in the browser. Session and authentication keys are never included.
        </InlineNote>
      </SettingsPanel>

      <div className="mt-4">
        <SettingsPanel
          title="Stored data"
          description="Demo work saved in this browser, grouped by module."
          aside={
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-bold text-muted">
              {totalKeys} {totalKeys === 1 ? "key" : "keys"} · {formatBytes(inventory.totalBytes)}
            </span>
          }
        >
          {inventory.categories.length === 0 ? (
            <p className="py-2 text-[13px] text-muted">
              Nothing stored yet. Saved views, drawings, analysis runs, reports and BIM records appear here
              as you use the workspace.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {inventory.categories.map((entry) => (
                <li key={entry.meta.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-ink">{entry.meta.label}</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-muted">{entry.meta.hint}</p>
                    <p className="mt-1 text-[11px] font-semibold text-faint">
                      {entry.keys.length} {entry.keys.length === 1 ? "key" : "keys"} · {formatBytes(entry.bytes)}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Button
                      size="sm"
                      variant="secondaryDanger"
                      onClick={() =>
                        setPending({
                          kind: "category",
                          category: entry.meta.id,
                          label: entry.meta.label,
                          hint: entry.meta.hint,
                          keys: entry.keys.length,
                        })
                      }
                    >
                      Clear
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-line bg-canvas px-3 py-2.5">
            <Lock size={15} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-bold text-ink">
                Authentication
                <Badge tone="green">Never cleared here</Badge>
              </p>
              <p className="mt-0.5 text-[12px] leading-snug text-muted">
                {inventory.auth.length > 0
                  ? `${inventory.auth.length} session ${inventory.auth.length === 1 ? "key" : "keys"} are held and excluded from every action on this screen.`
                  : "No session keys are present."}{" "}
                Signing out is an explicit action in Account or the Danger Zone.
              </p>
            </div>
          </div>
        </SettingsPanel>
      </div>

      <div className="mt-4">
        <SettingsPanel
          title="Reset demo data"
          description="Clears every module's stored work and returns the workspace to its shipped demo state. Your session is kept."
        >
          <Button size="sm" variant="secondaryDanger" onClick={() => setPending({ kind: "everything", keys: totalKeys })}>
            Reset demo data
          </Button>
        </SettingsPanel>
      </div>

      <ConfirmAction
        open={pending !== null}
        tone="danger"
        title={pending?.kind === "everything" ? "Reset all demo data?" : `Clear “${pending?.kind === "category" ? pending.label : ""}”?`}
        description={
          pending?.kind === "everything"
            ? "Every stored drawing, scenario, analysis run, saved view, report and BIM record in this browser is deleted, along with your workspace settings. The shipped demo projects return. This cannot be undone."
            : pending?.kind === "category"
              ? `${pending.hint} ${pending.keys} ${pending.keys === 1 ? "key" : "keys"} will be deleted from this browser. This cannot be undone.`
              : ""
        }
        confirmLabel={pending?.kind === "everything" ? "Reset demo data" : "Clear data"}
        onConfirm={onConfirm}
        onCancel={() => setPending(null)}
      >
        {pending?.kind === "category" && pending.category === "preferences" && (
          <p className="mt-3 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] leading-relaxed text-ink">
            This category includes the settings themselves — appearance, units, defaults and notification
            preferences return to their shipped values.
          </p>
        )}
      </ConfirmAction>
    </>
  );
}
