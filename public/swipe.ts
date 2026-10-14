/**
 * Kunden-UI: Swipe (T4 + T5)
 * Vanilla TypeScript, Pointer Events, kein Framework.
 */

import {
  createState,
  next,
  select,
  undo,
  isComplete,
  getCurrentImageId,
  createGridState,
  toggleFade,
  remainingImages,
  isGridComplete,
  type State,
  type GridState,
  type Image as LogicImage
} from '../src/logic.js';
import { showFinishDialog, showLockedView, sendFinishRequest } from './finish.js';

// ============================================================================
// Typen
// ============================================================================

interface ImageMeta {
  filename: string;
  originalname: string;
  favorite: boolean;
}

interface SetMeta {
  n: number;
  locked: boolean;
  images: ImageMeta[];
}

// ============================================================================
// Serialisierung für localStorage
// ============================================================================

/** Serialisierbare Darstellung des States */
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

/** State in serialisierbare Form umwandeln */
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

/** Serialisierte Daten zurück in State umwandeln */
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
        return { type: action.type as 'select', imageId: action.imageId, index: action.index };
      }
      return { type: action.type as 'next', imageId: action.imageId };
    }),
    currentIndex: serialized.currentIndex
  };
}

/** State aus localStorage laden */
function loadStateFromLocalStorage(token: string, images: readonly LogicImage[]): State | null {
  const key = `squint:${token}`;
  const saved = localStorage.getItem(key);
  if (!saved) {
    return null;
  }
  try {
    const serialized = JSON.parse(saved) as SerializableState;
    return deserializeState(serialized, images);
  } catch {
    return null;
  }
}

/** State in localStorage speichern */
function saveStateToLocalStorage(token: string, state: State): void {
  const key = `squint:${token}`;
  const serialized = serializeState(state);
  localStorage.setItem(key, JSON.stringify(serialized));
}

// ============================================================================
// App-State
// ============================================================================

interface AppState {
  token: string;
  meta: SetMeta | null;
  logicState: State | null;
  gridState: GridState | null;
  isGridMode: boolean;
  isLocked: boolean;
  isComplete: boolean;
  finishDialogShown: boolean;
}

const appState: AppState = {
  token: '',
  meta: null,
  logicState: null,
  gridState: null,
  isGridMode: false,
  isLocked: false,
  isComplete: false,
  finishDialogShown: false
};

// ============================================================================
// DOM-Elemente
// ============================================================================

const elements = {
  welcomeOverlay: document.getElementById('welcome-overlay') as HTMLElement,
  lockedOverlay: document.getElementById('locked-overlay') as HTMLElement,
  completeOverlay: document.getElementById('complete-overlay') as HTMLElement,
  blockedToast: document.getElementById('blocked-toast') as HTMLElement,
  closeWelcomeBtn: document.getElementById('close-welcome') as HTMLButtonElement,
  cardContainer: document.getElementById('card-container') as HTMLElement,
  card: document.getElementById('card') as HTMLElement,
  cardImage: document.getElementById('card-image') as HTMLImageElement,
  matchIndicator: document.getElementById('match-indicator') as HTMLElement,
  counter: document.getElementById('counter') as HTMLElement,
  undoBtn: document.getElementById('undo-btn') as HTMLButtonElement,
  dislikeBtn: document.getElementById('dislike-btn') as HTMLButtonElement,
  likeBtn: document.getElementById('like-btn') as HTMLButtonElement,
  footer: document.querySelector('footer') as HTMLElement,
  gridContainer: document.getElementById('grid-container') as HTMLElement,
  gridEl: document.getElementById('grid') as HTMLElement,
  welcomeText: document.getElementById('welcome-text') as HTMLElement
};

// ============================================================================
// Swipe-Logik mit Pointer Events
// ============================================================================

interface SwipeData {
  startX: number;
  startY: number;
  startTime: number;
  isSwiping: boolean;
}

