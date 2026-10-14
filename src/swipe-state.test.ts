/**
 * Unit-Tests für Serialisierungsfunktionen aus swipe.ts (T4)
 * DOM-frei, testet nur die reinen Funktionen.
 */

import { describe, it, expect } from 'vitest';
import {
  createState,
  type State,
  type Image as LogicImage
} from './logic.js';

// Importiere nur die Serialisierungsfunktionen
// Wir müssen sie hier neu definieren, da wir swipe.ts nicht importieren können
// (weil es DOM-abhängig ist)

interface SerializableState {
  pool: string[];
  fixated: string[];
  favorites: string[];
  matched: string[];
  history: Array<{
    type: string;
    imageId: string;
    index?: number;
  }>;
  targetN: number;
  currentIndex: number;
}

function serializeState(state: State): SerializableState {
  return {
    pool: [...state.pool],
    fixated: [...state.fixated],
    favorites: [...state.favorites],
    matched: [...state.matched],
    history: state.history.map(action => ({
      type: action.type,
      imageId: action.imageId,
      index: 'index' in action ? action.index : undefined
    })),
    targetN: state.targetN,
    currentIndex: state.currentIndex
  };
}

function deserializeState(serialized: SerializableState, images: readonly LogicImage[]): State {
  // Erstelle Initial-State aus Bildern
  const initialState = createState(images, serialized.targetN);
  
  // Überschreibe mit serialisierten Daten
  return {
    ...initialState,
    pool: serialized.pool,
    fixated: new Set(serialized.fixated),
    favorites: new Set(serialized.favorites),
    matched: new Set(serialized.matched),
    history: serialized.history.map(action => {
      if (action.index !== undefined) {
        return { type: action.type as 'swipeLeft' | 'fixate', imageId: action.imageId, index: action.index };
      }
      return { type: action.type as 'swipeRight', imageId: action.imageId };
    }),
    currentIndex: serialized.currentIndex
  };
}

// Test-Helper: Erstelle einfache LogicImages
function createTestImages(count: number, favorites: number[] = []): LogicImage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `img-${i}`,
    isFavorite: favorites.includes(i)
  }));
}

// Test-Helper: Erstelle State mit bestimmten Eigenschaften
function createTestState(images: LogicImage[], targetN: number): State {
  return createState(images, targetN);
}

// Test-Helper: Erstelle einen manuellen State für Tests
function createManualState(
  pool: string[],
  fixated: string[] = [],
  favorites: string[] = [],
  matched: string[] = [],
  history: Array<{ type: string; imageId: string; index?: number }> = [],
  targetN: number = 0,
  currentIndex: number = 0
): State {
  return {
    pool,
    fixated: new Set(fixated),
    favorites: new Set(favorites),
    matched: new Set(matched),
    history: history.map(h => {
      if (h.index !== undefined) {
        return { type: h.type as 'swipeLeft' | 'fixate', imageId: h.imageId, index: h.index };
      }
      return { type: h.type as 'swipeRight', imageId: h.imageId };
    }),
    targetN,
    currentIndex
  };
}

