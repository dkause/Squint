/**
 * Match-Feedback-Modul (T5)
 * Enthält reine Funktionen für die Match-Logik.
 * DOM-frei testbar: Kern-Logik in reinen Funktionen.
 */

import { fixate, type State } from '../src/logic.js';

// ============================================================================
// Typen
// ============================================================================

/** Match-Event aus der Logic */
export interface MatchEvent {
  imageId: string;
}

/** Entscheidung des Nutzers im Popup */
export type MatchDecision = 'adopt' | 'continue';

// ============================================================================
// Reine Funktionen (DOM-frei, testbar)
// ============================================================================

/**
 * Prüft, ob ein Bild gematcht wurde (ist in state.matched).
 * Reine Funktion für Tests.
 */
export function isMatched(state: State, imageId: string): boolean {
  return state.matched.has(imageId);
}

/**
 * Prüft, ob ein Bild ein Favorit ist.
 * Reine Funktion für Tests.
 */
export function isFavorite(state: State, imageId: string): boolean {
  return state.favorites.has(imageId);
}

/**
 * Prüft, ob für ein Bild Match-Feedback gezeigt werden soll.
 * Das ist der Fall, wenn es ein Favorit ist und gematcht wurde.
 * Reine Funktion für Tests.
 */
export function shouldShowMatchFeedback(state: State, imageId: string): boolean {
  return isFavorite(state, imageId) && isMatched(state, imageId);
}

/**
 * Führt die "Übernehmen"-Aktion aus: fixiert das Bild.
 * Reine Funktion für Tests.
 */
export function handleAdopt(state: State, imageId: string): { ok: boolean; state: State } {
  const result = fixate(state, imageId);
  if (result.ok) {
    return { ok: true, state: result.state };
  }
  return { ok: false, state };
}

/**
 * Führt die "Weiter sichten"-Aktion aus: Bild bleibt im Pool.
 * Reine Funktion für Tests - der State bleibt unverändert.
 */
export function handleContinue(state: State, _imageId: string): { ok: boolean; state: State } { // eslint-disable-line @typescript-eslint/no-unused-vars
  // Bei "Weiter sichten" ändert sich der State nicht - das Bild bleibt im Pool
  // und die Markierung bleibt erhalten (matched Set bleibt bestehen)
  return { ok: true, state };
}

/**
 * Verarbeitet ein Match-Event und gibt die notwendigen Aktionen zurück.
 * Reine Funktion für Tests.
 */
export function processMatchEvent(
  state: State,
  event: MatchEvent,
  decision: MatchDecision
): { ok: boolean; state: State; vibrate: boolean; showFrame: boolean; showStar: boolean; showPopup: boolean } {
  const { imageId } = event;

  // Immer Vibration und visuelles Feedback
  const vibrate = true;
  const showFrame = true;
  const showStar = true;

  // Popup nur bei erstem Match (wird von Logic bereits sichergestellt)
  const showPopup = true;

  // State basierend auf Entscheidung aktualisieren
  if (decision === 'adopt') {
    const result = handleAdopt(state, imageId);
    if (result.ok) {
      return { ok: true, state: result.state, vibrate, showFrame, showStar, showPopup };
    }
    return { ok: false, state, vibrate, showFrame, showStar, showPopup };
  }

  // Bei 'continue' bleibt der State unverändert
  return { ok: true, state, vibrate, showFrame, showStar, showPopup };
}