const swipeData: SwipeData = {
  startX: 0,
  startY: 0,
  startTime: 0,
  isSwiping: false
};

const SWIPE_THRESHOLD = 0.4; // 40% der Kartenbreite
const SWIPE_MIN_VELOCITY = 0.5; // px/ms

function handlePointerDown(ev: PointerEvent): void {
  if (appState.isLocked || appState.isComplete || !appState.logicState) {
    return;
  }
  
  swipeData.startX = ev.clientX;
  swipeData.startY = ev.clientY;
  swipeData.startTime = Date.now();
  swipeData.isSwiping = true;
  
  // Prevent default to avoid text selection
  ev.preventDefault();
  
  // Reset card position
  elements.card.style.transform = '';
  elements.card.style.transition = 'none';
  elements.matchIndicator.style.opacity = '0';
}

function handlePointerMove(ev: PointerEvent): void {
  if (!swipeData.isSwiping || !appState.logicState) {
    return;
  }
  
  const dx = ev.clientX - swipeData.startX;
  const dy = ev.clientY - swipeData.startY;
  
  // Only horizontal swipe
  if (Math.abs(dy) > Math.abs(dx)) {
    return;
  }
  
  // Limit rotation to screen width
  const maxOffset = window.innerWidth * 0.5;
  const offset = Math.max(-maxOffset, Math.min(maxOffset, dx));
  
  // Apply transform with rotation based on offset
  const rotation = (offset / window.innerWidth) * 45;
  elements.card.style.transform = `translateX(${offset}px) rotate(${rotation}deg)`;
  elements.card.style.transition = 'none';
  
  // Show match indicator for right swipe on favorites
  if (dx > 0 && appState.logicState) {
    const currentId = getCurrentImageId(appState.logicState);
    if (currentId && appState.logicState.favorites.has(currentId)) {
      const opacity = Math.min(1, dx / (window.innerWidth * 0.3));
      elements.matchIndicator.style.opacity = String(opacity);
    }
  }
  
  ev.preventDefault();
}

function handlePointerUp(ev: PointerEvent): void {
  if (!swipeData.isSwiping || !appState.logicState) {
    swipeData.isSwiping = false;
    return;
  }
  
  const dx = ev.clientX - swipeData.startX;
  const dy = ev.clientY - swipeData.startY;
  const elapsed = Date.now() - swipeData.startTime;
  
  swipeData.isSwiping = false;
  
  // Reset match indicator
  elements.matchIndicator.style.opacity = '0';
  
  // Only horizontal swipe
  if (Math.abs(dy) > Math.abs(dx)) {
    elements.card.style.transform = '';
    elements.card.style.transition = 'transform 0.3s ease';
    return;
  }
  
  const cardWidth = elements.card.offsetWidth || window.innerWidth;
  const distanceRatio = Math.abs(dx) / cardWidth;
  const velocity = Math.abs(dx) / (elapsed || 1);
  
  const currentId = getCurrentImageId(appState.logicState);
  if (!currentId) {
    elements.card.style.transform = '';
    elements.card.style.transition = 'transform 0.3s ease';
    return;
  }
  
  // Check if swipe meets threshold
  const meetsThreshold = distanceRatio > SWIPE_THRESHOLD || velocity > SWIPE_MIN_VELOCITY;
  
  if (meetsThreshold) {
    if (dx > 0) {
      // Right swipe: Auswahl
      handleSelect(currentId);
    } else {
      // Left swipe: weiter
      handleNext(currentId);
    }
  } else {
    // Snap back
    elements.card.style.transform = '';
    elements.card.style.transition = 'transform 0.3s ease';
  }
  
  ev.preventDefault();
}

// ============================================================================
// Aktions-Handler
// ============================================================================

