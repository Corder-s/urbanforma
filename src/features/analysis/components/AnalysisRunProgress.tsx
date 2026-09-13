import { Check, CircleAlert, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { RUN_STEPS } from "../data/analysis.data";
import type { RunProgress } from "../hooks/useAnalysis";

interface AnalysisRunProgressProps {
  run: RunProgress;
  onDismiss: () => void;
  onRetry: () => void;
}

/**
 * "Analyzing site…" card shown over the visualization while the local run
 * sequence plays. Each step is announced via the live region; the whole
 * sequence takes ~2.6 s (0.4 s with reduced motion).
 */
export function AnalysisRunProgress({ run, onDismiss, onRetry }: AnalysisRunProgressProps) {
  const pct = Math.round(run.progress * 100);
  const failed = !!run.error;
  const title = failed ? "Analysis failed" : run.done ? "Analysis Complete" : "Analyzing site…";
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center p-4">
      <div
        role={failed ? "alert" : "status"}
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-auto w-full max-w-sm rounded-2xl border border-line bg-surface/95 p-5 shadow-float animate-pop motion-reduce:animate-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${failed ? "bg-danger/10 text-danger" : run.done ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`} aria-hidden="true">
              {failed ? (
                <CircleAlert size={20} />
              ) : run.done ? (
                <Check size={20} />
              ) : (
                <svg className="h-5 w-5 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
                </svg>
              )}
            </span>
            <div>
              <h3 className="text-[15px] font-extrabold text-ink">{title}</h3>
              <p className="text-[12.5px] text-muted">{failed ? run.error : run.done ? "Results updated for the current plan." : `${RUN_STEPS[run.step].label}…`}</p>
            </div>
          </div>
          {(run.done || failed) && (
            <button type="button" onClick={onDismiss} aria-label="Dismiss" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
              <X size={16} />
            </button>
          )}
        </div>

        {!failed && (
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={run.done ? 100 : pct} aria-valuemin={0} aria-valuemax={100} aria-label="Analysis progress">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-300 ease-linear motion-reduce:transition-none" style={{ width: `${run.done ? 100 : pct}%` }} />
          </div>
        )}

        <ol className="mt-3 grid gap-1.5" aria-label="Analysis steps">
          {RUN_STEPS.map((step, i) => {
            const state = failed ? (i < run.step ? "done" : i === run.step ? "failed" : "todo") : run.done || i < run.step ? "done" : i === run.step ? "active" : "todo";
            return (
              <li key={step.id} className={`flex items-center gap-2 text-[12.5px] ${state === "todo" ? "text-faint" : state === "failed" ? "font-semibold text-danger" : state === "active" ? "font-bold text-ink" : "text-muted"}`}>
                <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ${state === "done" ? "bg-success text-on-brand" : state === "active" ? "bg-primary text-on-brand" : state === "failed" ? "bg-danger text-on-brand" : "bg-surface-2"}`} aria-hidden="true">
                  {state === "done" && <Check size={10} strokeWidth={3} />}
                  {state === "active" && <span className="h-1.5 w-1.5 rounded-full bg-surface" />}
                  {state === "failed" && <X size={10} strokeWidth={3} />}
                </span>
                {step.label}
                <span className="sr-only">{state === "done" ? " — done" : state === "active" ? " — in progress" : state === "failed" ? " — failed" : " — pending"}</span>
              </li>
            );
          })}
        </ol>

        {failed && (
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={onRetry}>
              Try again
            </Button>
            <Button size="sm" variant="secondary" onClick={onDismiss}>
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
