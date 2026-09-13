import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import { useAuth } from "../../../auth/AuthProvider";
import { useSettings } from "../../hooks/useSettings";
import { resetLocalData } from "../../services/settings.service";
import { ConfirmAction } from "../ConfirmAction";

type PendingAction = "settings" | "data" | "signout" | null;

const COPY: Record<Exclude<PendingAction, null>, { title: string; description: string; confirmLabel: string }> = {
  settings: {
    title: "Reset all settings?",
    description:
      "Appearance, units, map / visualization / BIM defaults, notifications, accessibility and privacy all return to their shipped values. Projects, drawings, runs, saved views and reports are untouched.",
    confirmLabel: "Reset settings",
  },
  data: {
    title: "Reset all demo data?",
    description:
      "Every stored drawing, scenario, optimization run, analysis result, saved view, report and BIM record in this browser is deleted, and settings return to their defaults. The shipped demo projects come back. This cannot be undone.",
    confirmLabel: "Reset demo data",
  },
  signout: {
    title: "Sign out of UrbanForma?",
    description: "Your session ends on this device. Stored work and settings stay in this browser.",
    confirmLabel: "Sign out",
  },
};

/**
 * Danger Zone (§15).
 *
 * The three irreversible actions in one clearly-marked place, each behind a
 * confirmation dialog that states exactly what is deleted and what survives.
 * None of them can remove the session except the one that says so.
 */
export function DangerSection() {
  const { reset, reload } = useSettings();
  const { logout } = useAuth();
  const [pending, setPending] = useState<PendingAction>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(id);
  }, [notice]);

  const onConfirm = () => {
    if (pending === "settings") {
      reset();
      setNotice("All settings are back to their defaults.");
    } else if (pending === "data") {
      const { removed, keptAuth } = resetLocalData();
      reset();
      reload();
      setNotice(
        keptAuth
          ? `Demo data reset — ${removed} ${removed === 1 ? "key" : "keys"} removed, session kept, settings restored to defaults.`
          : "The browser refused to clear storage. Nothing was removed."
      );
    } else if (pending === "signout") {
      setPending(null);
      logout();
      return;
    }
    setPending(null);
  };

  const copy = pending ? COPY[pending] : null;

  return (
    <>
      <section className="rounded-2xl border border-danger/30 bg-danger/5 p-4 sm:p-5">
        <header className="mb-3 flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger">
            <AlertTriangle size={17} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[15px] font-extrabold tracking-tight text-ink">Danger Zone</h3>
            <p className="mt-0.5 text-[13px] leading-snug text-muted">
              Irreversible actions. Each one asks for confirmation first.
            </p>
          </div>
        </header>

        <ul className="divide-y divide-danger/15">
          <li className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-ink">Reset all settings</p>
              <p className="mt-0.5 text-[12px] leading-snug text-muted">
                Back to shipped defaults. Your work is not touched.
              </p>
            </div>
            <Button size="sm" variant="secondaryDanger" className="shrink-0" onClick={() => setPending("settings")}>
              Reset settings
            </Button>
          </li>
          <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-ink">Reset demo data</p>
              <p className="mt-0.5 text-[12px] leading-snug text-muted">
                Deletes stored drawings, runs, views, reports and BIM records — and settings. Keeps you signed in.
              </p>
            </div>
            <Button size="sm" variant="secondaryDanger" className="shrink-0" onClick={() => setPending("data")}>
              Reset demo data
            </Button>
          </li>
          <li className="flex flex-col gap-2 py-3 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-ink">Sign out</p>
              <p className="mt-0.5 text-[12px] leading-snug text-muted">
                Ends the session on this device. Stored work stays here.
              </p>
            </div>
            <Button size="sm" variant="secondaryDanger" className="shrink-0" onClick={() => setPending("signout")}>
              Sign out
            </Button>
          </li>
        </ul>

        {notice && (
          <p role="status" className="mt-3 text-[12px] font-semibold text-muted">
            {notice}
          </p>
        )}
      </section>

      <ConfirmAction
        open={copy !== null}
        tone="danger"
        title={copy?.title ?? ""}
        description={copy?.description ?? ""}
        confirmLabel={copy?.confirmLabel ?? "Confirm"}
        onConfirm={onConfirm}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
