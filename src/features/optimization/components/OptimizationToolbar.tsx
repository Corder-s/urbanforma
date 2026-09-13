import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Box, Check, Download, FileText, Map, Save, SlidersHorizontal, Sparkles, Table2 } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { IconButton } from "../../../components/ui/IconButton";
import { VisualizationProjectSwitcher } from "../../visualization/components/VisualizationProjectSwitcher";
import { MODES } from "../data/optimization.data";
import type { OptimizationProjectSummary } from "../services/optimization.service";
import type { ExportFormat, OptimizationMode, ScenarioViewMode } from "../types/optimization.types";

interface OptimizationToolbarProps {
  projects: OptimizationProjectSummary[];
  projectId: string | null;
  projectName: string;
  ready: boolean;
  generating: boolean;
  hasScenarios: boolean;
  mode: OptimizationMode;
  onMode: (m: OptimizationMode) => void;
  viewMode: ScenarioViewMode;
  onViewMode: (v: ScenarioViewMode) => void;
  onGenerate: () => void;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
  onExport: (format: ExportFormat) => void;
  exportedNotice: string | null;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  onSwitchProject: (id: string) => void;
}

/**
 * Module toolbar (the global AppHeader is untouched).
 * Left: back + project · Centre: Optimize / Compare / Review · Right: 2D/3D, Generate, Save, Export.
 *
 * The right cluster is content-sized and the project name is the only thing
 * that shrinks, so nothing overlaps even at 744 px (lg viewport minus the app
 * sidebar). Labels appear progressively: mode tabs, Save/Export labels and the
 * long Generate label at xl, 2D/3D labels at 2xl. Below xl the mode tabs live
 * in a strip under the toolbar; below sm the 2D/3D toggle sits in the bottom bar.
 */
