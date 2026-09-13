import { Link } from "react-router-dom";
import { AlertCircle, Check, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import type { CreateProjectForm, DraftNotice } from "../../useCreateProjectForm";

const NOTICE_TEXT: Record<NonNullable<DraftNotice>["kind"], string> = {
  saved: "Draft saved",
  restored: "Draft restored",
  discarded: "Draft discarded",
  failed: "Couldn't save draft — storage unavailable",
};

/** Bottom action bar: Cancel · Save Draft · Create Project (+ status notices). */
export function CreateProjectActions({ form }: { form: CreateProjectForm }) {
  const { submitState, draft } = form;
  const submitting = submitState === "submitting";
  const notice = draft.notice;

  return (
    <div className="rounded-3xl border border-line bg-surface p-4 shadow-soft sm:p-5">
      {submitState === "error" && (
        <p role="alert" className="mb-3 flex items-start gap-2 rounded-xl bg-danger/5 px-3.5 py-2.5 text-[13.5px] font-medium text-danger">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          The project couldn't be created. Please try again.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/app/projects" className="shrink-0">
            <Button type="button" variant="ghost" disabled={submitting}>
              Cancel
            </Button>
          </Link>
          <p
            role="status"
            aria-live="polite"
            className={[
              "text-[13px] font-semibold transition-opacity",
              notice ? "opacity-100" : "opacity-0",
              notice?.kind === "failed" ? "text-warning" : "text-success",
            ].join(" ")}
          >
            {notice && (
              <span className="inline-flex items-center gap-1.5">
                {notice.kind === "failed" ? <AlertCircle size={14} aria-hidden="true" /> : notice.kind === "discarded" ? <Trash2 size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
                {NOTICE_TEXT[notice.kind]}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <Button type="button" variant="secondary" onClick={draft.save} disabled={submitting}>
            <Save size={16} /> Save Draft
          </Button>
          <Button type="submit" loading={submitting} disabled={submitting}>
            {submitting ? (
              "Creating Project..."
            ) : (
              <>
                <Plus size={18} /> Create Project
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
