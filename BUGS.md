# Bugs

Ein Bug = eine Sektion mit ID und festen Feldern. Einordnung: Verletzung von
SPEC, Design-System oder erwartetem Verhalten = Bug; neue Wünsche gehören
in `BACKLOG.md`.

- Zustand: `offen` | `in-arbeit` | `gefixt` (mit Commit) | `verworfen` (mit Grund)
- Gefixte Bugs bleiben als Eintrag stehen (Commit-Hash dazu) — sie sind
  Lernmaterial fürs Agenten-Experiment.
- Erwartet/Beobachtet immer trennen — das macht jeden Bug testbar.

## B-001 — Passwort erscheint in Klartext in der URL (gefixt)
- **Zustand:** gefixt (eb6f82f)
- **Wo:** public/upload.html, Inline-Script
- **Reproduktion:** /upload öffnen → Passwort eintragen → Absenden mit nicht geladenem JS
- **Erwartet:** POST mit FormData, Passwort nie in einer URL
- **Beobachtet:** nativer GET-Submit, Passwort in der Query-URL
- **Analyse:** TS-Casts im Inline-JavaPI (`as HTMLInputElement`) → SyntaxError
  beim Parsen → Submit-Listener hängt nie → Browser-Default greift.

## B-002 — Kein Kunden-Link nach erfolgreichem Upload (gefixt)
- **Zustand:** gefixt (0ea4a69)
- **Wo:** public/upload.html, Response-Handling
- **Reproduktion:** Formular vollständig ausfüllen → hochladen
- **Erwartet:** Link-Button wird aktiv und zeigt die URL
- **Beobachtet:** „Unbekannter Fehler" trotz HTTP 200
- **Analyse:** Client prüfte `result.ok`, Server liefert `{ token }` — Vertrags-Mismatch zwischen T2-Worker und Server.

## B-003 — Desktop-Grid: OK-Button des Willkommens-Overlays wirkungslos (gefixt)
- **Zustand:** gefixt (71110cc)
- **Wo:** public/swipe.ts, init() Grid-Zweig
- **Reproduktion:** Desktop öffnen → OK im Overlay klicken
- **Erwartet:** Overlay schließt
- **Beobachtet:** Overlay bleibt, Klick ohne Wirkung
- **Analyse:** Früh-Return im Grid-Modus übersprang registerEventListeners();
  daneben zeigte auch das Willkommens-Overlay selbst nie (gleiche Ursache).

## B-004 — Default-Bullets in der Dateiliste des Abschlussdialogs (gefixt)
- **Zustand:** gefixt (folgt diesem Commit)
- **Wo:** public/finish.ts + swipe.css, .finish-list
- **Reproduktion:** Auswahl abschließen → Abschlussdialog öffnen
- **Erwartet:** typografisch ruhige Liste gemäß Squint-Design-System
- **Beobachtet:** ungefilterte Browser-Default-Bullets (`ul` ohne Styles)
- **Analyse:** T6-Worker vergab die Klasse `.finish-list`, aber niemand definierte sie — ein Design-System-Verstoß, kein Feature-Wunsch.
