import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { applyPreferences } from "../lib/applyPreferences";
import { configureUnits } from "../lib/units";
import {
  SETTINGS_STORAGE_KEY,
  didLastWriteSucceed,
  invalidateSettingsCache,
  isStoredSettingsCorrupt,
  loadSettings,
  mergePatches,
  mergeSettings,
  probeSettingsStorage,
  resetSettings,
  updateSettings,
  type SettingsPatch,
} from "../services/settings.service";
import type { AppSettings, SettingsSaveState } from "../types/settings.types";

interface SettingsContextValue {
  settings: AppSettings;
  /** `loading` covers the first read; it becomes an async GET when the backend lands. */
  status: "loading" | "ready";
  /** True when a stored blob existed but could not be parsed — defaults are in use. */
  recovered: boolean;
  /** True when the browser refuses to persist (private window, blocked or full storage). */
  storageBlocked: boolean;
  saveState: SettingsSaveState;
  /** Merge a partial tree. Optimistic in memory, persisted with a short debounce. */
  patch: (patch: SettingsPatch) => void;
  /** Restore every default (project data is untouched — see Data Management). */
  reset: () => void;
  /** Re-read from storage (another tab changed it, or data was cleared). */
  reload: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Applied at import time, before the first paint, so a dark theme or a
 * high-contrast palette never flashes the default for a frame.
 */
if (typeof document !== "undefined") {
  try {
    applyPreferences(loadSettings());
  } catch {
    // A preference must never be able to stop the app from starting.
  }
}

/** Writes are debounced so a burst of toggles is one serialised write. */
const WRITE_DELAY_MS = 220;

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [recovered, setRecovered] = useState<boolean>(() => isStoredSettingsCorrupt());
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [saveState, setSaveState] = useState<SettingsSaveState>("idle");

  const pending = useRef<SettingsPatch | null>(null);
  const timer = useRef<number | null>(null);

  // The first read is synchronous today; the state machine matches the async
  // `GET /api/me/settings` this becomes, so the page can render its skeleton.
  useEffect(() => {
    const id = window.setTimeout(() => setStatus("ready"), 0);
    return () => window.clearTimeout(id);
  }, []);

  // Storage capability is probed once: a private window or a full quota must be
  // reported rather than silently discarding every preference.
  useEffect(() => {
    setStorageBlocked(!probeSettingsStorage());
  }, []);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    []
  );

  const flush = useCallback(() => {
    const patchToWrite = pending.current;
    pending.current = null;
    timer.current = null;
    if (!patchToWrite) return;
    try {
      const next = updateSettings(patchToWrite);
      setSettings(next);
      applyPreferences(next);
      // Only claim "Saved" when the bytes actually reached storage.
      setSaveState(didLastWriteSucceed() ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  }, []);

  const patch = useCallback(
    (next: SettingsPatch) => {
      setSaveState("saving");
      setSettings((current) => {
        const optimistic = mergeSettings(current, next);
        // Visual preferences and the unit system apply immediately; only the
        // write is debounced.
        applyPreferences(optimistic);
        configureUnits(optimistic.units.system);
        return optimistic;
      });
      pending.current = mergePatches(pending.current, next);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, WRITE_DELAY_MS);
    },
    [flush]
  );

  const reset = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
    const next = resetSettings();
    setSettings(next);
    applyPreferences(next);
    setRecovered(false);
    setSaveState("saved");
  }, []);

  const reload = useCallback(() => {
    invalidateSettingsCache();
    const next = loadSettings();
    setSettings(next);
    applyPreferences(next);
    configureUnits(next.units.system);
    setRecovered(isStoredSettingsCorrupt());
  }, []);

  // Another tab changing settings (or clearing data) is reflected here, the same
  // way the auth session syncs across tabs.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== SETTINGS_STORAGE_KEY) return;
      reload();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [reload]);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, status, recovered, storageBlocked, saveState, patch, reset, reload }),
    [settings, status, recovered, storageBlocked, saveState, patch, reset, reload]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within <SettingsProvider>");
  return ctx;
}
