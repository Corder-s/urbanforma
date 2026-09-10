import { memo } from "react";
import { ArrowDown, ArrowUp, Box, Copy, Map as MapIcon, MoreHorizontal, Pencil, RefreshCw, Trash2 } from "lucide-react";
import type { ScenarioOption } from "../lib/scenarios";
import type { PresentationSlide as Slide, PresentationView } from "../types/visualization.types";
import { MiniPlan } from "./map/MiniPlan";

export interface SlideActions {
  open: (slide: Slide) => void;
  edit: (slide: Slide) => void;
  duplicate: (slide: Slide) => void;
  remove: (slide: Slide) => void;
  move: (slide: Slide, dir: -1 | 1) => void;
  recapture: (slide: Slide) => void;
}

interface PresentationSlideProps {
  slide: Slide;
  view: PresentationView | null;
  index: number;
  total: number;
  active: boolean;
  option: ScenarioOption | null;
  actions: SlideActions;
  menuOpen: boolean;
  onMenu: (open: boolean) => void;
  /** Horizontal strip (mobile bottom sheet) vs vertical list (desktop panel). */
  horizontal?: boolean;
  full: boolean;
}

/**
 * Storyboard card: miniature plan of the slide's scenario, number, title,
 * scenario name and a small action menu (Edit, Duplicate, Move Up/Down,
 * Update from view, Delete). The active slide is outlined.
 */
export const PresentationSlide = memo(function PresentationSlide({ slide, view, index, total, active, option, actions, menuOpen, onMenu, horizontal = false, full }: PresentationSlideProps) {
  const Icon = view?.viewMode === "3d" ? Box : MapIcon;
  const items: { label: string; icon: typeof Pencil; run: () => void; disabled?: boolean; danger?: boolean }[] = [
    { label: "Edit title & description", icon: Pencil, run: () => actions.edit(slide) },
    { label: "Update from current view", icon: RefreshCw, run: () => actions.recapture(slide) },
    { label: "Duplicate", icon: Copy, run: () => actions.duplicate(slide), disabled: full },
    { label: "Move Up", icon: ArrowUp, run: () => actions.move(slide, -1), disabled: index === 0 },
    { label: "Move Down", icon: ArrowDown, run: () => actions.move(slide, 1), disabled: index === total - 1 },
    { label: "Delete", icon: Trash2, run: () => actions.remove(slide), danger: true },
  ];
  return (
    <li className={horizontal ? "w-[188px] shrink-0 snap-start" : ""} data-slide-id={slide.id}>
      <div className={`relative rounded-xl border-2 bg-white transition-colors motion-reduce:transition-none ${active ? "border-primary shadow-glow" : "border-line hover:border-line-strong"}`}>
        <button type="button" onClick={() => actions.open(slide)} aria-current={active ? "true" : undefined} aria-label={`Slide ${index + 1}: ${slide.title}. ${option?.name ?? "Current Plan"}. ${view?.viewMode === "3d" ? "3D" : "2D"} view.`} className="block w-full rounded-[10px] text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
          <div className="relative aspect-[16/10] overflow-hidden rounded-t-[10px] bg-surface-2">
            {option && view ? <MiniPlan data={option.dataset} layers={view.visibleLayers} settings={view.sceneSettings} basemap={view.basemap} thumbnail padding={60} title="" /> : <div className="h-full w-full animate-pulse bg-surface-2 motion-reduce:animate-none" aria-hidden="true" />}
            <span className={`absolute left-1.5 top-1.5 grid h-5 min-w-[20px] place-items-center rounded-md px-1 text-[10.5px] font-extrabold tabular-nums ${active ? "bg-primary text-white" : "bg-white/95 text-ink shadow-soft"}`} aria-hidden="true">
              {index + 1}
            </span>
            <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-md bg-white/95 text-muted shadow-soft" aria-hidden="true">
              <Icon size={12} />
            </span>
          </div>
          <div className="px-2.5 pb-2 pt-1.5 pr-9">
            <p className="truncate text-[12.5px] font-bold text-ink">{slide.title}</p>
            <p className="truncate text-[11px] text-muted">
              {option?.name ?? "Current Plan"}
              {option?.preferred ? " · Preferred" : ""}
            </p>
          </div>
        </button>
        <div className="absolute bottom-1.5 right-1.5">
          <button type="button" onClick={() => onMenu(!menuOpen)} aria-haspopup="menu" aria-expanded={menuOpen} aria-label={`Actions for slide ${index + 1}`} className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
            <MoreHorizontal size={15} />
          </button>
          {menuOpen && (
            <div role="menu" aria-label={`Slide ${index + 1} actions`} className={`absolute z-20 w-52 rounded-xl border border-line bg-white p-1 shadow-float ${horizontal ? "bottom-full right-0 mb-1" : "right-0 top-full mt-1"}`}>
              {items.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => {
                      onMenu(false);
                      item.run();
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-40 ${item.danger ? "text-danger hover:bg-danger/5" : "text-ink hover:bg-surface-2"}`}
                  >
                    <ItemIcon size={14} aria-hidden="true" /> {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </li>
  );
});