export function OptimizationToolbar({ projects, projectId, projectName, ready, generating, hasScenarios, mode, onMode, viewMode, onViewMode, onGenerate, onSave, saving, dirty, onExport, exportedNotice, inspectorOpen, onToggleInspector, onSwitchProject }: OptimizationToolbarProps) {
  const backTo = projectId ? `/app/projects/${projectId}` : "/app/projects";
  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-2 sm:px-3">
      {/* left (shrinks; the name truncates) */}
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <Link to={backTo} aria-label={projectId ? "Back to project" : "Back to projects"} title={projectId ? "Back to Project" : "Back to Projects"} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
          <ArrowLeft size={19} />
        </Link>
        <VisualizationProjectSwitcher projects={projects} currentId={projectId} currentName={projectName} subtitle="Optimization & Scenario Planning" onSwitch={onSwitchProject} />
      </div>

      {/* centre: mode (self-centred in the free space) */}
      <div role="tablist" aria-label="Optimization mode" className="mx-auto hidden shrink-0 items-center gap-0.5 rounded-xl border border-line bg-surface-2 p-0.5 xl:flex">
        {MODES.map((m) => {
          const active = mode === m.id;
          const disabled = !ready || (m.id !== "optimize" && !hasScenarios);
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={disabled}
              title={disabled && ready ? "Generate scenarios first" : m.hint}
              onClick={() => onMode(m.id)}
              className={["inline-flex h-8 items-center rounded-[9px] px-3 text-[12.5px] font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-50", active ? "bg-surface text-primary shadow-soft" : "text-muted hover:text-ink"].join(" ")}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* right (content-sized) */}
      <div className="ml-auto flex shrink-0 items-center justify-end gap-1 sm:gap-1.5 xl:ml-0">
        <div role="tablist" aria-label="Visualization" className="hidden shrink-0 items-center gap-0.5 rounded-xl border border-line bg-surface-2 p-0.5 sm:flex">
          {(
            [
              { id: "2d", label: "2D", icon: Map },
              { id: "3d", label: "3D Preview", icon: Box },
            ] as const
          ).map((v) => {
            const Icon = v.icon;
            const active = viewMode === v.id;
            return (
              <button key={v.id} type="button" role="tab" aria-selected={active} disabled={!ready} onClick={() => onViewMode(v.id)} title={v.label} className={["inline-flex h-8 items-center gap-1.5 rounded-[9px] px-2 text-[12.5px] font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-50 sm:px-2.5", active ? "bg-surface text-primary shadow-soft" : "text-muted hover:text-ink"].join(" ")}>
                <Icon size={15} aria-hidden="true" />
                <span className="hidden 2xl:inline">{v.label}</span>
                <span className="sr-only 2xl:hidden">{v.label}</span>
              </button>
            );
          })}
        </div>

        <Button size="sm" onClick={onGenerate} disabled={!ready || generating} loading={generating} className="shrink-0 px-3" aria-label={generating ? "Generating scenarios" : "Generate scenarios"}>
          {!generating && <Sparkles size={15} aria-hidden="true" />}
          <span className="hidden xl:inline">{generating ? "Generating…" : hasScenarios ? "Regenerate" : "Generate Scenarios"}</span>
          <span className="xl:hidden">{generating ? "Working…" : "Generate"}</span>
        </Button>

        <button
          type="button"
          onClick={onSave}
          disabled={!ready || saving}
          aria-label={dirty ? "Save optimization (unsaved changes)" : "Save optimization"}
          title={dirty ? "Save (unsaved changes)" : "Save"}
          className={["relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-40", dirty ? "text-primary hover:bg-primary/10" : "text-muted hover:bg-surface-2 hover:text-primary"].join(" ")}
        >
          <Save size={17} aria-hidden="true" />
          <span className="hidden xl:inline">{saving ? "Saving…" : "Save"}</span>
          <span className="sr-only xl:hidden">Save</span>
          {dirty && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />}
        </button>

        <ExportMenu disabled={!ready} onExport={onExport} notice={exportedNotice} />
        <IconButton icon={SlidersHorizontal} label="Scenario details" size="sm" onClick={onToggleInspector} active={inspectorOpen} aria-expanded={inspectorOpen} disabled={!ready} className="xl:hidden disabled:opacity-40" />
      </div>
    </div>
  );
}

function ExportMenu({ disabled, onExport, notice }: { disabled: boolean; onExport: (f: ExportFormat) => void; notice: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    listRef.current?.querySelector("button")?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const moveFocus = (dir: 1 | -1) => {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    items[(i + dir + items.length) % items.length]?.focus();
  };

  const items: { id: ExportFormat; label: string; hint: string; icon: typeof FileText }[] = [
    { id: "summary", label: "Export Scenario Summary", hint: "Goals, constraints, scenarios and trade-offs (text)", icon: FileText },
    { id: "data", label: "Export Comparison Data", hint: "Current plan and scenario metrics as CSV (demo values)", icon: Table2 },
  ];

  return (
    <div ref={ref} className="relative">
      <button ref={triggerRef} type="button" disabled={disabled} onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-controls={id} className={["inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-40", open ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface-2 hover:text-primary"].join(" ")}>
        <Download size={17} aria-hidden="true" />
        <span className="hidden xl:inline">Export</span>
        <span className="sr-only xl:hidden">Export</span>
      </button>
      {open && (
        <ul
          ref={listRef}
          id={id}
          role="menu"
          aria-label="Export"
          className="absolute right-0 top-full z-30 mt-1 w-72 max-w-[calc(100vw_-_1.5rem)] rounded-2xl border border-line bg-surface p-1.5 shadow-float animate-pop motion-reduce:animate-none"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              moveFocus(1);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              moveFocus(-1);
            }
          }}
        >
          <li className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-bold uppercase tracking-widest text-faint" role="presentation">
            Export · demo files
          </li>
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <li key={it.id} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onExport(it.id);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                >
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold text-ink">{it.label}</span>
                    <span className="block text-[11.5px] leading-snug text-muted">{it.hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {notice ?? ""}
      </span>
      {notice && (
        <span className="absolute right-0 top-full z-20 mt-1 inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] font-semibold text-ink shadow-float animate-pop motion-reduce:animate-none" aria-hidden="true">
          <Check size={14} className="text-success" /> {notice}
        </span>
      )}
    </div>
  );
}
