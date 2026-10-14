/**
 * Unit-Tests für das Match-Feedback-Modul (T5)
 * Testet die reinen Funktionen (DOM-frei)
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createState,
  swipeRight,
  type State,
  type Image
} from '../src/logic.js';

import {
  isMatched,
  isFavorite,
  shouldShowMatchFeedback,
  handleAdopt,
  handleContinue,
  processMatchEvent,
  type MatchEvent
} from './match.js';

// ============================================================================
// Test-Helper
// ============================================================================

/** Erstellt einen Test-State mit gegebenen Bildern */
function createTestState(images: Image[], targetN: number): State {
  return createState(images, targetN);
}

/** Standard-Test-Bilder */
const testImages: Image[] = [
  { id: 'img1', isFavorite: true },
  { id: 'img2', isFavorite: false },
  { id: 'img3', isFavorite: true },
  { id: 'img4', isFavorite: false },
];

// ============================================================================
// Tests für isMatched
// ============================================================================

describe('isMatched', () => {
  let state: State;

  beforeEach(() => {
    state = createTestState(testImages, 2);
  });

  it('sollte false zurückgeben, wenn Bild nicht gematcht wurde', () => {
    expect(isMatched(state, 'img1')).toBe(false);
    expect(isMatched(state, 'img2')).toBe(false);
  });

  it('sollte true zurückgeben, wenn Bild gematcht wurde', () => {
    // Führe einen Right-Swipe auf ein Favorit aus
    const result = swipeRight(state, 'img1');
    if (result.ok) {
      state = result.state;
      // Nach Right-Swipe auf Favorit sollte es gematcht sein
      expect(isMatched(state, 'img1')).toBe(true);
    }
  });

  it('sollte false zurückgeben für nicht-Favoriten nach Right-Swipe', () => {
    const result = swipeRight(state, 'img2');
    if (result.ok) {
      state = result.state;
      // Nicht-Favorit wird nicht gematcht
      expect(isMatched(state, 'img2')).toBe(false);
    }
  });
});

// ============================================================================
// Tests für isFavorite
// ============================================================================

describe('isFavorite', () => {
  let state: State;

  beforeEach(() => {
    state = createTestState(testImages, 2);
  });

  it('sollte true zurückgeben für Favoriten', () => {
    expect(isFavorite(state, 'img1')).toBe(true);
    expect(isFavorite(state, 'img3')).toBe(true);
  });

  it('sollte false zurückgeben für Nicht-Favoriten', () => {
    expect(isFavorite(state, 'img2')).toBe(false);
    expect(isFavorite(state, 'img4')).toBe(false);
  });
});

// ============================================================================
// Tests für shouldShowMatchFeedback
// ============================================================================

describe('shouldShowMatchFeedback', () => {
  let state: State;

  beforeEach(() => {
    state = createTestState(testImages, 2);
  });

  it('sollte false zurückgeben für nicht-gematchte Favoriten', () => {
    expect(shouldShowMatchFeedback(state, 'img1')).toBe(false);
  });

  it('sollte true zurückgeben für gematchte Favoriten', () => {
    // Führe Right-Swipe auf Favorit aus
    const result = swipeRight(state, 'img1');
    if (result.ok) {
      state = result.state;
      expect(shouldShowMatchFeedback(state, 'img1')).toBe(true);
    }
  });

  it('sollte false zurückgeben für gematchte Nicht-Favoriten', () => {
    // Manuelles Hinzufügen zu matched (sollte nicht passieren, aber testen)
    state = {
      ...state,
      matched: new Set(['img2'])
    };
    expect(shouldShowMatchFeedback(state, 'img2')).toBe(false);
  });

  it('sollte false zurückgeben für nicht-gematchte Nicht-Favoriten', () => {
    expect(shouldShowMatchFeedback(state, 'img2')).toBe(false);
  });
});

// ============================================================================
// Tests für handleAdopt
// ============================================================================

describe('handleAdopt', () => {
  let state: State;

  beforeEach(() => {
    state = createTestState(testImages, 2);
  });

  it('sollte das Bild fixieren und aus dem Pool entfernen', () => {
    // Erst Right-Swipe, dann Adopt
    const swipeResult = swipeRight(state, 'img1');
    if (swipeResult.ok) {
      state = swipeResult.state;
      const adoptResult = handleAdopt(state, 'img1');
      
      expect(adoptResult.ok).toBe(true);
      state = adoptResult.state;
      
      // Bild sollte fixiert sein
      expect(state.fixated.has('img1')).toBe(true);
      // Bild sollte nicht mehr im Pool sein
      expect(state.pool.includes('img1')).toBe(false);
    }
  });

  it('sollte false zurückgeben, wenn Bild nicht im Pool ist', () => {
    // Versuche, ein nicht existierendes Bild zu adoptieren
    const result = handleAdopt(state, 'nonexistent');
    expect(result.ok).toBe(false);
  });

  it('sollte den State unverändert lassen bei Fehler', () => {
    const originalPool = [...state.pool];
    const originalFixated = new Set(state.fixated);
    
    const result = handleAdopt(state, 'nonexistent');
    expect(result.ok).toBe(false);
    expect(result.state.pool).toEqual(originalPool);
    expect(result.state.fixated).toEqual(originalFixated);
  });
});

