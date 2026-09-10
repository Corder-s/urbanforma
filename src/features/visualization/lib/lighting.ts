import { getAtmosphere, getTimeOfDay, type AtmospherePreset, type TimeOfDayPreset } from "../data/visualization.data";
import type { VisualizationSettings } from "../types/visualization.types";

/**
 * Shared "sun" model for both renderers. This is a *visual* preset, not a
 * solar calculation: the time-of-day presets fix an azimuth / elevation pair,
 * the Sun Position slider nudges the azimuth, Sun Intensity scales the light.
 * The 2-D plan shadows and the 3-D directional light read the same numbers so
 * the two views agree on where the light comes from.
 */
export interface SunModel {
  preset: TimeOfDayPreset;
  atmosphere: AtmospherePreset;
  /** Degrees clockwise from north (map convention, north = −y). */
  azimuthDeg: number;
  /** Relative elevation 0.2–1.2 (× site span in 3-D). */
  elevation: number;
  /** Unit vector pointing *towards* the sun in map coordinates. */
  toSun: { x: number; y: number };
  /** 0–1 light strength after the intensity setting and the atmosphere. */
  strength: number;
}

export function sunModel(settings: VisualizationSettings): SunModel {
  const preset = getTimeOfDay(settings.timeOfDay);
  const atmosphere = getAtmosphere(settings.atmosphere);
  const azimuthDeg = preset.azimuth + ((settings.sunPosition - 50) / 50) * 40;
  const a = (azimuthDeg * Math.PI) / 180;
  const strength = Math.max(0.15, Math.min(1.4, (settings.sunIntensity / 100) * preset.intensity * atmosphere.sunScale));
  return { preset, atmosphere, azimuthDeg, elevation: preset.elevation, toSun: { x: Math.sin(a), y: -Math.cos(a) }, strength };
}

/** Plan (2-D) shadow: unit direction away from the sun, a length multiplier and an opacity. */
export interface PlanShadow {
  ux: number;
  uy: number;
  /** Multiplier applied to the per-building base length. */
  length: number;
  opacity: number;
}

export function planShadow(settings: VisualizationSettings): PlanShadow {
  const sun = sunModel(settings);
  const length = Math.max(0.55, Math.min(2.6, 0.75 / sun.elevation)) * (settings.heightEmphasis ? 1.25 : 1) * (0.7 + 0.6 * (1 - Math.min(1, sun.strength)));
  const opacity = sun.preset.shadowOpacity * (sun.atmosphere.id === "clear" ? 1 : sun.atmosphere.id === "soft-cloud" ? 0.75 : 0.6);
  return { ux: -sun.toSun.x, uy: -sun.toSun.y, length, opacity };
}

/** Colour ramp for the "Height Emphasis" building style (light → deep blue). */
export function heightRamp(floors: number): string {
  const stops: [number, [number, number, number]][] = [
    [1, [219, 234, 254]],
    [6, [147, 197, 253]],
    [12, [59, 130, 246]],
    [20, [37, 99, 235]],
    [30, [30, 58, 138]],
  ];
  const f = Math.max(1, Math.min(30, floors));
  for (let i = 1; i < stops.length; i++) {
    const [f0, c0] = stops[i - 1];
    const [f1, c1] = stops[i];
    if (f <= f1) {
      const t = (f - f0) / (f1 - f0);
      const c = c0.map((v, k) => Math.round(v + (c1[k] - v) * t));
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    }
  }
  return "rgb(30, 58, 138)";
}

/** Text colour that stays readable on the height ramp. */
export function heightLabelColor(floors: number): string {
  return floors >= 11 ? "#FFFFFF" : "#0F172A";
}
