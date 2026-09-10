import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { PROJECT_LOCATIONS, PROJECT_STATUSES, ALL_PROJECT_TYPES, SORT_OPTIONS } from "./project.service";
import type { ProjectSort, ProjectStatus, ProjectType, UpdatedFilter, ViewMode } from "./project.types";

export interface ProjectsFilters {
  q: string;
  status: ProjectStatus | "All";
  type: ProjectType | "All";
  location: string; // "All" or a location name
  updated: UpdatedFilter;
  sort: ProjectSort;
  view: ViewMode;
}

const slug = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-");
const locationSlug = (name: string) => slug(name);

const UPDATED: UpdatedFilter[] = ["anytime", "today", "week", "month"];
const SORTS = SORT_OPTIONS.map((o) => o.value);
const VIEWS: ViewMode[] = ["grid", "list"];

function oneOf<T extends string>(v: string | null, allowed: T[], fallback: T): T {
  return v && (allowed as string[]).includes(v) ? (v as T) : fallback;
}

/** Keeps search/filter/sort/view in the URL so views are shareable/restorable. */
export function useProjectsFilters() {
  const [params, setParams] = useSearchParams();

  const filters: ProjectsFilters = useMemo(() => {
    const statusSlug = params.get("status") ?? "all";
    const status =
      statusSlug === "all"
        ? "All"
        : PROJECT_STATUSES.find((s) => slug(s) === statusSlug) ?? "All";

    const typeSlug = params.get("type") ?? "all";
    const type =
      typeSlug === "all" ? "All" : ALL_PROJECT_TYPES.find((t) => slug(t) === typeSlug) ?? "All";

    const locSlug = params.get("location") ?? "all";
    const location =
      locSlug === "all" ? "All" : PROJECT_LOCATIONS.find((l) => locationSlug(l) === locSlug) ?? "All";

    return {
      q: params.get("q") ?? "",
      status,
      type,
      location,
      updated: oneOf(params.get("updated"), UPDATED, "anytime" as UpdatedFilter),
      sort: oneOf(params.get("sort"), SORTS, "recent" as ProjectSort),
      view: oneOf(params.get("view"), VIEWS, "grid" as ViewMode),
    };
  }, [params]);

  const patch = useCallback(
    (next: Record<string, string | null>) => {
      setParams(
        (prev) => {
          const sp = new URLSearchParams(prev);
          Object.entries(next).forEach(([k, v]) => {
            if (v === null || v === "" || v === "all" || v === "anytime" || v === "recent" || v === "grid") {
              sp.delete(k);
            } else {
              sp.set(k, v);
            }
          });
          return sp;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  const setters = useMemo(
    () => ({
      setQ: (q: string) => patch({ q: q || null }),
      setStatus: (v: string) => patch({ status: v === "all" ? null : v }),
      setType: (v: string) => patch({ type: v === "all" ? null : v }),
      setLocation: (v: string) => patch({ location: v === "all" ? null : v }),
      setUpdated: (v: string) => patch({ updated: v === "anytime" ? null : v }),
      setSort: (v: string) => patch({ sort: v === "recent" ? null : v }),
      setView: (v: string) => patch({ view: v === "grid" ? null : v }),
      clearFilters: () =>
        patch({ q: null, status: null, type: null, location: null, updated: null }),
    }),
    [patch]
  );

  const hasActiveFilters =
    filters.q !== "" ||
    filters.status !== "All" ||
    filters.type !== "All" ||
    filters.location !== "All" ||
    filters.updated !== "anytime";

  return { filters, setters, hasActiveFilters };
}