// ============================================================================
// Tests für handleContinue
// ============================================================================

describe('handleContinue', () => {
  let state: State;

  beforeEach(() => {
    state = createTestState(testImages, 2);
  });

  it('sollte ok: true zurückgeben', () => {
    const result = handleContinue(state, 'img1');
    expect(result.ok).toBe(true);
  });

  it('sollte den State unverändert lassen', () => {
    const originalPool = [...state.pool];
    const originalFixated = new Set(state.fixated);
    const originalMatched = new Set(state.matched);
    
    const result = handleContinue(state, 'img1');
    expect(result.ok).toBe(true);
    expect(result.state.pool).toEqual(originalPool);
    expect(result.state.fixated).toEqual(originalFixated);
    expect(result.state.matched).toEqual(originalMatched);
  });

  it('sollte den State unverändert lassen, selbst wenn Bild gematcht ist', () => {
    // Erst Right-Swipe auf Favorit
    const swipeResult = swipeRight(state, 'img1');
    if (swipeResult.ok) {
      state = swipeResult.state;
      const originalPool = [...state.pool];
      const originalMatched = new Set(state.matched);
      
      const result = handleContinue(state, 'img1');
      expect(result.ok).toBe(true);
      expect(result.state.pool).toEqual(originalPool);
      expect(result.state.matched).toEqual(originalMatched);
    }
  });
});

// ============================================================================
// Tests für processMatchEvent
// ============================================================================

describe('processMatchEvent', () => {
  let state: State;

  beforeEach(() => {
    state = createTestState(testImages, 2);
  });

  it('sollte vibrate, showFrame und showStar auf true setzen', () => {
    const event: MatchEvent = { imageId: 'img1' };
    const result = processMatchEvent(state, event, 'continue');
    
    expect(result.vibrate).toBe(true);
    expect(result.showFrame).toBe(true);
    expect(result.showStar).toBe(true);
    expect(result.showPopup).toBe(true);
  });

  it('sollte bei "adopt" das Bild fixieren', () => {
    const event: MatchEvent = { imageId: 'img1' };
    const result = processMatchEvent(state, event, 'adopt');
    
    expect(result.ok).toBe(true);
    expect(result.state.fixated.has('img1')).toBe(true);
    expect(result.state.pool.includes('img1')).toBe(false);
  });

  it('sollte bei "continue" den State unverändert lassen', () => {
    const event: MatchEvent = { imageId: 'img1' };
    const originalPool = [...state.pool];
    const originalFixated = new Set(state.fixated);
    
    const result = processMatchEvent(state, event, 'continue');
    
    expect(result.ok).toBe(true);
    expect(result.state.pool).toEqual(originalPool);
    expect(result.state.fixated).toEqual(originalFixated);
  });

  it('sollte bei "adopt" mit nicht existierendem Bild ok: false zurückgeben', () => {
    const event: MatchEvent = { imageId: 'nonexistent' };
    const result = processMatchEvent(state, event, 'adopt');
    
    expect(result.ok).toBe(false);
  });
});

// ============================================================================
// Integrationstests
// ============================================================================

describe('Match-Feedback Integration', () => {
  it('sollte Match-Event nur einmal pro Bild auslösen', () => {
    let state = createTestState(testImages, 2);
    
    // Erster Right-Swipe auf Favorit
    const result1 = swipeRight(state, 'img1');
    expect(result1.ok).toBe(true);
    if (result1.ok) {
      expect(result1.value).toBeDefined(); // Sollte Match-Event sein
      state = result1.state;
    }
    
    // Zweiter Right-Swipe auf dasselbe Bild
    const result2 = swipeRight(state, 'img1');
    expect(result2.ok).toBe(true);
    if (result2.ok) {
      expect(result2.value).toBeUndefined(); // Kein Match-Event mehr
    }
  });

  it('sollte Match-Event für verschiedene Favoriten auslösen', () => {
    let state = createTestState(testImages, 2);
    
    // Right-Swipe auf erstes Favorit
    const result1 = swipeRight(state, 'img1');
    expect(result1.ok).toBe(true);
    if (result1.ok) {
      expect(result1.value).toBeDefined();
      state = result1.state;
    }
    
    // Right-Swipe auf zweites Favorit
    const result2 = swipeRight(state, 'img3');
    expect(result2.ok).toBe(true);
    if (result2.ok) {
      expect(result2.value).toBeDefined();
      expect(result2.value!.imageId).toBe('img3');
    }
  });

  it('sollte nach Adopt isComplete true sein, wenn N=1', async () => {
    const singleImageState = createTestState([{ id: 'img1', isFavorite: true }], 1);
    
    // Right-Swipe
    const swipeResult = swipeRight(singleImageState, 'img1');
    expect(swipeResult.ok).toBe(true);
    let state: State;
    if (swipeResult.ok) {
      state = swipeResult.state;
    } else {
      state = singleImageState;
    }
    
    // Adopt
    const adoptResult = handleAdopt(state, 'img1');
    expect(adoptResult.ok).toBe(true);
    state = adoptResult.state;
    
    // Prüfe, ob komplett
    const { isComplete } = await import('../src/logic.js');
    expect(isComplete(state)).toBe(true);
  });
});