function handleNext(imageId: string): void {
  if (!appState.logicState) return;

  const result = next(appState.logicState, imageId);

  if (result.ok) {
    appState.logicState = result.state;
    saveStateToLocalStorage(appState.token, appState.logicState);
    updateUI();

    // Animate card out to left
    animateCardOut('left');
  } else {
    animateCardSnapBack();
  }
}

function handleSelect(imageId: string): void {
  if (!appState.logicState) return;

  const result = select(appState.logicState, imageId);

  if (result.ok) {
    appState.logicState = result.state;
    saveStateToLocalStorage(appState.token, appState.logicState);

    // Match-Feedback: Auswahl auf einem Favoriten (Vibration + Stern + Rahmen)
    if (result.value) {
      navigator.vibrate?.(40);
      elements.card.classList.add('match-frame');
      elements.matchIndicator.style.opacity = '1';
    }

    updateUI();

    // Animate card out to right
    animateCardOut('right');
  } else {
    showBlockedToast();
    animateCardSnapBack();
  }
}

// ============================================================================
// Undo
// ============================================================================

function handleUndo(): void {
  if (!appState.logicState) return;
  
  const result = undo(appState.logicState);
  
  if (result.ok) {
    appState.logicState = result.state;
    saveStateToLocalStorage(appState.token, appState.logicState);
    updateUI();
  }
}

function animateCardOut(direction: 'left' | 'right'): void {
  const screenWidth = window.innerWidth;
  const offset = direction === 'left' ? -screenWidth : screenWidth;
  
  elements.card.style.transform = `translateX(${offset}px)`;
  elements.card.style.transition = 'transform 0.3s ease';
  elements.card.style.opacity = '0';
  
  // Reset after animation
  setTimeout(() => {
    elements.card.style.transform = '';
    elements.card.style.opacity = '';
    elements.card.style.transition = 'none';
    elements.card.classList.remove('match-frame');
  }, 300);
}

function animateCardSnapBack(): void {
  elements.card.style.transform = '';
  elements.card.style.transition = 'transform 0.3s ease';
  // Match-Frame bleibt bestehen, wenn das Bild gematcht ist
}

function showBlockedToast(): void {
  elements.blockedToast.style.display = 'block';
  elements.blockedToast.style.opacity = '1';
  
  setTimeout(() => {
    elements.blockedToast.style.opacity = '0';
    setTimeout(() => {
      elements.blockedToast.style.display = 'none';
    }, 300);
  }, 2000);
}

// ============================================================================
// UI-Update
// ============================================================================

