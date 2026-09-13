import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, ChevronsDownUp, ChevronsUpDown, RotateCcw, EyeOff, Layers3, Search, X } from "lucide-react";
import { IconButton } from "../../../components/ui/IconButton";
import { CATEGORY_ICON } from "../data/bim.data";
import { MAX_LIST_ROWS, ancestorIds, type BimIndex } from "../lib/bimModel";
import type { BimElement, BimTreeNode } from "../types/bim.types";
import { NoElementsMatch } from "./BimStates";

interface ModelTreeProps {
  tree: BimTreeNode[];
  index: BimIndex | null;
  selectedId: string | null;
  onSelect: (id: string, opts?: { focus?: boolean }) => void;
  /** Flat result set while a search or facet filter is active. */
  results: BimElement[];
  filtering: boolean;
  filterCount: number;
  queryInput: string;
  onQueryChange: (query: string) => void;
  searching: boolean;
  onClearFilters: () => void;
  /** Unique id prefix — the tree is mounted twice (dock + drawer). */
  idPrefix: string;
  onClose?: () => void;
}

interface FlatRow {
  element: BimElement;
  depth: number;
  hasChildren: boolean;
  descendants: number;
}

/** Rows currently visible in the tree (children of collapsed nodes are hidden). */
function flatten(tree: BimTreeNode[], expanded: Set<string>): FlatRow[] {
  const out: FlatRow[] = [];
  const walk = (nodes: BimTreeNode[]) => {
    for (const node of nodes) {
      out.push({ element: node.element, depth: node.depth, hasChildren: node.children.length > 0, descendants: node.descendants });
      if (node.children.length > 0 && expanded.has(node.element.id)) walk(node.children);
    }
  };
  walk(tree);
  return out;
}

const topTwoLevels = (tree: BimTreeNode[]) => tree.flatMap((n) => [n.element.id, ...n.children.map((c) => c.element.id)]);

function groupIds(tree: BimTreeNode[]): string[] {
  const out: string[] = [];
  const walk = (nodes: BimTreeNode[]) => {
    for (const n of nodes) {
      if (n.children.length > 0) {
        out.push(n.element.id);
        walk(n.children);
      }
    }
  };
  walk(tree);
  return out;
}

const rowBase =
  "flex w-full items-center gap-1.5 rounded-lg py-1.5 pl-1.5 pr-2 text-left transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/20";

/**
 * Model tree — the hierarchical element list of the active model.
 *
 * Collapsed below its second level by default (a derived model has hundreds of
 * elements) and it follows the selection made anywhere else in the module:
 * selecting an element in the viewport or from an issue expands its ancestors
 * and scrolls the row into view. While a search or facet filter is active the
 * tree is replaced by the flat result list, so what you see is exactly what the
 * filters produced.
 *
 * Keyboard: ArrowUp/Down move, ArrowRight expands (then descends), ArrowLeft
 * collapses (then ascends), Home/End jump, Enter selects. Clicking a node with
 * children both selects and expands it, so the row stays a single control.
 */
