/**
 * Unit-Tests für das Match-Feedback-Modul (T5, Auswahl-Modell)
 * Testet die reinen Funktionen (DOM-frei)
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createState,
  select,
  next,
  type State,
  type Image,
  type Result
} from '../src/logic.js';

import {
  isMatched,
  isFavorite,
  shouldShowMatchFeedback,
  type MatchEvent
} from './match.js';

/** Erstellt einen Test-State mit gegebenen Bildern */
function createTestState(images: Image[], targetN: number): State {
  return createState(images, targetN);
}

function applyResult(result: Result<unknown>): State {
  if (!result.ok) {
    throw new Error('expected ok');
  }
  return result.state;
}

/** Standard-Test-Bilder */
const testImages: Image[] = [
  { id: 'img1', isFavorite: true },
  { id: 'img2', isFavorite: false },
  { id: 'img3', isFavorite: true },
  { id: 'img4', isFavorite: false },
];

describe('isMatched', () => {
  let state: State;

  beforeEach(() => {
    state = createTestState(testImages, 2);
  });

  it('gibt false zurück, wenn das Bild nicht ausgewählt wurde', () => {
    expect(isMatched(state, 'img1')).toBe(false);
    expect(isMatched(state, 'img2')).toBe(false);
  });

  it('gibt true zurück, wenn ein Favorit ausgewählt wurde', () => {
    state = applyResult(select(state, 'img1'));
    expect(isMatched(state, 'img1')).toBe(true);
  });

  it('gibt false zurück, wenn ein Favorit nur übersprungen wurde (next)', () => {
    state = applyResult(next(state, 'img1'));
    expect(isMatched(state, 'img1')).toBe(false);
  });
});

describe('isFavorite', () => {
  const state = createTestState(testImages, 2);

  it('erkennt Favoriten und Nicht-Favoriten', () => {
    expect(isFavorite(state, 'img1')).toBe(true);
    expect(isFavorite(state, 'img2')).toBe(false);
    expect(isFavorite(state, 'img3')).toBe(true);
    expect(isFavorite(state, 'img4')).toBe(false);
  });
});

describe('shouldShowMatchFeedback', () => {
  let state: State;

  beforeEach(() => {
    state = createTestState(testImages, 2);
  });

  it('zeigt Feedback nur bei Auswahl eines Favoriten', () => {
    state = applyResult(select(state, 'img1'));
    expect(shouldShowMatchFeedback(state, 'img1')).toBe(true);
  });

  it('kein Feedback bei Auswahl eines Nicht-Favoriten', () => {
    state = applyResult(select(state, 'img2'));
    expect(shouldShowMatchFeedback(state, 'img2')).toBe(false);
  });

  it('kein Feedback bei Favorit ohne Auswahl', () => {
    state = applyResult(next(state, 'img1'));
    expect(shouldShowMatchFeedback(state, 'img1')).toBe(false);
  });
});

describe('MatchEvent aus select', () => {
  it('wird bei Auswahl eines Favoriten genau einmal geliefert', () => {
    const state = createTestState(testImages, 2);

    const first = select(state, 'img1');
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.value).toEqual({ imageId: 'img1' } satisfies MatchEvent);
      expect(first.state.matched).toEqual(new Set(['img1']));
    }
  });

  it('wird bei Auswahl eines Nicht-Favoriten nicht geliefert', () => {
    const state = createTestState(testImages, 2);
    const result = select(state, 'img2');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeUndefined();
    }
  });
});
