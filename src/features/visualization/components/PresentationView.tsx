import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, X } from "lucide-react";
import { useFullscreen } from "../hooks/useFullscreen";
import type { SlideshowApi } from "../hooks/useSlideshow";
import type { VisualizationState } from "../hooks/useVisualizationState";

interface PresentationViewProps {
  state: VisualizationState;
  show: SlideshowApi;
  /** Root element of the workspace (fullscreen target). */
  root: HTMLElement | null;
}

/**
 * Slide-show chrome: header (title · slide, fullscreen, Exit) and the
 * Previous / Next toolbar. The viewport itself is the shared one — the
 * storyboard just drives which saved view is applied.
 */
export function PresentationHeader({ state, show, root }: PresentationViewProps) {
  const fullscreen = useFullscreen(root);
  const exitRef = useRef<HTMLButtonElement>(null);
  const [announced, setAnnounced] = useState("");
  useEffect(() => {
    exitRef.current?.focus();
  }, []);
  useEffect(() => {
    if (show.slide) setAnnounced(`Slide ${show.index + 1} of ${show.total}: ${show.slide.title}`);
  }, [show.slide, show.index, show.total]);
  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-line bg-surface px-2 sm:px-3" role="region" aria-label="Presentation">
      <p className="min-w-0 truncate text-[13px] font-bold text-ink">
        {state.presentation.presentation?.title ?? "Presentation"}
        {show.slide && <span className="font-medium text-muted"> · {show.slide.title}</span>}
      </p>
      <div className="flex shrink-0 items-center gap-1">
        {fullscreen.supported && (
          <button type="button" onClick={fullscreen.toggle} aria-pressed={fullscreen.active} aria-label={fullscreen.active ? "Exit fullscreen" : "Fullscreen"} title={fullscreen.active ? "Exit fullscreen" : "Fullscreen"} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
            {fullscreen.active ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
        )}
        <button ref={exitRef} type="button" onClick={show.exit} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[12.5px] font-bold text-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20" title="Exit presentation (Esc)">
          <X size={15} aria-hidden="true" /> Exit
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {announced}
      </p>
      <p className="sr-only">Use the left and right arrow keys or Space to move between slides and Escape to exit.</p>
    </div>
  );
}

const navBtn = "inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface/95 px-3 text-[12.5px] font-bold text-ink shadow-float transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none";

export function SlideNavigation({ show }: { show: SlideshowApi }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3 sm:p-4">
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl bg-surface/60 p-1 shadow-soft backdrop-blur-[2px]" role="toolbar" aria-label="Slide navigation">
        <button type="button" onClick={() => show.go(-1)} disabled={show.index <= 0} className={navBtn} aria-label="Previous slide" title="Previous (←)">
          <ChevronLeft size={16} aria-hidden="true" /> <span className="hidden sm:inline">Previous</span>
        </button>
        <span className="min-w-[64px] text-center text-[12px] font-extrabold tabular-nums text-ink" aria-hidden="true">
          {show.total ? `${show.index + 1} / ${show.total}` : "0 / 0"}
        </span>
        <button type="button" onClick={() => show.go(1)} disabled={show.index >= show.total - 1} className={navBtn} aria-label="Next slide" title="Next (→ or Space)">
          <span className="hidden sm:inline">Next</span> <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
