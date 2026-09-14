/**
 * Quantising the scale handed to memoised map layers.
 *
 * Every SVG layer in the 2-D renderers is wrapped in `memo` and receives the
 * view scale for two reasons: to keep hairlines, pins and annotation text
 * screen-space sized (`1 / scale`), and to decide when a label is worth drawing
 * (`scale > 0.9`, `width * scale > 34`, `scale > 0.35` for trees). Both are
 * *threshold* decisions — but the raw scale changes on every frame of a wheel,
 * pinch or zoom-button gesture, so `memo` never matched and all six to eight
 * layers re-rendered up to 60× a second to draw a hairline that is 1 px either
 * way.
 *
 * Rounding the scale to a multiplicative step leaves ~13 distinct values across
 * a typical 1.5× zoom instead of one per frame, so a layer re-renders only when
 * something it draws can actually change.
 *
 * The view transform itself (`<g transform="… scale(view.scale)">`) always keeps
 * the exact value, so no geometry moves and pointer hit-testing is unaffected —
 * layers never do coordinate maths with this prop. The only visible effects are
 * a hairline at most 1.98% off 1 px and a label threshold that trips up to 4%
 * early, both below what the eye separates on screen.
 */

/** Multiplicative bucket: 4% per step, i.e. a worst-case error of √1.04 − 1 ≈ 2%. */
const SCALE_STEP = Math.log(1.04);

export function quantizeLayerScale(scale: number): number {
  if (!Number.isFinite(scale) || scale <= 0) return scale;
  return Math.exp(Math.round(Math.log(scale) / SCALE_STEP) * SCALE_STEP);
}
