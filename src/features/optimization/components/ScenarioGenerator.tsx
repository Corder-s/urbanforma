import { Check, CircleAlert, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { GENERATION_STEPS } from "../data/optimization.data";
import type { GenerationProgress } from "../hooks/useScenarioGeneration";

interface ScenarioGeneratorProps {
  progress: GenerationProgress;
  onDismiss: () => void;
  onRetry: () => void;
}

/**
 * "Generating planning scenarios…" card shown over the visualization while
 * the local generation sequence plays (~3 s, 0.5 s with reduced motion). Each
 * step is announced through the live region.
 */
export function ScenarioGenerator({ progress, onDismiss, onRetry }: ScenarioGeneratorProps) {
  const pct = Math.round(progress.progress * 100);
  const failed = !!progress.error;
  const title = failed ? "Generation failed" : progress.done ? "Scenarios ready" : "Generating planning scenarios…";
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center p-4">
      <div role={failed ? "alert" : "status"} aria-live="polite" aria-atomic="true" className="pointer-events-auto w-full max-w-sm rounded-2xl border border-line bg-white/95 p-5 shadow-float animate-pop motion-reduce:animate-none">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${failed ? "bg-danger/10 text-danger" : progress.done ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`} aria-hidden="true">
              {failed ? (
                <CircleAlert size={20} />
              ) : progress.done ? (
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
              <p className="text-[12px] text-muted">{failed ? progress.error : progress.done ? "Four planning scenarios were derived from the current plan." : `${GENERATION_STEPS[progress.step]?.label ?? "Working"}…`}</p>
            </div>
          </div>
          {(failed || progress.done) && (
            <button type="button" onClick={onDismiss} aria-label="Dismiss" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
              <X size={16} />
            </button>
          )}
        </div>

        {!failed && (
          <>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.done ? 100 : pct} aria-label="Generation progress">
              <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none" style={{ width: `${progress.done ? 100 : pct}%` }} />
            </div>
            <ol className="mt-3 grid gap-1.5" aria-label="Generation steps">
              {GENERATION_STEPS.map((s, i) => {
                const state = progress.done || i < progress.step ? "done" : i === progress.step ? "active" : "todo";
                return (
                  <li key={s.id} className="flex items-center gap-2 text-[12px]">
                    <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-extrabold ${state === "done" ? "bg-success text-white" : state === "active" ? "bg-primary text-white" : "bg-surface-2 text-faint"}`} aria-hidden="true">
                      {state === "done" ? <Check size={10} strokeWidth={3} /> : i + 1}
                    </span>
                    <span className={state === "todo" ? "text-faint" : state === "active" ? "font-bold text-ink" : "text-muted"}>{s.label}</span>
                    <span className="sr-only">{state === "done" ? " — complete" : state === "active" ? " — in progress" : " — pending"}</span>
                  </li>
                );
              })}
            </ol>
          </>
        )}

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
