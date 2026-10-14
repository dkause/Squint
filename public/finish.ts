/**
 * Client-Abschlussdialog (T6)
 * Vanilla TypeScript, native DOM
 */

// ============================================================================
// Typen
// ============================================================================

interface FinishDialogOptions {
  filenames: string[];
  onConfirm: () => void;
  onBack: () => void;
}

// ============================================================================
// Dialog "Diese N Bilder senden?"
// ============================================================================

/** Zeigt den Abschluss-Dialog mit Bestätigen/Zurück */
export function showFinishDialog(options: FinishDialogOptions): void {
  const { filenames, onConfirm, onBack } = options;

  // Dialog-Element erstellen
  const dialog = document.createElement('div');
  dialog.className = 'overlay';
  dialog.id = 'finish-dialog';
  dialog.setAttribute('aria-hidden', 'false');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'finish-title');

  // Inhaltsbereich
  const content = document.createElement('div');
  content.className = 'overlay-content finish-content';

  // Titel
  const title = document.createElement('h2');
  title.id = 'finish-title';
  title.textContent = `Diese ${filenames.length} Bilder senden?`;

  // Dateiliste
  const list = document.createElement('ul');
  list.className = 'finish-list';
  for (const filename of filenames) {
    const item = document.createElement('li');
    item.textContent = filename;
    list.appendChild(item);
  }

  // Button-Bereich
  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'finish-buttons';

  // Zurück-Button
  const backBtn = document.createElement('button');
  backBtn.className = 'btn finish-btn-back';
  backBtn.textContent = 'Zurück';
  backBtn.addEventListener('click', () => {
    dialog.remove();
    onBack();
  });

  // Bestätigen-Button
  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'btn finish-btn-confirm';
  confirmBtn.textContent = 'Senden';
  confirmBtn.addEventListener('click', () => {
    dialog.remove();
    onConfirm();
  });

  // Zusammenbauen
  buttonGroup.appendChild(backBtn);
  buttonGroup.appendChild(confirmBtn);
  content.appendChild(title);
  content.appendChild(list);
  content.appendChild(buttonGroup);
  dialog.appendChild(content);

  // Anzeigen
  document.body.appendChild(dialog);

  // Fokus auf Bestätigen-Button
  confirmBtn.focus();

  // Escape-Taste zum Abbrechen
  const handleKeyDown = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape') {
      dialog.remove();
      onBack();
    }
  };
  document.addEventListener('keydown', handleKeyDown);

  // Cleanup beim Entfernen
  const cleanup = (): void => {
    document.removeEventListener('keydown', handleKeyDown);
  };
  dialog.addEventListener('remove', cleanup);
}

// ============================================================================
// Gesperrt-Ansicht
// ============================================================================

/** Ersetzt den Inhalt durch "Auswahl wurde gesendet" */
export function showLockedView(): void {
  // Alle bestehenden Overlays entfernen
  const overlays = document.querySelectorAll('.overlay');
  overlays.forEach((overlay) => overlay.remove());

  // Karte und Footer ausblenden
  const cardContainer = document.getElementById('card-container');
  const footer = document.querySelector('footer');
  if (cardContainer) cardContainer.style.display = 'none';
  if (footer) footer.style.display = 'none';

  // Header ausblenden oder anpassen
  const header = document.querySelector('header');
  if (header) header.style.display = 'none';

  // Locked-Overlay anzeigen
  const lockedOverlay = document.getElementById('locked-overlay');
  if (lockedOverlay) {
    lockedOverlay.style.display = 'flex';
    lockedOverlay.setAttribute('aria-hidden', 'false');
    return;
  }

  // Falls kein locked-overlay existiert, erstellen
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'locked-overlay';
  overlay.setAttribute('aria-hidden', 'false');

  const overlayContent = document.createElement('div');
  overlayContent.className = 'overlay-content';

  const message = document.createElement('p');
  message.textContent = 'Auswahl wurde gesendet.';

  overlayContent.appendChild(message);
  overlay.appendChild(overlayContent);
  document.body.appendChild(overlay);
}

// ============================================================================
// API-Aufruf für Finish
// ============================================================================

/** Sendet die Auswahl an den Server und zeigt bei Erfolg die gesperrte Ansicht */
export async function sendFinishRequest(token: string, filenames: string[]): Promise<boolean> {
  try {
    const response = await fetch(`/${token}/finish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filenames }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || 'Fehler beim Senden';
      showErrorMessage(errorMessage);
      return false;
    }

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Netzwerkfehler';
    showErrorMessage(message);
    return false;
  }
}

/** Zeigt eine Fehlermeldung an */
export function showErrorMessage(message: string): void {
  // Bestehende Fehlermeldung entfernen
  const existingError = document.getElementById('finish-error');
  if (existingError) existingError.remove();

  // Neue Fehlermeldung erstellen
  const errorToast = document.createElement('div');
  errorToast.id = 'finish-error';
  errorToast.className = 'toast error-toast';
  errorToast.setAttribute('aria-live', 'assertive');
  errorToast.textContent = message;

  document.body.appendChild(errorToast);

  // Nach 3 Sekunden entfernen
  setTimeout(() => {
    errorToast.style.opacity = '0';
    setTimeout(() => {
      errorToast.remove();
    }, 300);
  }, 3000);
}
