import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FILTER_PRESETS, SEARCH_DEBOUNCE_MS } from "../data/bim.data";
import { activeFilterCount, filterElements, searchElements, type BimFacets, type BimIndex } from "../lib/bimModel";
import type { BimCategory, BimElement, BimFilterPreset, BimFilters, BimLayerVisibility, BimSearchResult } from "../types/bim.types";

export interface BimFiltersApi {
  /** Committed (debounced, persisted) filters — what the lists actually use. */
  filters: BimFilters;
  /** What the search box shows right now. */
  queryInput: string;
  setQueryInput: (query: string) => void;
  /** True while a keystroke has not been committed yet. */
  searching: boolean;
  results: BimElement[];
  hits: BimSearchResult[];
  facets: BimFacets | null;
  activeCount: number;
  activePreset: BimFilterPreset;
  applyPreset: (preset: BimFilterPreset) => void;
  toggleCategory: (category: BimCategory) => void;
  toggleLevel: (level: string) => void;
  toggleBuilding: (elementId: string) => void;
  toggleMaterial: (material: string) => void;
  toggleVisibleOnly: () => void;
  reset: () => void;
}

function toggleIn<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function presetOf(categories: BimCategory[]): BimFilterPreset {
  const match = FILTER_PRESETS.find((p) => p.categories.length === categories.length && p.categories.every((c) => categories.includes(c)));
  return match?.id ?? "all";
}

/**
 * Typed, reusable BIM filters with a debounced query.
 *
 * The input keeps its own state so typing stays instant; the committed query —
 * the one that drives filtering, search hits and persistence — updates after a
 * short pause, so a 700-element model is never rescanned per keystroke.
 */
export function useBimFilters(
  index: BimIndex | null,
  filters: BimFilters,
  layers: BimLayerVisibility,
  patchFilters: (patch: Partial<BimFilters>) => void,
  resetFilters: () => void
): BimFiltersApi {
  const [queryInput, setQueryInputRaw] = useState(filters.query);
  const committedByUs = useRef<string | null>(null);

  // A project switch / reset replaces the persisted filters: follow them.
  useEffect(() => {
    if (committedByUs.current === filters.query) {
      committedByUs.current = null;
      return;
    }
    setQueryInputRaw(filters.query);
  }, [filters.query]);

  useEffect(() => {
    if (queryInput === filters.query) return;
    const timer = window.setTimeout(() => {
      committedByUs.current = queryInput;
      patchFilters({ query: queryInput });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [queryInput, filters.query, patchFilters]);

  const setQueryInput = useCallback((query: string) => setQueryInputRaw(query.slice(0, 120)), []);

  const results = useMemo(() => (index ? filterElements(index, filters, layers, filters.query) : []), [index, filters, layers]);
  const hits = useMemo(() => (index ? searchElements(index, filters.query, 40) : []), [index, filters.query]);

  const toggleCategory = useCallback((category: BimCategory) => patchFilters({ categories: toggleIn(filters.categories, category) }), [patchFilters, filters.categories]);
  const toggleLevel = useCallback((level: string) => patchFilters({ levels: toggleIn(filters.levels, level) }), [patchFilters, filters.levels]);
  const toggleBuilding = useCallback((elementId: string) => patchFilters({ buildings: toggleIn(filters.buildings, elementId) }), [patchFilters, filters.buildings]);
  const toggleMaterial = useCallback((material: string) => patchFilters({ materials: toggleIn(filters.materials, material) }), [patchFilters, filters.materials]);
  const toggleVisibleOnly = useCallback(() => patchFilters({ visibleOnly: !filters.visibleOnly }), [patchFilters, filters.visibleOnly]);
  const applyPreset = useCallback(
    (preset: BimFilterPreset) => {
      const found = FILTER_PRESETS.find((p) => p.id === preset) ?? FILTER_PRESETS[0];
      patchFilters({ categories: [...found.categories] });
    },
    [patchFilters]
  );
  const reset = useCallback(() => {
    committedByUs.current = null;
    setQueryInputRaw("");
    resetFilters();
  }, [resetFilters]);

  return {
    filters,
    queryInput,
    setQueryInput,
    searching: queryInput !== filters.query,
    results,
    hits,
    facets: index?.facets ?? null,
    activeCount: activeFilterCount(filters),
    activePreset: presetOf(filters.categories),
    applyPreset,
    toggleCategory,
    toggleLevel,
    toggleBuilding,
    toggleMaterial,
    toggleVisibleOnly,
    reset,
  };
}