export function ModelTree({
  tree,
  index,
  selectedId,
  onSelect,
  results,
  filtering,
  filterCount,
  queryInput,
  onQueryChange,
  searching,
  onClearFilters,
  idPrefix,
  onClose,
}: ModelTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(topTwoLevels(tree)));
  const rowsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const searchId = `${idPrefix}-tree-search`;

  // A new model / revision starts collapsed to its first two levels.
  useEffect(() => {
    setExpanded(new Set(topTwoLevels(tree)));
  }, [tree]);

  // Follow an external selection (viewport click, issue, deep link).
  useEffect(() => {
    if (!selectedId || !index) return;
    const ancestors = ancestorIds(index, selectedId);
    if (ancestors.length === 0) return;
    setExpanded((prev) => {
      if (ancestors.every((id) => prev.has(id))) return prev;
      const next = new Set(prev);
      for (const id of ancestors) next.add(id);
      return next;
    });
  }, [selectedId, index]);

  const rows = useMemo(() => (filtering ? [] : flatten(tree, expanded)), [tree, expanded, filtering]);
  const shownResults = useMemo(() => results.slice(0, MAX_LIST_ROWS), [results]);
  const activeRows = filtering ? shownResults : rows.map((r) => r.element);

  useEffect(() => {
    if (!selectedId) return;
    rowsRef.current.get(selectedId)?.scrollIntoView({ block: "nearest" });
  }, [selectedId, expanded, filtering]);

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => setExpanded(new Set(groupIds(tree))), [tree]);
  const collapseAll = useCallback(() => setExpanded(new Set(tree.map((n) => n.element.id))), [tree]);

  const moveFocus = useCallback(
    (from: string, delta: number) => {
      const ids = activeRows.map((r) => r.id);
      const i = ids.indexOf(from);
      const next = ids[Math.min(ids.length - 1, Math.max(0, i + delta))];
      if (next) rowsRef.current.get(next)?.focus();
    },
    [activeRows]
  );

  const onRowKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, row: FlatRow | null, element: BimElement) => {
      const ids = activeRows.map((r) => r.id);
      const i = ids.indexOf(element.id);
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          moveFocus(element.id, 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          moveFocus(element.id, -1);
          break;
        case "Home":
          e.preventDefault();
          if (ids[0]) rowsRef.current.get(ids[0])?.focus();
          break;
        case "End":
          e.preventDefault();
          if (ids.length > 0) rowsRef.current.get(ids[ids.length - 1])?.focus();
          break;
        case "ArrowRight":
          if (!row) return;
          e.preventDefault();
          if (row.hasChildren && !expanded.has(row.element.id)) toggle(row.element.id);
          else if (i < ids.length - 1) moveFocus(element.id, 1);
          break;
        case "ArrowLeft":
          if (!row) return;
          e.preventDefault();
          if (row.hasChildren && expanded.has(row.element.id)) toggle(row.element.id);
          else if (row.element.parentId) rowsRef.current.get(row.element.parentId)?.focus();
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          onSelect(element.id);
          break;
        default:
          break;
      }
    },
    [activeRows, expanded, toggle, moveFocus, onSelect]
  );

  const setRowRef = useCallback(
    (id: string) => (el: HTMLButtonElement | null) => {
      if (el) rowsRef.current.set(id, el);
      else rowsRef.current.delete(id);
    },
    []
  );

  const total = filtering ? results.length : (index?.elements.length ?? 0);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex shrink-0 items-center gap-1 border-b border-line px-2.5 py-2">
        <Layers3 size={15} className="shrink-0 text-primary" aria-hidden="true" />
        <h2 className="min-w-0 flex-1 truncate text-[12.5px] font-extrabold uppercase tracking-wide text-ink">Model tree</h2>
        <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted tabular-nums" title={filtering ? "Matching elements" : "Elements in the model"}>
          {total.toLocaleString("en-US")}
        </span>
        {!filtering && (
          <>
            <IconButton icon={ChevronsUpDown} label="Expand all levels" size="xs" onClick={expandAll} className="shrink-0" />
            <IconButton icon={ChevronsDownUp} label="Collapse to top level" size="xs" onClick={collapseAll} className="shrink-0" />
          </>
        )}
        {onClose && <IconButton icon={X} label="Close model tree" size="xs" onClick={onClose} className="shrink-0" />}
      </div>

      <div className="shrink-0 border-b border-line p-2">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            value={queryInput}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search elements, ids, levels…"
            autoComplete="off"
            aria-describedby={`${searchId}-hint`}
            className="h-9 w-full rounded-lg border border-line bg-white pl-8 pr-8 text-[12.5px] text-ink placeholder:text-faint focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          />
          {queryInput && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-faint hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <p id={`${searchId}-hint`} className="mt-1 px-0.5 text-[11px] text-muted" role="status" aria-live="polite">
          {searching
            ? "Searching…"
            : filtering
              ? `${results.length.toLocaleString("en-US")} match${results.length === 1 ? "" : "es"}${filterCount > 1 ? ` · ${filterCount} filters active` : ""}`
              : "Search the model, or browse the tree with the arrow keys."}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
        {filtering ? (
          shownResults.length === 0 ? (
            <NoElementsMatch query={queryInput} filterCount={filterCount} onReset={onClearFilters} />
          ) : (
            <ul className="grid gap-0.5" aria-label="Matching elements">
              {shownResults.map((el, i) => (
                <li key={el.id}>
                  <button
                    ref={setRowRef(el.id)}
                    type="button"
                    tabIndex={el.id === selectedId || (selectedId === null && i === 0) ? 0 : -1}
                    onClick={() => onSelect(el.id)}
                    onKeyDown={(e) => onRowKeyDown(e, null, el)}
                    title={`${el.name} · ${el.id}`}
                    aria-current={el.id === selectedId ? "true" : undefined}
                    className={[rowBase, el.id === selectedId ? "bg-primary/10 text-primary" : "text-ink hover:bg-surface-2"].join(" ")}
                  >
                    <RowIcon element={el} selected={el.id === selectedId} />
                    <RowLabel element={el} selected={el.id === selectedId} caption={captionFor(el)} />
                  </button>
                </li>
              ))}
              {results.length > shownResults.length && (
                <li className="px-2 py-1.5 text-[11.5px] leading-relaxed text-muted">
                  Showing the first {shownResults.length.toLocaleString("en-US")} of {results.length.toLocaleString("en-US")} matches —
                  narrow the search or the filters to see the rest.
                </li>
              )}
            </ul>
          )
        ) : rows.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12px] text-muted">This model has no elements yet.</p>
        ) : (
          <div role="tree" aria-label="Model elements" aria-multiselectable="false">
            {rows.map((row, i) => {
              const isOpen = expanded.has(row.element.id);
              const selected = row.element.id === selectedId;
              return (
                <div key={row.element.id} role="presentation" style={{ paddingLeft: row.depth * 12 }}>
                  <button
                    ref={setRowRef(row.element.id)}
                    type="button"
                    role="treeitem"
                    aria-level={row.depth + 1}
                    aria-expanded={row.hasChildren ? isOpen : undefined}
                    aria-selected={selected}
                    tabIndex={selected || (selectedId === null && i === 0) ? 0 : -1}
                    onClick={() => {
                      if (row.hasChildren) toggle(row.element.id);
                      onSelect(row.element.id);
                    }}
                    onKeyDown={(e) => onRowKeyDown(e, row, row.element)}
                    title={`${row.element.name} · ${row.element.id}`}
                    className={[rowBase, selected ? "bg-primary/10 text-primary" : "text-ink hover:bg-surface-2"].join(" ")}
                  >
                    {row.hasChildren ? (
                      <span className="grid h-5 w-5 shrink-0 place-items-center text-muted" aria-hidden="true">
                        {isOpen ? <ChevronsDownUp size={13} /> : <ChevronRight size={13} />}
                      </span>
                    ) : (
                      <span className="h-5 w-5 shrink-0" aria-hidden="true" />
                    )}
                    <RowIcon element={row.element} selected={selected} />
                    <RowLabel
                      element={row.element}
                      selected={selected}
                      caption={row.hasChildren ? `${row.descendants.toLocaleString("en-US")} element${row.descendants === 1 ? "" : "s"}` : captionFor(row.element)}
                    />
                    {row.hasChildren && row.element.childCount !== undefined && (
                      <span className="shrink-0 rounded-full bg-surface-2 px-1.5 py-px text-[10px] font-bold text-muted tabular-nums">{row.element.childCount}</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {filtering && (
        <div className="shrink-0 border-t border-line p-2">
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-bold text-muted transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          >
            <RotateCcw size={13} aria-hidden="true" /> Clear search & filters
          </button>
        </div>
      )}
    </div>
  );
}

function RowIcon({ element, selected }: { element: BimElement; selected: boolean }) {
  const Icon = CATEGORY_ICON[element.category];
  return <Icon size={14} className={`shrink-0 ${selected ? "text-primary" : "text-faint"}`} aria-hidden="true" />;
}

function RowLabel({ element, selected, caption }: { element: BimElement; selected: boolean; caption: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className={`flex items-center gap-1 truncate text-[12.5px] font-semibold leading-tight ${element.visible ? "" : "text-muted"}`}>
        <span className="truncate">{element.name}</span>
        {!element.visible && (
          <span className="shrink-0 text-faint" title="Hidden by the GIS layer switches">
            <EyeOff size={11} aria-hidden="true" />
            <span className="sr-only"> (hidden by the GIS layer switches)</span>
          </span>
        )}
      </span>
      {caption && <span className={`block truncate text-[10.5px] font-medium leading-tight ${selected ? "text-primary/80" : "text-muted"}`}>{caption}</span>}
    </span>
  );
}

function captionFor(el: BimElement): string {
  const bits: string[] = [];
  if (el.level) bits.push(el.level);
  if (el.material) bits.push(el.material);
  if (el.area) bits.push(`${Math.round(el.area).toLocaleString("en-US")} m²`);
  else if (el.length) bits.push(`${Math.round(el.length).toLocaleString("en-US")} m`);
  return bits.join(" · ");
}
