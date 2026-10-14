/**
 * Match-Feedback-Modul (T5, Auswahl-Modell)
 * Enthält reine Funktionen für die Match-Logik.
 * DOM-frei testbar: Kern-Logik in reinen Funktionen.
 */

import type { State } from '../src/logic.js';

/** Match-Event aus der Logic */
export interface MatchEvent {
  imageId: string;
}

/**
 * Prüft, ob ein Bild gematcht wurde (ist in state.matched).
 */
export function isMatched(state: State, imageId: string): boolean {
  return state.matched.has(imageId);
}

/**
 * Prüft, ob ein Bild ein Favorit ist.
 */
export function isFavorite(state: State, imageId: string): boolean {
  return state.favorites.has(imageId);
}

/**
 * Prüft, ob für ein Bild Match-Feedback gezeigt werden soll.
 * Das ist der Fall, wenn es ein Favorit ist und gematcht wurde.
 */
export function shouldShowMatchFeedback(state: State, imageId: string): boolean {
  return isFavorite(state, imageId) && isMatched(state, imageId);
}
