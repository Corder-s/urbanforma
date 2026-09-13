import type { UnitKind, UnitSystem } from "../types/settings.types";

/**
 * Centralised unit conversion + formatting (§6).
 *
 * Every module formats through here — Planning geometry, BIM quantities,
 * project cards, analysis numbers and the report document all call these
 * functions — so a unit preference is one switch rather than conversion maths
 * copied into each feature. Inputs are always metric (the app's storage unit);
 * only the presentation changes.
 *
 * The metric branch reproduces the formatters the app has always used, digit
 * for digit, so switching the preference to imperial is the only thing that can
 * change what a planner sees.
 */

const FT_PER_M = 3.280839895;
const MI_PER_KM = 0.621371192;
const FT2_PER_M2 = 10.763910417;
const ACRE_PER_HA = 2.471053815;
const FT3_PER_M3 = 35.314666721;
const MPH_PER_MS = 2.236936292;

const nf = (max: number) => ({ maximumFractionDigits: max });

/**
 * The active system. Set by `settings.service` when settings are read or
 * written — never by a component — so there is exactly one source of truth and
 * no render-order dependency.
 */
let system: UnitSystem = "metric";

export function configureUnits(next: UnitSystem): void {
  system = next === "imperial" ? "imperial" : "metric";
}

export function getUnitSystem(): UnitSystem {
  return system;
}

export function isImperial(): boolean {
  return system === "imperial";
}

// ---------------------------------------------------------------------------
// Conversions (pure — used by the settings preview and by any module that needs
// the number itself rather than a string)
// ---------------------------------------------------------------------------

export function convertLength(m: number): number {
  return isImperial() ? m * FT_PER_M : m;
}

export function convertArea(m2: number): number {
  return isImperial() ? m2 * FT2_PER_M2 : m2;
}

export function convertVolume(m3: number): number {
  return isImperial() ? m3 * FT3_PER_M3 : m3;
}

export function convertSiteArea(ha: number): number {
  return isImperial() ? ha * ACRE_PER_HA : ha;
}

export function convertSpeed(ms: number): number {
  return isImperial() ? ms * MPH_PER_MS : ms;
}

export function convertTemperature(c: number): number {
  return isImperial() ? c * 1.8 + 32 : c;
}

/** Elevation is a length; kept as its own name so call sites read clearly. */
export function convertElevation(m: number): number {
  return convertLength(m);
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Distance: metres / kilometres, or feet / miles. */
export function formatLength(m: number): string {
  if (!Number.isFinite(m)) return "—";
  if (isImperial()) {
    if (m >= 1000) return `${(m / 1000 * MI_PER_KM).toLocaleString("en-US", nf(2))} mi`;
    return `${Math.round(m * FT_PER_M).toLocaleString("en-US")} ft`;
  }
  if (m >= 1000) return `${(m / 1000).toLocaleString("en-US", nf(2))} km`;
  return `${Math.round(m).toLocaleString("en-US")} m`;
}

/** Area: m² / ha, or ft² / acres. */
export function formatArea(m2: number): string {
  if (!Number.isFinite(m2)) return "—";
  if (isImperial()) {
    if (m2 >= 10_000) return `${((m2 / 10_000) * ACRE_PER_HA).toLocaleString("en-US", nf(2))} ac`;
    return `${Math.round(m2 * FT2_PER_M2).toLocaleString("en-US")} ft²`;
  }
  if (m2 >= 10_000) return `${(m2 / 10_000).toLocaleString("en-US", nf(2))} ha`;
  return `${Math.round(m2).toLocaleString("en-US")} m²`;
}

/** Distances already stored in kilometres (analysis metrics). */
export function formatKilometres(km: number): string {
  if (!Number.isFinite(km)) return "—";
  return isImperial() ? `${(km * MI_PER_KM).toFixed(2)} mi` : `${km.toFixed(2)} km`;
}

/** Volume: m³ or ft³. */
export function formatVolume(m3: number): string {
  if (!Number.isFinite(m3)) return "—";
  return isImperial()
    ? `${(m3 * FT3_PER_M3).toLocaleString("en-US", nf(0))} ft³`
    : `${m3.toLocaleString("en-US", nf(0))} m³`;
}

/** Site area is stored in hectares: "51.0 ha" or "126.0 ac". */
export function formatSiteArea(ha: number): string {
  if (!Number.isFinite(ha)) return "—";
  return isImperial() ? `${(ha * ACRE_PER_HA).toFixed(1)} ac` : `${ha.toFixed(1)} ha`;
}

/** Wind / walking speed, stored in m/s. */
export function formatSpeed(ms: number): string {
  if (!Number.isFinite(ms)) return "—";
  return isImperial() ? `${(ms * MPH_PER_MS).toFixed(1)} mph` : `${ms.toFixed(1)} m/s`;
}

/** Temperature, stored in °C. */
export function formatTemperature(c: number): string {
  if (!Number.isFinite(c)) return "—";
  return isImperial() ? `${Math.round(c * 1.8 + 32)}°F` : `${Math.round(c)}°C`;
}

/** Elevation and height read as lengths. */
export function formatElevation(m: number): string {
  return formatLength(m);
}

/** The unit a kind currently renders in (for tables, previews and legends). */
export function unitLabel(kind: UnitKind): string {
  const imperial = isImperial();
  switch (kind) {
    case "length":
      return imperial ? "ft / mi" : "m / km";
    case "elevation":
      return imperial ? "ft" : "m";
    case "area":
      return imperial ? "ft² / ac" : "m² / ha";
    case "volume":
      return imperial ? "ft³" : "m³";
    case "siteArea":
      return imperial ? "ac" : "ha";
    case "speed":
      return imperial ? "mph" : "m/s";
    case "temperature":
      return imperial ? "°F" : "°C";
  }
}

/** Sample row for the units section: one metric value shown both ways. */
export interface UnitSample {
  kind: UnitKind;
  label: string;
  metric: string;
  value: number;
}

export const UNIT_SAMPLES: UnitSample[] = [
  { kind: "length", label: "Distance", metric: "450 m", value: 450 },
  { kind: "length", label: "Long distance", metric: "9.67 km", value: 9665 },
  { kind: "area", label: "Floor area", metric: "2,450 m²", value: 2450 },
  { kind: "siteArea", label: "Site area", metric: "51.0 ha", value: 51 },
  { kind: "volume", label: "Volume", metric: "12,400 m³", value: 12400 },
  { kind: "elevation", label: "Elevation", metric: "18 m", value: 18 },
  { kind: "speed", label: "Wind speed", metric: "3.4 m/s", value: 3.4 },
  { kind: "temperature", label: "Temperature", metric: "31°C", value: 31 },
];

/** Format a sample with an explicit system (used by the settings preview only). */
export function formatSample(sample: UnitSample, target: UnitSystem): string {
  const previous = system;
  system = target;
  const out = formatKind(sample.kind, sample.value);
  system = previous;
  return out;
}

export function formatKind(kind: UnitKind, value: number): string {
  switch (kind) {
    case "length":
      return formatLength(value);
    case "elevation":
      return formatElevation(value);
    case "area":
      return formatArea(value);
    case "siteArea":
      return formatSiteArea(value);
    case "volume":
      return formatVolume(value);
    case "speed":
      return formatSpeed(value);
    case "temperature":
      return formatTemperature(value);
  }
}
