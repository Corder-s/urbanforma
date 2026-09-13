import { useEffect, type RefObject } from "react";
import { Compass, Orbit, Pause, Play, RotateCcw, RotateCw, View, X } from "lucide-react";
import { INSPECT_STEP_DEGREES, type BimInspect360Api } from "../hooks/useBimInspect360";

const btn =
  "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/20 disabled:opacity-40 motion-reduce:transition-none";

interface Inspect360BarProps {
  inspect: BimInspect360Api;
  /**
   * Live azimuth. The 3-D scene writes `textContent` straight to this node about
   * 8× a second — a state update per frame would re-render the whole workspace
   * (model tree included) for one number.
   */
  angleRef: RefObject<HTMLSpanElement>;
  onSwitchTo3d: () => void;
  /** Step the orbit by an exact angle — inspecting without any animation. */
  onNudge: (degrees: number) => void;
}

/**
 * The 360° inspection bar: playback, direction, speed, azimuth and the way out.
 *
 * Everything here is the shared camera rig being driven — the bar owns no scene
 * of its own. Arrow keys step the orbit by an exact angle so a face can be read
 * without any motion at all, which is also what reduced-motion users get by
 * default (the tour starts paused).
 */
export function Inspect360Bar({ inspect, angleRef, onSwitchTo3d, onNudge }: Inspect360BarProps) {
  const { playing, needs3d, motionReduced, togglePlay } = inspect;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (!t || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      // Leave arrow keys to the widgets that use them natively.
      if (t.closest('[role="tablist"], [role="slider"], [role="listbox"], [role="menu"]')) return;

      const key = e.key.toLowerCase();
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (needs3d) return;
        e.preventDefault();
        if (playing) togglePlay();
        // A positive step moves the camera counter-clockwise as seen from above,
        // so ArrowLeft is positive: the arrows turn the camera the way they point.
        onNudge(e.key === "ArrowLeft" ? INSPECT_STEP_DEGREES : -INSPECT_STEP_DEGREES);
      } else if (key === "p" && !needs3d) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [needs3d, playing, togglePlay, onNudge]);

  return (
    <div
      className="pointer-events-auto flex max-w-full items-center gap-1 rounded-xl border border-line bg-surface/95 p-1 shadow-soft backdrop-blur"
      role="group"
      aria-label={`360-degree inspection of ${inspect.targetName}`}
      aria-keyshortcuts="ArrowLeft ArrowRight"
    >
      <span className="ml-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
        <Orbit size={15} />
      </span>

      <p className="min-w-0 max-w-[7rem] truncate text-[11.5px] font-extrabold leading-tight text-ink sm:max-w-[11rem]" title={inspect.targetName}>
        {inspect.targetName}
        {motionReduced && !playing && <span className="sr-only"> Playback starts paused because reduced motion is on.</span>}
      </p>

      {needs3d ? (
        <button
          type="button"
          onClick={onSwitchTo3d}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-[11.5px] font-bold text-on-brand transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/30 motion-reduce:transition-none"
        >
          <View size={14} aria-hidden="true" />
          Switch to 3-D
        </button>
      ) : (
        <>
          <span className="mx-0.5 h-6 w-px shrink-0 bg-line" aria-hidden="true" />
          <button
            type="button"
            className={btn}
            onClick={togglePlay}
            aria-label={playing ? "Pause the orbit" : "Play the orbit"}
            title={motionReduced ? "Play — paused because reduced motion is on (P)" : playing ? "Pause (P)" : "Play (P)"}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button
            type="button"
            className={btn}
            onClick={inspect.toggleDirection}
            aria-label={inspect.clockwise ? "Orbit clockwise — switch to counter-clockwise" : "Orbit counter-clockwise — switch to clockwise"}
            title={inspect.clockwise ? "Clockwise" : "Counter-clockwise"}
          >
            {inspect.clockwise ? <RotateCw size={15} /> : <RotateCcw size={15} />}
          </button>
          <button
            type="button"
            className="inline-flex h-8 shrink-0 items-center rounded-lg px-2 text-[11.5px] font-bold tabular-nums text-muted transition-colors hover:bg-surface-2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/20 motion-reduce:transition-none"
            onClick={inspect.cycleSpeed}
            title="Orbit speed — click to change"
            aria-label={`Orbit speed ${inspect.speed} degrees per second — click to change`}
          >
            {inspect.speed}°/s
          </button>

          <span className="mx-0.5 hidden h-6 w-px shrink-0 bg-line sm:block" aria-hidden="true" />
          <span className="hidden shrink-0 items-center gap-1 rounded-lg px-1.5 text-[11.5px] font-bold tabular-nums text-muted sm:inline-flex" title="Azimuth">
            <Compass size={13} aria-hidden="true" />
            <span ref={angleRef} aria-live="off">
              —
            </span>
          </span>
          <span className="hidden shrink-0 pl-1 pr-0.5 text-[11px] text-muted lg:inline">← → step</span>
        </>
      )}

      <button
        type="button"
        className={btn}
        onClick={inspect.exit}
        aria-label="Exit the 360-degree inspection"
        title="Exit 360° (Esc)"
      >
        <X size={16} />
      </button>
    </div>
  );
}
