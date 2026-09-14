/**
 * Colour helpers for analysis ramps.
 *
 * Split out of `analysis.engine.ts` deliberately: the map overlays and the 3-D
 * analysis preview need twelve lines of colour interpolation, and importing it
 * from the engine used to pull ~49 KB of demo heuristics into the static graph
 * of every chunk that touches them. The engine imports these back, so there is
 * still exactly one copy of the maths.
 */

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Colour for a normalised value on a ramp (piecewise-linear interpolation). */
export function rampColor(ramp: string[], t: number): string {
  const x = clamp01(t) * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(x));
  const f = x - i;
  const a = hexToRgb(ramp[i]);
  const b = hexToRgb(ramp[i + 1]);
  const mix = a.map((c, k) => Math.round(c + (b[k] - c) * f));
  return `#${mix.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
