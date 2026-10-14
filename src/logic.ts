/**
 * Pure state machine for the customer view (selection model).
 * No DOM, no network, no global state.
 *
 * Model (changed 2026-10-14): positive selection instead of elimination.
 * - next (swipe left): keep the image, advance to the next one.
 * - select (swipe right): choose the image — it counts toward N and
 *   leaves the rotation.
 * - Complete when exactly N images are selected.
 */

/** Image metadata provided by the caller. */
export interface Image {
  id: string;
  isFavorite: boolean;
}

/** Action types for history/undo. */
type Action =
  | { type: 'next'; imageId: string }
  | { type: 'select'; imageId: string; index: number };

/** State of the customer view. */
export interface State {
  /** Remaining images in rotation order (ids only, not yet selected). */
  pool: readonly string[];
  /** Set of selected image ids. */
  fixated: ReadonlySet<string>;
  /** Set of favorite image ids (from initial image metadata). */
  favorites: ReadonlySet<string>;
  /** Set of image ids that have already triggered a match. */
  matched: ReadonlySet<string>;
  /** History of actions for undo (LIFO). */
  history: readonly Action[];
  /** Target count N. */
  targetN: number;
  /** Current rotation index within the pool. */
  currentIndex: number;
}

/** Result type for operations that can fail. */
export type Result<T, E = string> =
  | { ok: true; state: State; value?: T }
  | { ok: false; error: E };

/** Match event returned when a select hits an unmatched favorite. */
export interface MatchEvent {
  imageId: string;
}

/** Create initial state from a list of images and target N. */
export function createState(images: readonly Image[], targetN: number): State {
  const pool = images.map((img) => img.id);
  const favorites = new Set<string>();
  for (const img of images) {
    if (img.isFavorite) {
      favorites.add(img.id);
    }
  }
  return {
    pool,
    fixated: new Set(),
    favorites,
    matched: new Set(),
    history: [],
    targetN,
    currentIndex: 0,
  };
}

/** Get the current image id from the pool (rotated). */
export function getCurrentImageId(state: State): string | null {
  if (state.pool.length === 0) {
    return null;
  }
  return state.pool[state.currentIndex] ?? null;
}

/** Check if the target is reached: exactly N images selected. */
export function isComplete(state: State): boolean {
  return state.fixated.size === state.targetN;
}

/** Advance to the next image in the pool, wrapping around. */
function advanceRotation(state: State): number {
  const poolLength = state.pool.length;
  if (poolLength === 0) {
    return 0;
  }
  return (state.currentIndex + 1) % poolLength;
}

/** Next (swipe left): keep the image in the pool, show the next one. */
export function next(state: State, imageId: string): Result<void> {
  const index = state.pool.indexOf(imageId);
  if (index === -1) {
    return { ok: false, error: `Image ${imageId} not found in pool` };
  }

  const newState: State = {
    ...state,
    history: [...state.history, { type: 'next', imageId }],
    currentIndex: advanceRotation(state),
  };

  return { ok: true, state: newState };
}

/** Select (swipe right): choose the image, it counts toward N and
 *  leaves the rotation. Match event if it is an unmatched favorite. */
export function select(state: State, imageId: string): Result<MatchEvent | undefined> {
  if (isComplete(state)) {
    return { ok: false, error: 'Auswahl ist bereits vollstaendig' };
  }

  const index = state.pool.indexOf(imageId);
  if (index === -1) {
    return { ok: false, error: `Image ${imageId} not found in pool` };
  }

  // Match: select on an unmatched favorite, once per image
  let matchEvent: MatchEvent | undefined;
  if (state.favorites.has(imageId) && !state.matched.has(imageId)) {
    matchEvent = { imageId };
  }

  const newMatched = new Set(state.matched);
  if (matchEvent !== undefined) {
    newMatched.add(imageId);
  }

  const newPool = state.pool.filter((id) => id !== imageId);
  const newFixated = new Set(state.fixated);
  newFixated.add(imageId);

  let newIndex = state.currentIndex;
  if (newPool.length === 0) {
    newIndex = 0;
  } else if (index === state.currentIndex) {
    newIndex = Math.min(state.currentIndex, newPool.length - 1);
  } else if (index < state.currentIndex) {
    newIndex = state.currentIndex - 1;
  }

  const newState: State = {
    ...state,
    pool: newPool,
    fixated: newFixated,
    matched: newMatched,
    history: [...state.history, { type: 'select', imageId, index }],
    currentIndex: newIndex,
  };

  return { ok: true, state: newState, value: matchEvent };
}

/** Undo: revert the last action (next or select). Single-level. */
export function undo(state: State): Result<void> {
  if (state.history.length === 0) {
    return { ok: false, error: 'No actions to undo' };
  }

  const historyLength = state.history.length;
  const lastAction = state.history[historyLength - 1]!;
  const previousHistory = state.history.slice(0, -1);

  let newState: State;

  switch (lastAction.type) {
    case 'next': {
      // Revert next: go back in rotation with wraparound
      let newIndex = state.currentIndex - 1;
      if (newIndex < 0) {
        newIndex = state.pool.length - 1;
      }

      newState = {
        ...state,
        history: previousHistory,
        currentIndex: newIndex,
      };
      break;
    }
    case 'select': {
      // Revert select: remove from fixated, add back to pool at its position
      const newFixated = new Set(state.fixated);
      newFixated.delete(lastAction.imageId);

      const newPool = [...state.pool];
      newPool.splice(lastAction.index, 0, lastAction.imageId);

      // Revert match if this select caused it
      const newMatched = new Set(state.matched);
      if (newMatched.has(lastAction.imageId)) {
        newMatched.delete(lastAction.imageId);
      }

      let newIndex = state.currentIndex;
      if (lastAction.index <= state.currentIndex) {
        newIndex = state.currentIndex + 1;
      }
      newIndex = Math.min(newIndex, newPool.length - 1);

      newState = {
        ...state,
        pool: newPool,
        fixated: newFixated,
        matched: newMatched,
        history: previousHistory,
        currentIndex: newIndex,
      };
      break;
    }
  }

  return { ok: true, state: newState };
}
