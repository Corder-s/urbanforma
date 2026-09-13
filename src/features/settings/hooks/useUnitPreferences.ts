import { useMemo } from "react";
import { useSettings } from "./useSettings";
import {
  formatArea,
  formatElevation,
  formatLength,
  formatSiteArea,
  formatSpeed,
  formatTemperature,
  formatVolume,
  unitLabel,
} from "../lib/units";
import type { UnitKind, UnitSystem } from "../types/settings.types";

export interface UnitPreferences {
  system: UnitSystem;
  setSystem: (system: UnitSystem) => void;
  /** Unit-aware formatters — always metric in, presented in the chosen system. */
  formatLength: typeof formatLength;
  formatArea: typeof formatArea;
  formatVolume: typeof formatVolume;
  formatSiteArea: typeof formatSiteArea;
  formatSpeed: typeof formatSpeed;
  formatTemperature: typeof formatTemperature;
  formatElevation: typeof formatElevation;
  unitLabel: (kind: UnitKind) => string;
}

/**
 * The unit preference (§6).
 *
 * Modules that print distances, areas or volumes call this once at their root:
 * consuming the context is what re-renders them when the planner switches
 * between metric and imperial, while the conversion maths itself lives in one
 * place (`lib/units.ts`) and is shared with the formatters in Planning,
 * Projects, BIM and Reports.
 */
export function useUnitPreferences(): UnitPreferences {
  const { settings, patch } = useSettings();
  const system = settings.units.system;

  return useMemo<UnitPreferences>(
    () => ({
      system,
      setSystem: (next: UnitSystem) => patch({ units: { system: next } }),
      formatLength,
      formatArea,
      formatVolume,
      formatSiteArea,
      formatSpeed,
      formatTemperature,
      formatElevation,
      unitLabel,
    }),
    // The formatters read the active system from the units module; depending on
    // `system` is what hands consumers the new values after a switch.
    [system, patch]
  );
}
