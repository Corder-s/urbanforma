import { useCallback, useReducer } from "react";

/**
 * Minimal linear undo/redo over immutable snapshots.
 *
 * `commit` pushes a new present (clearing the redo stack); `replace` swaps
 * the present without recording history (used during live drags) and
 * `commitFrom` then records the pre-drag snapshot as the undo point; `reset`
 * starts a fresh history when a different document loads.
 */

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

type Action<T> =
  | { type: "commit"; next: T }
  | { type: "commitFrom"; base: T; next: T }
  | { type: "replace"; next: T }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; next: T };

const LIMIT = 60;

function reducer<T>(state: HistoryState<T>, action: Action<T>): HistoryState<T> {
  switch (action.type) {
    case "commit":
      if (action.next === state.present) return state;
      return { past: [...state.past.slice(-LIMIT + 1), state.present], present: action.next, future: [] };
    case "commitFrom":
      // Used after a live drag: the pre-drag snapshot becomes the undo point.
      if (action.base === action.next) return state;
      return { past: [...state.past.slice(-LIMIT + 1), action.base], present: action.next, future: [] };
    case "replace":
      return action.next === state.present ? state : { ...state, present: action.next };
    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return { past: [...state.past, state.present], present: next, future: rest };
    }
    case "reset":
      return { past: [], present: action.next, future: [] };
  }
}

export function usePlanningHistory<T>(initial: T) {
  const [state, dispatch] = useReducer(reducer<T>, { past: [], present: initial, future: [] });

  const commit = useCallback((next: T) => dispatch({ type: "commit", next }), []);
  const commitFrom = useCallback((base: T, next: T) => dispatch({ type: "commitFrom", base, next }), []);
  const replace = useCallback((next: T) => dispatch({ type: "replace", next }), []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  const reset = useCallback((next: T) => dispatch({ type: "reset", next }), []);

  return {
    present: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    undoDepth: state.past.length,
    commit,
    commitFrom,
    replace,
    undo,
    redo,
    reset,
  };
}
