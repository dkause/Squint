import { describe, expect, it } from 'vitest';
import {
  createState,
  next,
  select,
  undo,
  isComplete,
  getCurrentImageId,
  type Result,
  type State,
  type Image,
} from './logic.js';

function getState(result: Result<unknown>): State {
  if (!result.ok) {
    throw new Error(`Expected ok result, got error: ${(result as { ok: false; error: string }).error}`);
  }
  return result.state;
}

function assertError(result: Result<unknown>): void {
  expect(result.ok).toBe(false);
}

describe('Auswahlmodell: next (links) und select (rechts)', () => {
  describe('createState', () => {
    it('starts with all images in the pool, none selected', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: true },
      ];
      const state = createState(images, 2);
      expect(state.pool).toEqual(['img1', 'img2']);
      expect(state.fixated).toEqual(new Set());
      expect(state.favorites).toEqual(new Set(['img2']));
      expect(isComplete(state)).toBe(false);
    });
  });

  describe('next (swipe left): weiter', () => {
    it('keeps the image in the pool and advances', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
        { id: 'img3', isFavorite: false },
      ];
      let state = createState(images, 1);

      state = getState(next(state, 'img1'));
      expect(state.pool).toEqual(['img1', 'img2', 'img3']);
      expect(getCurrentImageId(state)).toBe('img2');
    });

    it('wraps around after the last image', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
      ];
      let state = createState(images, 1);
      state = getState(next(state, 'img1'));
      state = getState(next(state, 'img2'));
      expect(getCurrentImageId(state)).toBe('img1');
      expect(state.pool).toHaveLength(2);
    });

    it('does not trigger a match on favorites', () => {
      const images: Image[] = [
        { id: 'fav', isFavorite: true },
        { id: 'img2', isFavorite: false },
      ];
      const state = createState(images, 1);
      const result = next(state, 'fav');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeUndefined();
        expect(result.state.matched).toEqual(new Set());
      }
    });

    it('rejects unknown image ids', () => {
      const images: Image[] = [{ id: 'img1', isFavorite: false }];
      assertError(next(createState(images, 1), 'nope'));
    });
  });

  describe('select (swipe right): Auswahl', () => {
    it('selects the image, counts toward N, removes it from rotation', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
        { id: 'img3', isFavorite: false },
      ];
      let state = createState(images, 2);

      state = getState(select(state, 'img1'));
      expect(state.fixated).toEqual(new Set(['img1']));
      expect(state.pool).toEqual(['img2', 'img3']);
      expect(isComplete(state)).toBe(false);

      state = getState(select(state, 'img2'));
      expect(state.fixated).toEqual(new Set(['img1', 'img2']));
      expect(isComplete(state)).toBe(true);
    });

    it('rejects further selection once complete', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
      ];
      let state = createState(images, 1);
      state = getState(select(state, 'img1'));
      assertError(select(state, 'img2'));
    });

    it('select on a favorite triggers exactly one match event', () => {
      const images: Image[] = [
        { id: 'fav', isFavorite: true },
        { id: 'img2', isFavorite: false },
      ];
      const state = createState(images, 2);

      const first = select(state, 'fav');
      expect(first.ok).toBe(true);
      if (first.ok) {
        expect(first.value).toEqual({ imageId: 'fav' });
      }

      // Second select of a different image: no event
      const second = select(first.ok ? first.state : state, 'img2');
      expect(second.ok).toBe(true);
      if (second.ok) {
        expect(second.value).toBeUndefined();
      }
    });

    it('select on a non-favorite triggers no match event', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
      ];
      const state = createState(images, 2);
      const result = select(state, 'img1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeUndefined();
        expect(result.state.matched).toEqual(new Set());
      }
    });
  });

  describe('undo', () => {
    it('reverts a next (rotation goes back)', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
      ];
      let state = createState(images, 1);
      state = getState(next(state, 'img1'));
      state = getState(undo(state));
      expect(getCurrentImageId(state)).toBe('img1');
      expect(state.history).toHaveLength(0);
    });

    it('reverts a select (back in pool, counts no longer)', () => {
      const images: Image[] = [
        { id: 'img1', isFavorite: false },
        { id: 'img2', isFavorite: false },
        { id: 'img3', isFavorite: false },
      ];
      let state = createState(images, 2);
      state = getState(select(state, 'img1'));
      expect(state.fixated).toEqual(new Set(['img1']));

      state = getState(undo(state));
      expect(state.fixated).toEqual(new Set());
      expect(state.pool).toEqual(['img1', 'img2', 'img3']);
      expect(isComplete(state)).toBe(false);
    });

    it('reverts a match caused by a select', () => {
      const images: Image[] = [
        { id: 'fav', isFavorite: true },
        { id: 'img2', isFavorite: false },
      ];
      let state = createState(images, 2);
      state = getState(select(state, 'fav'));
      expect(state.matched).toEqual(new Set(['fav']));

      state = getState(undo(state));
      expect(state.matched).toEqual(new Set());
    });

    it('errors when there is nothing to undo', () => {
      const images: Image[] = [{ id: 'img1', isFavorite: false }];
      assertError(undo(createState(images, 1)));
    });
  });

  describe('kompletter Durchlauf', () => {
    it('select N images via next/select to complete', () => {
      const images: Image[] = [
        { id: 'a', isFavorite: false },
        { id: 'b', isFavorite: true },
        { id: 'c', isFavorite: false },
        { id: 'd', isFavorite: false },
      ];
      let state = createState(images, 2);

      // links: weiter
      state = getState(next(state, 'a'));
      // rechts: b auswaehlen (Favorit -> Match)
      const matchSelect = select(state, 'b');
      expect(matchSelect.ok).toBe(true);
      if (matchSelect.ok) {
        expect(matchSelect.value).toEqual({ imageId: 'b' });
      }
      state = getState(matchSelect);
      expect(isComplete(state)).toBe(false);

      // links: weiter (c ueberspringen)
      state = getState(next(state, 'c'));
      // rechts: d auswaehlen -> fertig
      state = getState(select(state, 'd'));
      expect(isComplete(state)).toBe(true);
      expect(state.fixated).toEqual(new Set(['b', 'd']));
    });
  });
});