describe('serializeState', () => {
  it('sollte den State korrekt serialisieren', () => {
    const images = createTestImages(3, [0, 2]);
    const state = createTestState(images, 2);
    
    const serialized = serializeState(state);
    
    expect(serialized.pool).toEqual(['img-0', 'img-1', 'img-2']);
    expect(serialized.fixated).toEqual([]);
    expect(serialized.favorites).toEqual(['img-0', 'img-2']);
    expect(serialized.matched).toEqual([]);
    expect(serialized.history).toEqual([]);
    expect(serialized.targetN).toBe(2);
    expect(serialized.currentIndex).toBe(0);
  });

  it('sollte Actions mit Index korrekt serialisieren', () => {
    const state = createManualState(
      ['img-0', 'img-1', 'img-2'],
      [],
      [],
      [],
      [{ type: 'swipeLeft', imageId: 'img-0', index: 0 }],
      2,
      0
    );
    
    const serialized = serializeState(state);
    
    expect(serialized.history).toHaveLength(1);
    expect(serialized.history[0]!.type).toBe('swipeLeft');
    expect(serialized.history[0]!.imageId).toBe('img-0');
    expect(serialized.history[0]!.index).toBe(0);
  });

  it('sollte Actions ohne Index korrekt serialisieren', () => {
    const state = createManualState(
      ['img-0', 'img-1', 'img-2'],
      [],
      [],
      [],
      [{ type: 'swipeRight', imageId: 'img-0' }],
      2,
      0
    );
    
    const serialized = serializeState(state);
    
    expect(serialized.history).toHaveLength(1);
    expect(serialized.history[0]!.type).toBe('swipeRight');
    expect(serialized.history[0]!.imageId).toBe('img-0');
    expect(serialized.history[0]!.index).toBeUndefined();
  });

  it('sollte alle Sets korrekt serialisieren', () => {
    const state = createManualState(
      ['img-0', 'img-1'],
      ['img-2'],
      ['img-0', 'img-1'],
      ['img-0'],
      [],
      2,
      0
    );
    
    const serialized = serializeState(state);
    
    expect(serialized.pool).toEqual(['img-0', 'img-1']);
    expect(serialized.fixated).toEqual(['img-2']);
    expect(serialized.favorites).toEqual(['img-0', 'img-1']);
    expect(serialized.matched).toEqual(['img-0']);
  });
});

describe('deserializeState', () => {
  it('sollte den State korrekt deserialisieren', () => {
    const images = createTestImages(3, [0, 2]);
    const originalState = createTestState(images, 2);
    
    const serialized = serializeState(originalState);
    const deserialized = deserializeState(serialized, images);
    
    expect(deserialized.pool).toEqual(originalState.pool);
    expect(deserialized.fixated).toEqual(originalState.fixated);
    expect(deserialized.favorites).toEqual(originalState.favorites);
    expect(deserialized.matched).toEqual(originalState.matched);
    expect(deserialized.history).toEqual(originalState.history);
    expect(deserialized.targetN).toBe(originalState.targetN);
    expect(deserialized.currentIndex).toBe(originalState.currentIndex);
  });

  it('sollte Sets korrekt in Sets umwandeln', () => {
    const images = createTestImages(3, [0, 1, 2]);
    
    const serialized: SerializableState = {
      pool: ['img-0', 'img-1', 'img-2'],
      fixated: ['img-0'],
      favorites: ['img-1', 'img-2'],
      matched: ['img-0'],
      history: [],
      targetN: 2,
      currentIndex: 1
    };
    
    const deserialized = deserializeState(serialized, images);
    
    expect(deserialized.fixated).toBeInstanceOf(Set);
    expect(deserialized.fixated).toEqual(new Set(['img-0']));
    expect(deserialized.favorites).toBeInstanceOf(Set);
    expect(deserialized.favorites).toEqual(new Set(['img-1', 'img-2']));
    expect(deserialized.matched).toBeInstanceOf(Set);
    expect(deserialized.matched).toEqual(new Set(['img-0']));
  });

  it('sollte History korrekt deserialisieren', () => {
    const images = createTestImages(3);
    
    const serialized: SerializableState = {
      pool: ['img-0', 'img-1', 'img-2'],
      fixated: [],
      favorites: [],
      matched: [],
      history: [
        { type: 'swipeLeft', imageId: 'img-0', index: 0 },
        { type: 'swipeRight', imageId: 'img-1' },
        { type: 'fixate', imageId: 'img-2', index: 2 }
      ],
      targetN: 2,
      currentIndex: 0
    };
    
    const deserialized = deserializeState(serialized, images);
    
    expect(deserialized.history).toHaveLength(3);
    expect(deserialized.history[0]!.type).toBe('swipeLeft');
    expect(deserialized.history[1]!.type).toBe('swipeRight');
    expect(deserialized.history[2]!.type).toBe('fixate');
  });
});

