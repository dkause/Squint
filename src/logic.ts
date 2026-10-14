/**
 * Pure state machine for the customer view (T3).
 * No DOM, no network, no global state.
 */

/** Image metadata provided by the caller. */
export interface Image {
  id: string;
  isFavorite: boolean;
}

/** Action types for history/undo. */
type Action =
  | { type: 'swipeLeft'; imageId: string; index: number }
  | { type: 'swipeRight'; imageId: string }
  | { type: 'fixate'; imageId: string; index: number };

/** State of the customer view. */
export interface State {
  /** Remaining images in rotation order (ids only). */
  pool: readonly string[];
  /** Set of fixated image ids. */
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

/** Match event returned when a right-swipe hits an unmatched favorite. */
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

/** Check if the state has reached the target (fixated + pool === targetN). */
export function isComplete(state: State): boolean {
  return state.fixated.size + state.pool.length === state.targetN;
}

/** Advance to the next image in the pool, wrapping around. */
function advanceRotation(state: State): number {
  const poolLength = state.pool.length;
  if (poolLength === 0) {
    return 0;
  }
  
  let nextIndex = state.currentIndex + 1;
  if (nextIndex >= poolLength) {
    nextIndex = 0;
  }
  return nextIndex;
}

/** Swipe left: remove image from pool. Blocked if fixated + pool <= targetN. */
export function swipeLeft(state: State, imageId: string): Result<void> {
  // Check if blocked: cannot remove if fixated + pool <= targetN
  // (removing would make fixated + (pool-1) < targetN)
  if (state.fixated.size + state.pool.length <= state.targetN) {
    return {
      ok: false,
      error: `Cannot swipe left: fixated (${state.fixated.size}) + pool (${state.pool.length}) = ${state.fixated.size + state.pool.length} is at or below target N (${state.targetN})`,
    };
  }

  // Check if image is in pool
  const index = state.pool.indexOf(imageId);
  if (index === -1) {
    return { ok: false, error: `Image ${imageId} not found in pool` };
  }

  // Create new pool without the image
  const newPool = state.pool.filter((id) => id !== imageId);

  // Calculate new index
  let newIndex = state.currentIndex;
  if (newPool.length === 0) {
    newIndex = 0;
  } else if (index === state.currentIndex) {
    // Removed current image - stay at same position (next image shifts into place)
    newIndex = state.currentIndex >= newPool.length ? 0 : state.currentIndex;
  } else if (index < state.currentIndex) {
    // Removed an image before current, so current index decreases by 1
    newIndex = state.currentIndex - 1;
  }
  // If removed an image after current, index stays the same

  // Clamp to valid range
  newIndex = Math.min(newIndex, newPool.length - 1);

  const newState: State = {
    ...state,
    pool: newPool,
    history: [...state.history, { type: 'swipeLeft', imageId, index }],
    currentIndex: newIndex,
  };

  return { ok: true, state: newState };
}

/** Swipe right: image stays in pool, advance rotation. Returns MatchEvent if applicable. */
export function swipeRight(state: State, imageId: string): Result<MatchEvent | undefined> {
  // Check if image is in pool
  const index = state.pool.indexOf(imageId);
  if (index === -1) {
    return { ok: false, error: `Image ${imageId} not found in pool` };
  }

  // Check for match: right swipe on unmatched favorite
  let matchEvent: MatchEvent | undefined;
  if (state.favorites.has(imageId) && !state.matched.has(imageId)) {
    matchEvent = { imageId };
  }

  // Build new matched set
  const newMatched = new Set(state.matched);
  if (matchEvent !== undefined) {
    newMatched.add(imageId);
  }

  // Advance rotation
  const newIndex = advanceRotation(state);

  const newState: State = {
    ...state,
    matched: newMatched,
    history: [...state.history, { type: 'swipeRight', imageId }],
    currentIndex: newIndex,
  };

  return { ok: true, state: newState, value: matchEvent };
}

/** Fixate: image becomes part of final result, removed from rotation, counts toward N. */
export function fixate(state: State, imageId: string): Result<void> {
  // Check if image is in pool
  const index = state.pool.indexOf(imageId);
  if (index === -1) {
    return { ok: false, error: `Image ${imageId} not found in pool` };
  }

  // Create new pool without the image
  const newPool = state.pool.filter((id) => id !== imageId);

  // Add to fixated
  const newFixated = new Set(state.fixated);
  newFixated.add(imageId);

  // Calculate new index
  let newIndex = state.currentIndex;
  if (newPool.length === 0) {
    newIndex = 0;
  } else if (index === state.currentIndex) {
    newIndex = state.currentIndex >= newPool.length ? 0 : state.currentIndex;
  } else if (index < state.currentIndex) {
    newIndex = state.currentIndex - 1;
  }
  newIndex = Math.min(newIndex, newPool.length - 1);

  const newState: State = {
    ...state,
    pool: newPool,
    fixated: newFixated,
    history: [...state.history, { type: 'fixate', imageId, index }],
    currentIndex: newIndex,
  };

  return { ok: true, state: newState };
}

/** Undo: revert the last action (swipe or fixate). Single-level only. */
export function undo(state: State): Result<void> {
  if (state.history.length === 0) {
    return { ok: false, error: 'No actions to undo' };
  }

  const historyLength = state.history.length;
  const lastAction = state.history[historyLength - 1]!;
  const previousHistory = state.history.slice(0, -1);

  let newState: State;

  switch (lastAction.type) {
    case 'swipeLeft': {
      // Revert swipeLeft: add image back to pool at its original position
      const newPool = [...state.pool];
      newPool.splice(lastAction.index, 0, lastAction.imageId);
      
      // Adjust currentIndex if needed
      let newIndex = state.currentIndex;
      if (lastAction.index <= state.currentIndex) {
        newIndex = state.currentIndex + 1;
      }
      
      newState = {
        ...state,
        pool: newPool,
        history: previousHistory,
        currentIndex: newIndex,
      };
      break;
    }
    case 'swipeRight': {
      // Revert swipeRight: go back in rotation
      let newIndex = state.currentIndex - 1;
      if (newIndex < 0) {
        newIndex = state.pool.length - 1;
      }
      
      // Revert match if this swipeRight caused a match
      const newMatched = new Set(state.matched);
      if (state.favorites.has(lastAction.imageId) && newMatched.has(lastAction.imageId)) {
        newMatched.delete(lastAction.imageId);
      }
      
      newState = {
        ...state,
        matched: newMatched,
        history: previousHistory,
        currentIndex: newIndex,
      };
      break;
    }
    case 'fixate': {
      // Revert fixate: remove from fixated, add back to pool at its original position
      const newFixated = new Set(state.fixated);
      newFixated.delete(lastAction.imageId);
      
      const newPool = [...state.pool];
      newPool.splice(lastAction.index, 0, lastAction.imageId);
      
      // Adjust currentIndex if needed
      let newIndex = state.currentIndex;
      if (lastAction.index <= state.currentIndex) {
        newIndex = state.currentIndex + 1;
      }
      
      newState = {
        ...state,
        pool: newPool,
        fixated: newFixated,
        history: previousHistory,
        currentIndex: newIndex,
      };
      break;
    }
  }

  return { ok: true, state: newState };
}