function updateUI(): void {
  if (!appState.logicState || !appState.meta) {
    return;
  }
  
  // Check completion
  appState.isComplete = isComplete(appState.logicState);
  
  // Update counter
  const selected = appState.logicState.fixated.size;
  const target = appState.logicState.targetN;
  elements.counter.textContent = `${selected} von ${target} ausgewählt`;
  
  // Update undo button
  elements.undoBtn.disabled = appState.logicState.history.length === 0;
  
  // Update current image
  const currentId = getCurrentImageId(appState.logicState);
  if (currentId) {
    const imageMeta = appState.meta.images.find(img => img.filename === currentId);
    if (imageMeta) {
      elements.cardImage.src = `/${appState.token}/images/${imageMeta.filename}`;
      elements.cardImage.alt = imageMeta.originalname;
      
      // Show match indicator if this is a matched favorite
      if (appState.logicState.matched.has(currentId)) {
        elements.matchIndicator.style.opacity = '1';
        elements.card.classList.add('match-frame');
      } else {
        elements.matchIndicator.style.opacity = '0';
        elements.card.classList.remove('match-frame');
      }
    }
  } else {
    elements.cardImage.src = '';
    elements.cardImage.alt = '';
    elements.matchIndicator.style.opacity = '0';
    elements.card.classList.remove('match-frame');
  }
  
  // Show finish dialog if done
  if (appState.isComplete && !appState.isLocked) {
    // Verstecke das complete Overlay
    elements.completeOverlay.style.display = 'none';
    elements.completeOverlay.setAttribute('aria-hidden', 'true');
    
    // Zeige den echten Abschlussdialog
    if (!appState.finishDialogShown) {
      appState.finishDialogShown = true;
      const fixatedImages = Array.from(appState.logicState?.fixated || []);
      const allSelected = fixatedImages;
      
      // Hole die originalnames der ausgewählten Bilder
      const selectedOriginalnames = allSelected
        .map((filename) => {
          const imageMeta = appState.meta?.images.find(img => img.filename === filename);
          return imageMeta?.originalname || filename;
        })
        .filter((name): name is string => name !== undefined);
      
      showFinishDialog({
        filenames: selectedOriginalnames,
        onConfirm: async () => {
          const success = await sendFinishRequest(appState.token, selectedOriginalnames);
          if (success) {
            showLockedView();
            appState.isLocked = true;
            appState.isComplete = false;
            // Buttons deaktivieren
            elements.dislikeBtn.disabled = true;
            elements.likeBtn.disabled = true;
            elements.undoBtn.disabled = true;
          }
          appState.finishDialogShown = false;
        },
        onBack: () => {
          appState.finishDialogShown = false;
        }
      });
    }
  } else {
    elements.completeOverlay.style.display = 'none';
    elements.completeOverlay.setAttribute('aria-hidden', 'true');
  }
  
  // Disable buttons if locked or complete
  const shouldDisable = appState.isLocked || appState.isComplete;
  elements.dislikeBtn.disabled = shouldDisable;
  elements.likeBtn.disabled = shouldDisable;
  elements.undoBtn.disabled = shouldDisable || appState.logicState.history.length === 0;
}

// ============================================================================
// Initialisierung
// ============================================================================

async function extractToken(): Promise<string> {
  const pathname = window.location.pathname;
  const segments = pathname.split('/').filter(Boolean);
  return segments[0] || '';
}

async function fetchMeta(token: string): Promise<SetMeta | null> {
  try {
    const response = await fetch(`/${token}/meta`);
    if (!response.ok) {
      return null;
    }
    return await response.json() as SetMeta;
  } catch {
    return null;
  }
}

function convertToLogicImages(images: ImageMeta[]): LogicImage[] {
  return images.map(img => ({
    id: img.filename,
    isFavorite: img.favorite
  }));
}

// ============================================================================
// Grid-Ansicht (Desktop): Klick blendet aus, was uebrig bleibt, ist die Auswahl
// ============================================================================

const GRID_KEY = 'squint:grid';

function loadGridState(token: string, images: readonly string[], targetN: number): GridState {
  const state = createGridState(images, targetN);
  try {
    const saved = localStorage.getItem(`${GRID_KEY}:${token}`);
    if (saved) {
      const faded: unknown = JSON.parse(saved);
      if (Array.isArray(faded)) {
        return { ...state, faded: new Set(faded.filter((f): f is string => typeof f === 'string')) };
      }
    }
  } catch {
    // kaputter Speicherstand: neuer State
  }
  return state;
}

function saveGridState(token: string, state: GridState): void {
  localStorage.setItem(`${GRID_KEY}:${token}`, JSON.stringify([...state.faded]));
}

function renderGrid(): void {
  if (!appState.gridState || !appState.meta) {
    return;
  }

  const grid = appState.gridState;
  elements.gridEl.innerHTML = '';

  for (const image of appState.meta.images) {
    const id = image.filename;

    const item = document.createElement('div');
    item.className = 'grid-item' + (grid.faded.has(id) ? ' faded' : '');
    item.title = image.originalname;

    const button = document.createElement('button');
    button.type = 'button';
    button.style.display = 'contents';
    button.setAttribute('aria-label', image.originalname + (grid.faded.has(id) ? ' (ausgeblendet)' : ''));

    const img = document.createElement('img');
    img.src = `/${appState.token}/thumbs/${encodeURIComponent(image.filename)}`;
    img.alt = image.originalname;
    img.loading = 'lazy';

    const mark = document.createElement('span');
    mark.className = 'grid-fade-mark';
    mark.setAttribute('aria-hidden', 'true');

    button.appendChild(img);
    button.appendChild(mark);
    item.appendChild(button);
    elements.gridEl.appendChild(item);

    button.addEventListener('click', () => {
      if (appState.isComplete) {
        return;
      }
      appState.gridState = toggleFade(appState.gridState!, id);
      saveGridState(appState.token, appState.gridState);
      renderGrid();
      updateGridCounter();

      if (isGridComplete(appState.gridState)) {
        completeGrid();
      }
    });
  }
}

