import { describe, expect, it } from 'vitest';
import {
  createState,
  swipeLeft,
  swipeRight,
  fixate,
  undo,
  isComplete,
  getCurrentImageId,
  type Result,
  type State,
  type Image,
} from './logic.js';

// Helper to get state from a successful result
function getState(result: Result<unknown>): State {
  if (!result.ok) {
    throw new Error(`Expected ok result, got error: ${(result as { ok: false; error: string }).error}`);
  }
  return result.state;
}

// Helper to assert error
function assertError(result: Result<unknown>, expectedError: string): void {
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error).toBe(expectedError);
  }
}

// Helper to assert success
function assertOk<T>(result: Result<T>): asserts result is { ok: true; state: State; value?: T } {
  expect(result.ok).toBe(true);
}

describe('T3 Customer Logic - State Machine', () => {
  describe('createState', () => {
    it('creates initial state with all images in pool', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: true },
        { id: 'img3', isFavorite: false },
      ];
      const state = createState(images, 2);
      
      expect(state.pool).toEqual(['img1', 'img2', 'img3']);
      expect(state.fixated).toEqual(new Set());
      expect(state.favorites).toEqual(new Set(['img2']));
      expect(state.matched).toEqual(new Set());
      expect(state.history).toEqual([]);
      expect(state.targetN).toBe(2);
      expect(state.currentIndex).toBe(0);
    });

    it('handles empty image list', () => {
      const state = createState([], 1);
      expect(state.pool).toEqual([]);
      expect(state.currentIndex).toBe(0);
    });
  });

  describe('getCurrentImageId', () => {
    it('returns the current image id', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
      ];
      const state = createState(images, 1);
      expect(getCurrentImageId(state)).toBe('img1');
    });

    it('returns null for empty pool', () => {
      const state = createState([], 1);
      expect(getCurrentImageId(state)).toBeNull();
    });
  });

  describe('isComplete', () => {
    it('returns false when fixated + pool > targetN', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
        { id: 'img3', isFavorite: false },
      ];
      const state = createState(images, 2);
      // fixated=0, pool=3, so 0+3=3>2, not complete
      expect(isComplete(state)).toBe(false);
    });

    it('returns true when fixated + pool = targetN', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
      ];
      const state = createState(images, 2);
      // fixated=0, pool=2, so 0+2=2=targetN, complete
      expect(isComplete(state)).toBe(true);
    });

    it('returns false when fixated + pool < targetN (edge case)', () => {
      const images: Image[] = [{ id: 'img1', isFavorite: false }];
      const state = createState(images, 2);
      // fixated=0, pool=1, so 0+1=1<2, not complete
      expect(isComplete(state)).toBe(false);
    });
  });

  describe('Abnahmekriterium 1: Links-Swipe bei |Pool| = N wird blockiert', () => {
    it('blocks swipeLeft when fixated + pool equals targetN', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
      ];
      const state = createState(images, 2);
      
      // fixated=0, pool=2, so 0+2=2=targetN, swipeLeft should be blocked
      const result = swipeLeft(state, 'img1');
      assertError(result, 'Cannot swipe left: fixated (0) + pool (2) = 2 is at or below target N (2)');
    });

    it('blocks swipeLeft when fixated + pool is below targetN', () => {
      const images: Image[] = [{ id: 'img1', isFavorite: false }];
      const state = createState(images, 2);
      
      // fixated=0, pool=1, so 0+1=1<2, swipeLeft should be blocked
      const result = swipeLeft(state, 'img1');
      assertError(result, 'Cannot swipe left: fixated (0) + pool (1) = 1 is at or below target N (2)');
    });

    it('allows swipeLeft when pool size is above targetN', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
        { id: 'img3', isFavorite: false },
      ];
      const state = createState(images, 2);
      
      const result = swipeLeft(state, 'img1');
      assertOk(result);
      const newState = result.state;
      
      expect(newState.pool).toEqual(['img2', 'img3']);
      expect(newState.history).toHaveLength(1);
      // Action now includes index for swipeLeft
      const action = newState.history[0]!;
      expect(action.type).toBe('swipeLeft');
      expect(action.imageId).toBe('img1');
      if (action.type === 'swipeLeft') {
        expect(action.index).toBe(0);
      }
    });
  });

  describe('Abnahmekriterium 2: Rotation beginnt nach dem letzten Bild neu und überspringt fixierte Bilder', () => {
    it('advances to next image on swipeRight', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
        { id: 'img3', isFavorite: false },
      ];
      let state = createState(images, 1);
      
      expect(getCurrentImageId(state)).toBe('img1');
      
      let result = swipeRight(state, 'img1');
      assertOk(result);
      state = result.state;
      expect(getCurrentImageId(state)).toBe('img2');
      
      result = swipeRight(state, 'img2');
      assertOk(result);
      state = result.state;
      expect(getCurrentImageId(state)).toBe('img3');
    });

    it('wraps around to first image after last', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
        { id: 'img3', isFavorite: false },
      ];
      let state = createState(images, 1);
      
      // Swipe right on all images
      state = getState(swipeRight(state, 'img1'));
      state = getState(swipeRight(state, 'img2'));
      state = getState(swipeRight(state, 'img3'));
      
      // Should wrap around to img1
      expect(getCurrentImageId(state)).toBe('img1');
    });

    it('skips fixated images in rotation', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
        { id: 'img3', isFavorite: false },
      ];
      let state = createState(images, 1);
      
      // Fixate img2
      state = getState(fixate(state, 'img2'));
      expect(state.fixated).toEqual(new Set(['img2']));
      expect(state.pool).toEqual(['img1', 'img3']);
      
      // Current should still be valid
      const currentId = getCurrentImageId(state);
      expect(['img1', 'img3']).toContain(currentId);
      
      // Swipe right, should only see img1 and img3
      state = getState(swipeRight(state, currentId!));
      const nextId = getCurrentImageId(state);
      expect(['img1', 'img3']).toContain(nextId);
      expect(nextId).not.toBe('img2');
    });
  });

  describe('Abnahmekriterium 3: Match löst pro Bild nur einmal aus; Links-Swipe auf Favoriten löst keins aus', () => {
    it('returns MatchEvent on first right swipe of favorite', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: true },
        { id: 'img2', isFavorite: false },
      ];
      const state = createState(images, 1);
      
      const result = swipeRight(state, 'img1');
      assertOk(result);
      expect(result.value).toEqual({ imageId: 'img1' });
      expect(result.state.matched).toEqual(new Set(['img1']));
    });

    it('does not return MatchEvent on second right swipe of same favorite', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: true },
        { id: 'img2', isFavorite: false },
      ];
      let state = createState(images, 1);
      
      // First swipe right on img1
      state = getState(swipeRight(state, 'img1'));
      expect(state.matched).toEqual(new Set(['img1']));
      
      // Swipe through to get back to img1
      state = getState(swipeRight(state, 'img2'));
      
      // Second swipe right on img1 should not trigger match
      const result = swipeRight(state, 'img1');
      assertOk(result);
      expect(result.value).toBeUndefined();
      expect(result.state.matched).toEqual(new Set(['img1']));
    });

    it('does not return MatchEvent on left swipe of favorite', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: true },
        { id: 'img2', isFavorite: false },
        { id: 'img3', isFavorite: false },
      ];
      const state = createState(images, 1);
      
      const result = swipeLeft(state, 'img1');
      assertOk(result);
      expect(result.state.matched).toEqual(new Set());
    });

    it('triggers match only once across multiple rounds', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: true },
        { id: 'img2', isFavorite: false },
      ];
      let state = createState(images, 1);
      
      // First round: swipe right on img1 -> match
      state = getState(swipeRight(state, 'img1'));
      expect(state.matched).toEqual(new Set(['img1']));
      
      // Continue swiping to complete a round
      state = getState(swipeRight(state, 'img2'));
      
      // Second round: swipe right on img1 again -> no match
      const result = swipeRight(state, 'img1');
      assertOk(result);
      expect(result.value).toBeUndefined();
    });
  });

  describe('Abnahmekriterium 4: Fixieren bei N=1 beendet sofort', () => {
    it('with N=1 and 1 image, is already complete', () => {
      const images: Image[] = [{ id: 'img1', isFavorite: false }];
      const state = createState(images, 1);
      
      // fixated=0, pool=1, so 0+1=1=targetN, complete
      expect(isComplete(state)).toBe(true);
    });

    it('with N=1 and 2 images, fixating one then swiping left completes', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
      ];
      let state = createState(images, 1);
      
      // Initially: fixated=0, pool=2, so 0+2=2>1, not complete
      expect(isComplete(state)).toBe(false);
      
      // Fixate one image
      state = getState(fixate(state, 'img1'));
      expect(state.pool).toEqual(['img2']);
      expect(state.fixated).toEqual(new Set(['img1']));
      // Now: fixated=1, pool=1, so 1+1=2>1, not complete
      expect(isComplete(state)).toBe(false);
      
      // Swipe left on the other image
      state = getState(swipeLeft(state, 'img2'));
      expect(state.pool).toEqual([]);
      expect(state.fixated).toEqual(new Set(['img1']));
      // Now: fixated=1, pool=0, so 1+0=1=targetN, complete
      expect(isComplete(state)).toBe(true);
    });

    it('with N=1, fixating the last image completes', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
      ];
      let state = createState(images, 1);
      
      // Remove one image first
      state = getState(swipeLeft(state, 'img1'));
      expect(state.pool).toEqual(['img2']);
      // Now: fixated=0, pool=1, so 0+1=1=targetN, complete
      expect(isComplete(state)).toBe(true);
      
      // Fixate the last image
      state = getState(fixate(state, 'img2'));
      expect(state.pool).toEqual([]);
      expect(state.fixated).toEqual(new Set(['img2']));
      // Now: fixated=1, pool=0, so 1+0=1=targetN, still complete
      expect(isComplete(state)).toBe(true);
    });
  });

  describe('Abnahmekriterium 5: Zurück macht Swipe und Fixieren rückgängig', () => {
    it('undoes swipeLeft', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
        { id: 'img3', isFavorite: false },
      ];
      let state = createState(images, 1);
      
      // Swipe left on img1
      state = getState(swipeLeft(state, 'img1'));
      expect(state.pool).toEqual(['img2', 'img3']);
      expect(state.history).toHaveLength(1);
      
      // Undo
      state = getState(undo(state));
      expect(state.pool).toEqual(['img1', 'img2', 'img3']);
      expect(state.history).toHaveLength(0);
    });

    it('undoes swipeRight', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
        { id: 'img3', isFavorite: false },
      ];
      let state = createState(images, 1);
      
      expect(getCurrentImageId(state)).toBe('img1');
      
      // Swipe right on img1
      state = getState(swipeRight(state, 'img1'));
      expect(getCurrentImageId(state)).toBe('img2');
      expect(state.history).toHaveLength(1);
      
      // Undo
      state = getState(undo(state));
      expect(getCurrentImageId(state)).toBe('img1');
      expect(state.history).toHaveLength(0);
    });

    it('undoes fixate', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
        { id: 'img3', isFavorite: false },
      ];
      let state = createState(images, 1);
      
      // Fixate img1
      state = getState(fixate(state, 'img1'));
      expect(state.pool).toEqual(['img2', 'img3']);
      expect(state.fixated).toEqual(new Set(['img1']));
      expect(state.history).toHaveLength(1);
      
      // Undo
      state = getState(undo(state));
      expect(state.pool).toEqual(['img1', 'img2', 'img3']);
      expect(state.fixated).toEqual(new Set());
      expect(state.history).toHaveLength(0);
    });

    it('undoes match from swipeRight', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: true },
        { id: 'img2', isFavorite: false },
      ];
      let state = createState(images, 1);
      
      // Swipe right on favorite img1 -> match
      state = getState(swipeRight(state, 'img1'));
      expect(state.matched).toEqual(new Set(['img1']));
      
      // Undo
      state = getState(undo(state));
      expect(state.matched).toEqual(new Set());
    });

    it('returns error when no actions to undo', () => {
      const images: Image[] = [{ id: 'img1', isFavorite: false }];
      const state = createState(images, 1);
      
      const result = undo(state);
      assertError(result, 'No actions to undo');
    });
  });

  describe('Abnahmekriterium 6: Edge-Case-Tests', () => {
    it('undo at the beginning does nothing (error)', () => {
      const images: Image[] = [{ id: 'img1', isFavorite: false }];
      const state = createState(images, 1);
      
      const result = undo(state);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('No actions to undo');
      }
    });

    it('rotation with empty pool after fixating all images', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
      ];
      let state = createState(images, 2);
      
      // Fixate both images
      state = getState(fixate(state, 'img1'));
      state = getState(fixate(state, 'img2'));
      
      expect(state.pool).toEqual([]);
      expect(state.fixated).toEqual(new Set(['img1', 'img2']));
      expect(getCurrentImageId(state)).toBeNull();
      expect(isComplete(state)).toBe(true);
    });

    it('swipeLeft on non-existent image returns error', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
      ];
      const state = createState(images, 1);
      
      const result = swipeLeft(state, 'nonexistent');
      assertError(result, 'Image nonexistent not found in pool');
    });

    it('swipeRight on non-existent image returns error', () => {
      const images: Image[] = [{ id: 'img1', isFavorite: false }];
      const state = createState(images, 1);
      
      const result = swipeRight(state, 'nonexistent');
      assertError(result, 'Image nonexistent not found in pool');
    });

    it('fixate on non-existent image returns error', () => {
      const images: Image[] = [{ id: 'img1', isFavorite: false }];
      const state = createState(images, 1);
      
      const result = fixate(state, 'nonexistent');
      assertError(result, 'Image nonexistent not found in pool');
    });

    it('multiple swipes and undos work correctly', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
        { id: 'img3', isFavorite: false },
      ];
      let state = createState(images, 1);
      
      // Swipe left on img1
      state = getState(swipeLeft(state, 'img1'));
      expect(state.pool).toEqual(['img2', 'img3']);
      
      // Swipe right on img2
      state = getState(swipeRight(state, 'img2'));
      expect(getCurrentImageId(state)).toBe('img3');
      
      // Undo swipeRight
      state = getState(undo(state));
      expect(getCurrentImageId(state)).toBe('img2');
      
      // Undo swipeLeft
      state = getState(undo(state));
      expect(state.pool).toEqual(['img1', 'img2', 'img3']);
    });

    it('fixate then undo then swipe works correctly', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
        { id: 'img3', isFavorite: false },
      ];
      let state = createState(images, 1);
      
      // Fixate img1
      state = getState(fixate(state, 'img1'));
      expect(state.pool).toEqual(['img2', 'img3']);
      expect(state.fixated).toEqual(new Set(['img1']));
      
      // Undo fixate
      state = getState(undo(state));
      expect(state.pool).toEqual(['img1', 'img2', 'img3']);
      expect(state.fixated).toEqual(new Set());
      
      // Now swipe left on img1 should work
      state = getState(swipeLeft(state, 'img1'));
      expect(state.pool).toEqual(['img2', 'img3']);
    });

    it('match is not triggered if image is not a favorite', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
      ];
      const state = createState(images, 1);
      
      const result = swipeRight(state, 'img1');
      assertOk(result);
      expect(result.value).toBeUndefined();
      expect(result.state.matched).toEqual(new Set());
    });

    it('rotation continues correctly after multiple fixations', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
        { id: 'img3', isFavorite: false },
        { id: 'img4', isFavorite: false },
      ];
      let state = createState(images, 2);
      
      // Fixate img1 and img3
      state = getState(fixate(state, 'img1'));
      state = getState(fixate(state, 'img3'));
      
      expect(state.pool).toEqual(['img2', 'img4']);
      expect(state.fixated).toEqual(new Set(['img1', 'img3']));
      
      // Current should be one of the remaining
      const currentId = getCurrentImageId(state);
      expect(['img2', 'img4']).toContain(currentId);
      
      // Swipe right, should only cycle through img2 and img4
      state = getState(swipeRight(state, currentId!));
      const nextId = getCurrentImageId(state);
      expect(['img2', 'img4']).toContain(nextId);
      expect(nextId).not.toBe('img1');
      expect(nextId).not.toBe('img3');
    });
  });

  describe('Integration tests', () => {
    it('complete workflow: swipe, fixate, undo, complete', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: true },
        { id: 'img2', isFavorite: false },
        { id: 'img3', isFavorite: false },
        { id: 'img4', isFavorite: false },
      ];
      let state = createState(images, 2);
      
      expect(isComplete(state)).toBe(false);
      
      // Swipe left on img4
      state = getState(swipeLeft(state, 'img4'));
      expect(state.pool).toEqual(['img1', 'img2', 'img3']);
      
      // Swipe right on img1 (favorite) -> match
      const result = swipeRight(state, 'img1');
      assertOk(result);
      expect(result.value).toEqual({ imageId: 'img1' });
      state = result.state;
      
      // Fixate img1
      state = getState(fixate(state, 'img1'));
      expect(state.fixated).toEqual(new Set(['img1']));
      expect(state.pool).toEqual(['img2', 'img3']);
      
      // Now pool + fixated = 3, targetN = 2, not complete yet
      expect(isComplete(state)).toBe(false);
      
      // Swipe left on img2
      state = getState(swipeLeft(state, 'img2'));
      expect(state.pool).toEqual(['img3']);
      
      // Now pool (1) + fixated (1) = 2 = targetN, should be complete
      expect(isComplete(state)).toBe(true);
      
      // Cannot swipe left anymore (fixated=1, pool=1, so 1+1=2=targetN)
      const leftResult = swipeLeft(state, 'img3');
      assertError(leftResult, 'Cannot swipe left: fixated (1) + pool (1) = 2 is at or below target N (2)');
      
      // But can still fixate
      state = getState(fixate(state, 'img3'));
      expect(state.fixated).toEqual(new Set(['img1', 'img3']));
      expect(state.pool).toEqual([]);
      expect(isComplete(state)).toBe(true);
    });

    it('match workflow with undo', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: true },
        { id: 'img2', isFavorite: false },
      ];
      let state = createState(images, 1);
      
      // Swipe right on img1 -> match
      let result = swipeRight(state, 'img1');
      assertOk(result);
      expect(result.value).toEqual({ imageId: 'img1' });
      state = result.state;
      
      // Undo the swipe
      state = getState(undo(state));
      expect(state.matched).toEqual(new Set());
      expect(getCurrentImageId(state)).toBe('img1');
      
      // Swipe right again -> match again (first time for this "session")
      result = swipeRight(state, 'img1');
      assertOk(result);
      expect(result.value).toEqual({ imageId: 'img1' });
    });
  });
});
