import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Building2, MapPin, Route, Search, Shapes, X } from "lucide-react";
import type { VisualizationState } from "../hooks/useVisualizationState";
import { TYPE_LABEL } from "../lib/spatial";
import type { SpatialObject } from "../types/visualization.types";

interface SpatialSearchProps {
  state: VisualizationState;
  onClose: () => void;
}

interface Hit {
  o: SpatialObject;
  score: number;
  detail: string;
}

function detailFor(o: SpatialObject): string {
  switch (o.type) {
    case "building":
      return `${o.properties.landUse} · ${o.properties.floors} floors · ${o.properties.height} m`;
    case "road":
    case "path":
      return o.type === "path" ? "Pedestrian path" : `${o.properties.roadClass} road · ${o.properties.lanes} lanes`;
    case "poi":
      return `${o.properties.category} · point of interest`;
    case "green":
    case "water":
    case "parking":
    case "block":
      return o.properties.category;
    case "transit":
      return `${o.properties.mode} line`;
    case "boundary":
      return "Site boundary";
    default:
      return TYPE_LABEL[o.type];
  }
}

function iconFor(o: SpatialObject) {
  if (o.type === "building") return Building2;
  if (o.type === "road" || o.type === "path" || o.type === "transit") return Route;
  if (o.type === "poi") return MapPin;
  return Shapes;
}

/** Local demo search across selectable objects (name, id, type, land use, zone). */
export function SpatialSearch({ state, onClose }: SpatialSearchProps) {
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const hits = useMemo<Hit[]>(() => {
    const raw = q.trim().toLowerCase();
    const terms = raw.replace(/^building\s+/, "").split(/\s+/).filter(Boolean);
    const pool = state.objects.filter((o) => o.selectable);
    if (terms.length === 0) {
      // default suggestions: a few buildings, roads, POIs
      const pick = (t: SpatialObject["type"], n: number) => pool.filter((o) => o.type === t).slice(0, n);
      return [...pick("building", 3), ...pick("road", 2), ...pick("poi", 2), ...pick("green", 1)].map((o) => ({ o, score: 0, detail: detailFor(o) }));
    }
    const scored: Hit[] = [];
    for (const o of pool) {
      const hay = `${o.name} ${o.id} ${TYPE_LABEL[o.type]} ${detailFor(o)} ${o.layer}`.toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (o.name.toLowerCase() === t || o.id.toLowerCase() === t) score += 10;
        else if (o.name.toLowerCase().startsWith(t)) score += 6;
        else if (hay.includes(t)) score += 2;
        else {
          score = -1;
          break;
        }
      }
      if (score > 0) scored.push({ o, score, detail: detailFor(o) });
    }
    return scored.sort((a, b) => b.score - a.score || a.o.name.localeCompare(b.o.name)).slice(0, 12);
  }, [q, state.objects]);

  useEffect(() => setCursor(0), [q]);

  const choose = (o: SpatialObject) => {
    state.focusObject(o.id);
    onClose();
  };

  return (
    <div role="dialog" aria-label="Search spatial objects" className="flex max-h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-float">
      <div className="flex items-center gap-2 border-b border-line px-3">
        <Search size={16} className="shrink-0 text-faint" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={hits.length > 0}
          aria-controls={listId}
          aria-activedescendant={hits[cursor] ? `${listId}-${cursor}` : undefined}
          aria-autocomplete="list"
          aria-label="Search buildings, roads, zones and points of interest"
          placeholder="Search buildings, roads, zones, POIs…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setCursor((c) => Math.min(hits.length - 1, c + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setCursor((c) => Math.max(0, c - 1));
            } else if (e.key === "Enter" && hits[cursor]) {
              e.preventDefault();
              choose(hits[cursor].o);
            } else if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
          className="h-11 min-w-0 flex-1 bg-transparent text-[14px] text-ink placeholder:text-faint focus:outline-none"
        />
        <button type="button" onClick={onClose} aria-label="Close search" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
          <X size={16} />
        </button>
      </div>
      <ul id={listId} role="listbox" aria-label="Results" className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {hits.length === 0 ? (
          <li className="px-3 py-6 text-center text-[13px] text-muted" role="option" aria-selected={false}>
            No matches for “{q.trim()}”. Try a building id like <span className="font-bold text-ink">B-014</span>, a road, a zone or a POI.
          </li>
        ) : (
          hits.map((h, i) => {
            const Icon = iconFor(h.o);
            const active = i === cursor;
            return (
              <li
                key={h.o.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={active}
                onMouseEnter={() => setCursor(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(h.o)}
                className={["flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2", active ? "bg-primary/10" : "hover:bg-surface-2"].join(" ")}
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${active ? "bg-surface text-primary" : "bg-surface-2 text-muted"}`}>
                  <Icon size={15} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-ink">{h.o.type === "building" ? `Building ${h.o.name}` : h.o.name}</span>
                  <span className="block truncate text-[11.5px] text-muted">{h.detail}</span>
                </span>
                <span className="hidden text-[10.5px] font-bold uppercase tracking-wider text-faint sm:inline">{TYPE_LABEL[h.o.type]}</span>
              </li>
            );
          })
        )}
      </ul>
      <p className="border-t border-line px-3 py-1.5 text-[11px] text-faint">
        {q.trim() ? `${hits.length} result${hits.length === 1 ? "" : "s"}` : "Suggestions"} · Enter selects and centres the view
      </p>
    </div>
  );
}