function updateGridCounter(): void {
  if (!appState.gridState) {
    return;
  }
  const remaining = remainingImages(appState.gridState).length;
  elements.counter.textContent = `${remaining} übrig, Ziel ${appState.gridState.targetN}`;
}

function completeGrid(): void {
  if (!appState.gridState || !appState.meta) {
    return;
  }
  appState.isComplete = true;

  const remaining = remainingImages(appState.gridState);
  const selectedOriginalnames = remaining
    .map((filename) => appState.meta?.images.find(img => img.filename === filename))
    .map(meta => meta?.originalname || '')
    .filter((name): name is string => name !== '');

  if (!appState.finishDialogShown) {
    appState.finishDialogShown = true;
    showFinishDialog({
      filenames: selectedOriginalnames,
      onConfirm: async () => {
        const success = await sendFinishRequest(appState.token, selectedOriginalnames);
        if (success) {
          showLockedView();
          appState.isLocked = true;
          appState.isComplete = false;
        }
        appState.finishDialogShown = false;
      },
      onBack: () => {
        // Zurueck: Auswahl laeuft weiter (z. B. ausgeblendete Bilder wieder einblenden)
        appState.isComplete = false;
        appState.finishDialogShown = false;
      }
    });
  }
}

async function init(): Promise<void> {
  // State zurücksetzen
  appState.token = '';
  appState.meta = null;
  appState.logicState = null;
  appState.isLocked = false;
  appState.isComplete = false;
  appState.finishDialogShown = false;

  // Token extrahieren
  appState.token = await extractToken();
  
  if (!appState.token) {
    // Kein Token - zeige leere Seite oder Fehler
    document.body.innerHTML = '<p>Ungültiger Link. Bitte öffne den Link aus deiner E-Mail.</p>';
    return;
  }
  
  // Meta-Daten laden
  const meta = await fetchMeta(appState.token);
  
  if (!meta) {
    document.body.innerHTML = '<p>Set nicht gefunden. Bitte prüfe den Link.</p>';
    return;
  }
  
  appState.meta = meta;
  appState.isLocked = meta.locked;
  
  // Wenn gelockt, nur Hinweis anzeigen
  if (appState.isLocked) {
    elements.lockedOverlay.style.display = 'flex';
    elements.lockedOverlay.setAttribute('aria-hidden', 'false');
    elements.cardContainer.style.display = 'none';
    elements.footer.style.display = 'none';
    elements.gridContainer.classList.add('hidden');
    return;
  }

  // Modus: Desktop mit Maus bekommt das Grid, alles andere die Swipe-Karte
  appState.isGridMode = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (appState.isGridMode) {
    elements.cardContainer.style.display = 'none';
    elements.footer.style.display = 'none';
    elements.undoBtn.style.display = 'none';
    elements.gridContainer.classList.remove('hidden');
    elements.welcomeText.textContent = 'Klicke ein Bild an, um es auszublenden — die übrig bleibenden sind deine Auswahl.';

    const ids = meta.images.map(img => img.filename);
    const gridWasSaved = localStorage.getItem(`${GRID_KEY}:${appState.token}`) !== null;
    appState.gridState = loadGridState(appState.token, ids, meta.n);
    renderGrid();
    updateGridCounter();

    if (!gridWasSaved) {
      elements.welcomeOverlay.style.display = 'flex';
      elements.welcomeOverlay.setAttribute('aria-hidden', 'false');
    }

    registerEventListeners();

    if (isGridComplete(appState.gridState)) {
      completeGrid();
    }
    return;
  }
  
  // Logic-State erstellen
  const logicImages = convertToLogicImages(meta.images);
  
  // Versuche, State aus localStorage zu laden
  const savedState = loadStateFromLocalStorage(appState.token, logicImages);
  
  if (savedState) {
    appState.logicState = savedState;
  } else {
    // Neuer State
    appState.logicState = createState(logicImages, meta.n);
  }
  
  // UI initialisieren
  updateUI();
  
  // Willkommens-Overlay zeigen (nur beim ersten Besuch)
  if (!savedState) {
    elements.welcomeOverlay.style.display = 'flex';
    elements.welcomeOverlay.setAttribute('aria-hidden', 'false');
  }
  
  // Event-Listener registrieren
  registerEventListeners();
}

