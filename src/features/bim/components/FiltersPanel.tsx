import { useState } from "react";
import { Eye, Filter, RotateCcw, X } from "lucide-react";
import { Checkbox } from "../../../components/ui/Checkbox";
import { IconButton } from "../../../components/ui/IconButton";
import { CATEGORY_ICON, FILTER_PRESETS, getCategory } from "../data/bim.data";
import type { BimFiltersApi } from "../hooks/useBimFilters";
import type { BimCategory, BimFilterPreset } from "../types/bim.types";

interface FiltersPanelProps {
  filters: BimFiltersApi;
  resultCount: number;
  totalCount: number;
  idPrefix: string;
  onClose?: () => void;
}

const chip =
  "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11.5px] font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20";
const chipOn = "border-primary/40 bg-primary/10 text-primary";
const chipOff = "border-line bg-white text-muted hover:border-line-strong hover:text-ink";

/**
 * Typed element filters: presets plus the facets that actually exist in the
 * derived model (categories, levels, buildings, materials) with their counts.
 * The filter set is persisted per project and shared with the tree, the lists
 * and the viewport, so every surface narrows the same way.
 */
export function FiltersPanel({ filters, resultCount, totalCount, idPrefix, onClose }: FiltersPanelProps) {
  const [showAllBuildings, setShowAllBuildings] = useState(false);
  const facets = filters.facets;
  const active = filters.activeCount;

  const categoryCount = (id: BimCategory) => facets?.categories.find((c) => c.id === id)?.count ?? 0;
  const shownBuildings = showAllBuildings ? (facets?.buildings ?? []) : (facets?.buildings ?? []).slice(0, 16);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex shrink-0 items-center gap-1.5 border-b border-line px-2.5 py-2">
        <Filter size={15} className="shrink-0 text-primary" aria-hidden="true" />
        <h2 className="min-w-0 flex-1 truncate text-[12.5px] font-extrabold uppercase tracking-wide text-ink">Filters</h2>
        {active > 0 && (
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary tabular-nums">
            {active} active
          </span>
        )}
        <IconButton icon={RotateCcw} label="Reset all filters" size="xs" onClick={filters.reset} disabled={active === 0} className="shrink-0 disabled:opacity-40" />
        {onClose && <IconButton icon={X} label="Close filters" size="xs" onClick={onClose} className="shrink-0" />}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Group label="Presets" id={`${idPrefix}-presets`}>
          <div className="flex flex-wrap gap-1.5">
            {FILTER_PRESETS.map((p) => {
              const on = filters.activePreset === p.id && p.id !== "all";
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={p.id === "all" ? active === 0 : on}
                  onClick={() => filters.applyPreset(p.id as BimFilterPreset)}
                  className={[chip, p.id === "all" ? (active === 0 ? chipOn : chipOff) : on ? chipOn : chipOff].join(" ")}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </Group>

        <Group label="Categories" id={`${idPrefix}-categories`} note={filters.filters.categories.length > 0 ? `${filters.filters.categories.length} selected` : undefined}>
          <div className="flex flex-wrap gap-1.5">
            {(facets?.categories ?? []).map((c) => {
              const id = c.id as BimCategory;
              const def = getCategory(id);
              const Icon = CATEGORY_ICON[id];
              const on = filters.filters.categories.includes(id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => filters.toggleCategory(id)}
                  title={`${def.plural} — ${c.count} in this model`}
                  className={[chip, on ? chipOn : chipOff].join(" ")}
                >
                  <Icon size={12} aria-hidden="true" />
                  {def.plural}
                  <span className="tabular-nums opacity-70">{c.count}</span>
                </button>
              );
            })}
          </div>
        </Group>

        {(facets?.levels.length ?? 0) > 0 && (
          <Group label="Levels" id={`${idPrefix}-levels`} note={filters.filters.levels.length > 0 ? `${filters.filters.levels.length} selected` : undefined}>
            <div className="flex flex-wrap gap-1.5">
              {(facets?.levels ?? []).map((l) => {
                const on = filters.filters.levels.includes(l.id);
                return (
                  <button key={l.id} type="button" aria-pressed={on} onClick={() => filters.toggleLevel(l.id)} title={`${l.count} elements on ${l.label}`} className={[chip, on ? chipOn : chipOff].join(" ")}>
                    {l.label}
                    <span className="tabular-nums opacity-70">{l.count}</span>
                  </button>
                );
              })}
            </div>
          </Group>
        )}

        {(facets?.buildings.length ?? 0) > 0 && (
          <Group label="Buildings" id={`${idPrefix}-buildings`} note={filters.filters.buildings.length > 0 ? `${filters.filters.buildings.length} selected` : undefined}>
            <div className="flex flex-wrap gap-1.5">
              {shownBuildings.map((b) => {
                const on = filters.filters.buildings.includes(b.id);
                return (
                  <button key={b.id} type="button" aria-pressed={on} onClick={() => filters.toggleBuilding(b.id)} title={`${b.count} elements in ${b.label}`} className={[chip, on ? chipOn : chipOff].join(" ")}>
                    {b.label}
                    <span className="tabular-nums opacity-70">{b.count}</span>
                  </button>
                );
              })}
            </div>
            {(facets?.buildings.length ?? 0) > 16 && (
              <button type="button" onClick={() => setShowAllBuildings((v) => !v)} className="mt-1.5 text-[11.5px] font-bold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
                {showAllBuildings ? "Show fewer buildings" : `Show all ${facets?.buildings.length ?? 0} buildings`}
              </button>
            )}
          </Group>
        )}

        {(facets?.materials.length ?? 0) > 0 && (
          <Group label="Materials" id={`${idPrefix}-materials`} note={filters.filters.materials.length > 0 ? `${filters.filters.materials.length} selected` : undefined}>
            <div className="flex flex-wrap gap-1.5">
              {(facets?.materials ?? []).map((m) => {
                const on = filters.filters.materials.includes(m.id);
                return (
                  <button key={m.id} type="button" aria-pressed={on} onClick={() => filters.toggleMaterial(m.id)} title={`${m.count} elements`} className={[chip, on ? chipOn : chipOff].join(" ")}>
                    {m.label}
                    <span className="tabular-nums opacity-70">{m.count}</span>
                  </button>
                );
              })}
            </div>
          </Group>
        )}

        <Group label="Options" id={`${idPrefix}-options`}>
          <div className="flex items-start gap-2">
            <Checkbox
              id={`${idPrefix}-visible-only`}
              checked={filters.filters.visibleOnly}
              onChange={filters.toggleVisibleOnly}
              label="Only elements shown in the scene"
            />
          </div>
          <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
            <Eye size={12} className="mt-0.5 shrink-0 text-faint" aria-hidden="true" />
            Element visibility follows the GIS layer switches — the model never keeps a second copy of it.
          </p>
        </Group>
      </div>

      <div className="shrink-0 border-t border-line px-3 py-2 text-[11.5px] text-muted" role="status" aria-live="polite">
        <span className="font-bold text-ink tabular-nums">{resultCount.toLocaleString("en-US")}</span> of{" "}
        <span className="tabular-nums">{totalCount.toLocaleString("en-US")}</span> elements match
      </div>
    </div>
  );
}

function Group({ label, id, note, children }: { label: string; id: string; note?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-b border-line px-3 py-2.5">
      <h3 id={id} className="flex items-baseline gap-2 text-[10.5px] font-extrabold uppercase tracking-widest text-faint">
        <span className="flex-1">{label}</span>
        {note && <span className="text-[10.5px] font-bold normal-case tracking-normal text-primary">{note}</span>}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}