describe('Roundtrip: serialize -> deserialize', () => {
  it('sollte den State nach mehreren Änderungen korrekt wiederherstellen', () => {
    const images = createTestImages(5, [1, 3]);
    
    // Erstelle einen State mit verschiedenen Änderungen
    const state = createManualState(
      ['img-0', 'img-2', 'img-4'], // pool nach einigen swipeLeft
      ['img-3'], // fixated
      ['img-1', 'img-3'], // favorites
      ['img-1'], // matched
      [
        { type: 'swipeLeft', imageId: 'img-1', index: 1 },
        { type: 'swipeRight', imageId: 'img-0' },
        { type: 'fixate', imageId: 'img-3', index: 3 }
      ],
      3,
      1
    );
    
    // Serialisiere und deserialisiere
    const serialized = serializeState(state);
    const deserialized = deserializeState(serialized, images);
    
    // Prüfe, dass der State identisch ist
    expect(deserialized.pool).toEqual(state.pool);
    expect(deserialized.fixated).toEqual(state.fixated);
    expect(deserialized.favorites).toEqual(state.favorites);
    expect(deserialized.matched).toEqual(state.matched);
    expect(deserialized.history).toEqual(state.history);
    expect(deserialized.targetN).toBe(state.targetN);
    expect(deserialized.currentIndex).toBe(state.currentIndex);
  });

  it('sollte nach undo-ähnlichen Zuständen funktionieren', () => {
    const images = createTestImages(4);
    
    // State nach einigen Operationen und dann undo
    const state = createManualState(
      ['img-0', 'img-1', 'img-2', 'img-3'], // pool wiederhergestellt
      [],
      [],
      [],
      [
        { type: 'swipeLeft', imageId: 'img-0', index: 0 }
      ],
      2,
      0
    );
    
    // Serialisiere und deserialisiere
    const serialized = serializeState(state);
    const deserialized = deserializeState(serialized, images);
    
    // Prüfe Pool
    expect(deserialized.pool).toEqual(['img-0', 'img-1', 'img-2', 'img-3']);
    expect(deserialized.history).toHaveLength(1);
  });
});

describe('Edge Cases', () => {
  it('sollte leeren State korrekt serialisieren/deserialisieren', () => {
    const images: LogicImage[] = [];
    const state = createTestState(images, 0);
    
    const serialized = serializeState(state);
    const deserialized = deserializeState(serialized, images);
    
    expect(deserialized.pool).toEqual([]);
    expect(deserialized.fixated).toEqual(new Set());
    expect(deserialized.favorites).toEqual(new Set());
    expect(deserialized.matched).toEqual(new Set());
    expect(deserialized.history).toEqual([]);
    expect(deserialized.targetN).toBe(0);
    expect(deserialized.currentIndex).toBe(0);
  });

  it('sollte State mit allen Bildern als Favoriten korrekt behandeln', () => {
    const images = createTestImages(3, [0, 1, 2]);
    const state = createTestState(images, 1);
    
    const serialized = serializeState(state);
    const deserialized = deserializeState(serialized, images);
    
    expect(deserialized.favorites).toEqual(new Set(['img-0', 'img-1', 'img-2']));
  });

  it('sollte State mit komplexer History korrekt behandeln', () => {
    const images = createTestImages(4);
    
    const state = createManualState(
      ['img-0', 'img-1'],
      ['img-2', 'img-3'],
      ['img-0'],
      ['img-0'],
      [
        { type: 'swipeLeft', imageId: 'img-1', index: 1 },
        { type: 'swipeRight', imageId: 'img-0' },
        { type: 'fixate', imageId: 'img-2', index: 2 },
        { type: 'fixate', imageId: 'img-3', index: 3 },
        { type: 'swipeLeft', imageId: 'img-1', index: 1 }
      ],
      2,
      0
    );
    
    const serialized = serializeState(state);
    const deserialized = deserializeState(serialized, images);
    
    expect(deserialized.pool).toEqual(['img-0', 'img-1']);
    expect(deserialized.fixated).toEqual(new Set(['img-2', 'img-3']));
    expect(deserialized.history).toHaveLength(5);
  });
});