function registerEventListeners(): void {
  // Pointer Events für Swipe
  elements.card.addEventListener('pointerdown', handlePointerDown);
  elements.card.addEventListener('pointermove', handlePointerMove);
  elements.card.addEventListener('pointerup', handlePointerUp);
  elements.card.addEventListener('pointercancel', () => {
    swipeData.isSwiping = false;
    elements.card.style.transform = '';
    elements.card.style.transition = 'transform 0.3s ease';
    elements.matchIndicator.style.opacity = '0';
  });
  
  // Touch Events als Fallback
  elements.card.addEventListener('touchstart', (ev) => {
    handlePointerDown(ev as unknown as PointerEvent);
  });
  elements.card.addEventListener('touchmove', (ev) => {
    handlePointerMove(ev as unknown as PointerEvent);
  });
  elements.card.addEventListener('touchend', (ev) => {
    handlePointerUp(ev as unknown as PointerEvent);
  });
  
  // Buttons
  elements.closeWelcomeBtn.addEventListener('click', () => {
    elements.welcomeOverlay.style.display = 'none';
    elements.welcomeOverlay.setAttribute('aria-hidden', 'true');
  });
  
  elements.dislikeBtn.addEventListener('click', () => {
    const currentId = getCurrentImageId(appState.logicState!);
    if (currentId) {
      handleNext(currentId);
    }
  });

  elements.likeBtn.addEventListener('click', () => {
    const currentId = getCurrentImageId(appState.logicState!);
    if (currentId) {
      handleSelect(currentId);
    }
  });
  
  elements.undoBtn.addEventListener('click', handleUndo);
  
  // Keyboard (Desktop)
  document.addEventListener('keydown', (ev) => {
    if (appState.isLocked || appState.isComplete || !appState.logicState) {
      return;
    }
    
    const currentId = getCurrentImageId(appState.logicState);
    if (!currentId) return;
    
    switch (ev.key) {
      case 'ArrowLeft':
        handleNext(currentId);
        break;
      case 'ArrowRight':
        handleSelect(currentId);
        break;
      case 'Backspace':
      case 'Delete':
        handleUndo();
        break;
    }
  });
  
  // Prevent context menu on long press
  elements.card.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
  });
  
  // Prevent image drag
  elements.cardImage.addEventListener('dragstart', (ev) => {
    ev.preventDefault();
  });
  
  // Window resize - reset card position
  window.addEventListener('resize', () => {
    if (!swipeData.isSwiping) {
      elements.card.style.transform = '';
      elements.card.style.transition = 'none';
    }
  });
}

// ============================================================================
// Export für Tests
// ============================================================================

export {
  serializeState,
  deserializeState,
  loadStateFromLocalStorage,
  saveStateToLocalStorage,
  type SerializableState
};

// ============================================================================
// Start
// ============================================================================

init().catch(console.error);
