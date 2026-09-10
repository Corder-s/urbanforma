import { useCallback, useEffect, useState } from "react";

/**
 * Fullscreen API wrapper for the workspace element. `supported` is false where
 * the API is missing (e.g. iOS Safari for non-video elements) so the toolbar
 * can hide the control instead of offering something that will not work.
 */
export function useFullscreen(target: HTMLElement | null) {
  const [active, setActive] = useState(false);
  const supported = typeof document !== "undefined" && typeof document.documentElement.requestFullscreen === "function" && (document.fullscreenEnabled ?? true);

  useEffect(() => {
    const onChange = () => setActive(!!document.fullscreenElement && document.fullscreenElement === target);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [target]);

  const enter = useCallback(async () => {
    if (!target || !supported) return;
    try {
      await target.requestFullscreen();
    } catch {
      /* denied — stay inline */
    }
  }, [target, supported]);

  const exit = useCallback(async () => {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    if (active) void exit();
    else void enter();
  }, [active, enter, exit]);

  return { active, supported, enter, exit, toggle };
}
