import { Check, CircleAlert, Cloud, CloudOff, GitBranch, Loader2 } from "lucide-react";
import type { OptimizationWorkspaceState } from "../hooks/useOptimizationState";
import { relativeDay } from "../hooks/useOptimizationState";

interface OptimizationStatusBarProps {
  state: OptimizationWorkspaceState;
}

/** Module-only status bar (h-8): save state · generation · selection · versions · view. */
export function OptimizationStatusBar({ state }: OptimizationStatusBarProps) {
  const { saveState, dirty, generationStatus, scenarios, versions, viewMode, mode } = state;
  const selectedScenario = scenarios.find((s) => s.status === "Selected") ?? null;
  const lastGeneratedAt = state.state?.lastGeneratedAt ?? null;
  const save =
    saveState.status === "saving"
      ? { icon: Loader2, text: "Saving…", tone: "text-muted", spin: true }
      : saveState.status === "saved"
        ? { icon: Check, text: "Saved locally", tone: "text-success", spin: false }
        : saveState.status === "error"
          ? { icon: CircleAlert, text: "Save failed", tone: "text-danger", spin: false }
          : dirty
            ? { icon: CloudOff, text: "Unsaved changes", tone: "text-warning", spin: false }
            : { icon: Cloud, text: "Up to date", tone: "text-muted", spin: false };
  const SaveIcon = save.icon;
  const gen = generationStatus === "generating" ? "Generating scenarios…" : generationStatus === "error" ? "Generation failed" : scenarios.length > 0 ? `${scenarios.length} scenarios · generated ${lastGeneratedAt ? relativeDay(lastGeneratedAt) : "—"}` : "No scenarios generated";

  return (
    <div className="flex h-8 shrink-0 items-center gap-3 overflow-hidden border-t border-line bg-white px-3 text-[11px] text-muted" role="status" aria-live="polite" aria-label="Optimization status">
      <span className={`inline-flex shrink-0 items-center gap-1 font-bold ${save.tone}`}>
        <SaveIcon size={12} className={save.spin ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" />
        {save.text}
      </span>
      <span className="hidden h-3 w-px bg-line sm:block" aria-hidden="true" />
      <span className="hidden truncate sm:inline">{gen}</span>
      <span className="hidden h-3 w-px bg-line md:block" aria-hidden="true" />
      <span className="hidden truncate md:inline">
        Preferred: <span className="font-bold text-ink">{selectedScenario ? selectedScenario.name : "none"}</span>
      </span>
      <span className="ml-auto hidden shrink-0 items-center gap-1 lg:inline-flex">
        <GitBranch size={12} aria-hidden="true" /> {`${versions.length} version${versions.length === 1 ? "" : "s"}`}
      </span>
      <span className="ml-auto shrink-0 font-semibold uppercase tracking-wider text-faint lg:ml-0">
        {mode} · {viewMode === "3d" ? "3D" : "2D"} · Demo
      </span>
    </div>
  );
}
