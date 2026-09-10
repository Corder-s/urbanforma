import { Search, LayoutGrid, List, X } from "lucide-react";
import { Select } from "../ui/Select";
import { PROJECT_LOCATIONS, PROJECT_STATUSES, ALL_PROJECT_TYPES, SORT_OPTIONS } from "../../features/projects/project.service";
import type { ProjectsFilters } from "../../features/projects/useProjectsFilters";

const slug = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-");

interface ToolbarProps {
  filters: ProjectsFilters;
  on: {
    setQ: (v: string) => void;
    setStatus: (v: string) => void;
    setType: (v: string) => void;
    setLocation: (v: string) => void;
    setUpdated: (v: string) => void;
    setSort: (v: string) => void;
    setView: (v: string) => void;
  };
  resultCount: number;
  hasActiveFilters: boolean;
  onClear: () => void;
}

export function ProjectsToolbar({ filters, on, resultCount, hasActiveFilters, onClear }: ToolbarProps) {
  return (
    <div className="rounded-3xl border border-line bg-white p-4 shadow-soft sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* prominent search */}
        <div className="relative flex-1">
          <label htmlFor="projects-search" className="sr-only">
            Search projects
          </label>
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
          />
          <input
            id="projects-search"
            type="search"
            value={filters.q}
            onChange={(e) => on.setQ(e.target.value)}
            placeholder="Search projects..."
            className="h-11 w-full rounded-xl border border-line bg-canvas pl-10 pr-9 text-sm text-ink placeholder:text-faint transition-all focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/15"
          />
          {filters.q && (
            <button
              type="button"
              onClick={() => on.setQ("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* sort + view */}
        <div className="flex items-center gap-2">
          <Select
            label="Sort"
            value={filters.sort}
            onChange={on.setSort}
            options={SORT_OPTIONS}
            className="flex-1 lg:flex-none"
          />
          <div
            role="group"
            aria-label="View mode"
            className="flex shrink-0 items-center rounded-xl border border-line bg-white p-0.5 shadow-soft"
          >
            <ViewBtn
              label="Grid view"
              active={filters.view === "grid"}
              onClick={() => on.setView("grid")}
            >
              <LayoutGrid size={17} />
            </ViewBtn>
            <ViewBtn
              label="List view"
              active={filters.view === "list"}
              onClick={() => on.setView("list")}
            >
              <List size={17} />
            </ViewBtn>
          </div>
        </div>
      </div>

      {/* filters */}
      <div className="-mx-1 mt-3 flex items-center gap-2 overflow-x-auto px-1 pb-1">
        <Select
          label="Status"
          value={filters.status === "All" ? "all" : slug(filters.status)}
          onChange={on.setStatus}
          options={[
            { value: "all", label: "All" },
            ...PROJECT_STATUSES.map((s) => ({ value: slug(s), label: s })),
          ]}
        />
        <Select
          label="Type"
          value={filters.type === "All" ? "all" : slug(filters.type)}
          onChange={on.setType}
          options={[
            { value: "all", label: "All" },
            ...ALL_PROJECT_TYPES.map((t) => ({ value: slug(t), label: t })),
          ]}
        />
        <Select
          label="Location"
          value={filters.location === "All" ? "all" : slug(filters.location)}
          onChange={on.setLocation}
          options={[
            { value: "all", label: "All" },
            ...PROJECT_LOCATIONS.map((l) => ({ value: slug(l), label: l })),
          ]}
        />
        <Select
          label="Updated"
          value={filters.updated}
          onChange={on.setUpdated}
          options={[
            { value: "anytime", label: "Any time" },
            { value: "today", label: "Today" },
            { value: "week", label: "This week" },
            { value: "month", label: "This month" },
          ]}
        />
      </div>

      {/* result meta */}
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
        <p className="text-[13px] font-medium text-muted" aria-live="polite">
          <span className="font-extrabold text-ink">{resultCount}</span>{" "}
          {resultCount === 1 ? "project" : "projects"}
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-bold text-primary transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <X size={14} /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

function ViewBtn({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={[
        "grid h-9 w-10 place-items-center rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        active ? "bg-primary text-white shadow-glow" : "text-muted hover:bg-surface-2 hover:text-primary",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
