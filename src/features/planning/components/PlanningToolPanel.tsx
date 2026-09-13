import { TOOL_GROUPS, TOOLS, type ToolDefinition } from "../data/tools.data";
import type { ToolId } from "../types/planning.types";

interface PlanningToolPanelProps {
  active: ToolId;
  onSelect: (id: ToolId) => void;
  /** Compact icon-only variant (used inside the mobile drawer as a grid). */
  layout?: "list" | "grid";
}

function ToolButton({ tool, active, onSelect, layout }: { tool: ToolDefinition; active: boolean; onSelect: (id: ToolId) => void; layout: "list" | "grid" }) {
  const Icon = tool.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(tool.id)}
      aria-pressed={active}
      aria-label={tool.key ? `${tool.label} (${tool.key})` : tool.label}
      title={`${tool.hint}${tool.key ? ` Shortcut: ${tool.key}` : ""}`}
      className={[
        "group flex items-center gap-2.5 rounded-xl text-left text-[13px] font-semibold transition-colors duration-150 motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
        layout === "grid" ? "flex-col justify-center gap-1.5 px-1 py-2.5 text-center text-[11.5px]" : "h-9 px-2.5",
        active ? "bg-primary text-on-brand shadow-glow" : "text-ink hover:bg-surface-2 hover:text-primary",
      ].join(" ")}
    >
      <span
        className={[
          "grid shrink-0 place-items-center rounded-lg transition-colors",
          layout === "grid" ? "h-9 w-9" : "h-7 w-7",
          active ? "bg-on-brand/15 text-on-brand" : "bg-surface-2 text-muted group-hover:text-primary",
        ].join(" ")}
        aria-hidden="true"
      >
        <Icon size={layout === "grid" ? 18 : 16} />
      </span>
      <span className="min-w-0 flex-1 truncate">{tool.label}</span>
      {layout === "list" && tool.key && (
        <kbd className={["hidden shrink-0 rounded-md px-1.5 py-0.5 font-sans text-[10.5px] font-bold xl:inline", active ? "bg-on-brand/15 text-on-brand" : "bg-surface-2 text-faint"].join(" ")}>
          {tool.key}
        </kbd>
      )}
    </button>
  );
}

/** Left-hand tool palette grouped by Site / Layout / Landscape / Urban Elements / Annotation. */
export function PlanningToolPanel({ active, onSelect, layout = "list" }: PlanningToolPanelProps) {
  return (
    <nav aria-label="Planning tools" className="flex h-full flex-col">
      {layout === "list" && (
        <div className="flex h-11 shrink-0 items-center border-b border-line px-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-faint">Tools</h2>
        </div>
      )}
      <div className={layout === "list" ? "min-h-0 flex-1 overflow-y-auto p-2.5" : "p-1"}>
        {TOOL_GROUPS.map((group) => {
          const tools = TOOLS.filter((t) => t.group === group);
          return (
            <section key={group} aria-labelledby={`tool-group-${group.replace(/\s+/g, "-").toLowerCase()}`} className="mb-3 last:mb-0">
              <h3 id={`tool-group-${group.replace(/\s+/g, "-").toLowerCase()}`} className="mb-1 px-2 text-[10.5px] font-bold uppercase tracking-widest text-faint">
                {group}
              </h3>
              <div className={layout === "grid" ? "grid grid-cols-4 gap-1 sm:grid-cols-6" : "grid gap-0.5"}>
                {tools.map((t) => (
                  <ToolButton key={t.id} tool={t} active={t.id === active} onSelect={onSelect} layout={layout} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
      {layout === "list" && (
        <p className="shrink-0 border-t border-line px-4 py-2.5 text-[11.5px] leading-snug text-faint">
          Tools are conceptual in this version — no CAD engine yet.
        </p>
      )}
    </nav>
  );
}
