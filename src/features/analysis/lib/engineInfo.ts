/**
 * Identity of the demo analysis engine.
 *
 * Kept apart from `analysis.engine.ts` so the service can stamp a run and
 * validate a stored result — and reports can quote the engine version — without
 * putting the engine's ~49 KB of heuristics in their static import graph. Those
 * callers only ever read results; the engine itself is loaded on demand.
 */

/** Bumping this invalidates every stored run (results are re-derived). */
export const ENGINE_VERSION = "demo-1.0";
