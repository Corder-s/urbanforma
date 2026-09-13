import { Link, useLocation } from "react-router-dom";
import { useSettings } from "../hooks/useSettings";
import { SaveIndicator } from "./controls";

/**
 * Settings footer (§19, §26).
 *
 * The save state also lives in the page header, but a long panel scrolls that
 * out of view — so the indicator is repeated here, pinned to the bottom of the
 * shell's scroll container, where a toggle you just flipped can actually be
 * seen to save. It also states where the data goes (nowhere but this browser)
 * and links to the Danger Zone instead of repeating destructive actions.
 */
export function SettingsFooter() {
  const { saveState } = useSettings();
  const { pathname } = useLocation();

  return (
    <footer className="sticky bottom-0 z-10 mt-4 flex flex-col gap-2 rounded-2xl border border-line bg-surface/95 px-4 py-3 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <p className="text-[12px] leading-snug text-muted">
        Preferences save to this browser as you change them — debounced, no round trip, nothing leaves the
        device.
      </p>
      <div className="flex shrink-0 items-center gap-3">
        <Link
          to={`${pathname}?section=danger`}
          className="text-[12px] font-bold text-danger underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
        >
          Reset or sign out
        </Link>
        <SaveIndicator state={saveState} />
      </div>
    </footer>
  );
}
