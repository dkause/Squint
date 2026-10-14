# Squint – Tasks (MVP-Entwurf)

Jedes Ticket: ein Worktree, ein Branch, Merge nach `dev` erst bei grünen Gates (typecheck, lint, Tests).
"Berührt" listet die Dateien, damit parallele Tickets keine Konflikte erzeugen.

## T0 – Projektgerüst
- Node/TS-Projekt, Verzeichnisstruktur, Skripte `typecheck`, `lint`, `test`, `dev`, `deploy`.
- `AGENTS.md` mit Prinzipien und Nicht-Ziele aus der Spec.
- Berührt: Wurzel, `package.json`, `tsconfig.json`, `AGENTS.md`
- Fertig, wenn: alle Skripte laufen auf leerem Projekt grün.
- Blockiert alle anderen.

## T1 – Datenmodell und Storage
- Set anlegen und lesen, Token erzeugen, Lock-Flag setzen, Löschfunktion nach Frist.
- Berührt: `src/storage.ts`, `src/storage.test.ts`
- Fertig, wenn: Token ≥ 128 Bit, Set lässt sich anlegen/lesen/locken, unbekannter Token liefert 404.
- Parallel zu T3.

## T3 – Kundenlogik (reine Zustandsmaschine, ohne UI)
- Funktionen für Links, Rechts, Rotation, Fixieren, Zurück, Ende, Match-Erkennung (einmal pro Bild).
- Berührt: `src/logic.ts`, `src/logic.test.ts`
- Fertig, wenn Tests belegen:
  - Links bei |Pool| = N wird blockiert.
  - Rotation beginnt nach dem letzten Bild neu und überspringt fixierte Bilder.
  - Match löst pro Bild nur einmal aus, Links auf Favorit löst keinen aus.
  - Fixieren bei N=1 beendet sofort.
  - Zurück macht Swipe und Fixieren rückgängig.
- Parallel zu T1. Das wichtigste Ticket, hier gehört die Testtiefe hin.

## T2 – Upload und Bildverarbeitung
- Passwortschutz, Formular (Mehrfach-Upload, Favoriten markieren, N), Verkleinerung mit `sharp`, Link-Ausgabe.
- Berührt: `src/upload.ts`, `public/upload.html`, `public/upload.css`
- Fertig, wenn: Upload von 28 Bildern erzeugt ein Set mit verkleinerten Bildern und Favoriten; N ≥ Bildanzahl wird abgewiesen.
- Nach T1. Enthält den Spike, ob `sharp` auf Infomaniak läuft.

## T4 – Kunden-UI: Swipe
- Karte mit Pointer-Events, ✓/✗-Buttons, Pfeiltasten, Zähler, Zurück-Button, Willkommens-Screen, localStorage-Zwischenstand.
- Berührt: `public/swipe.ts`, `public/swipe.css`, `public/index.html`
- Fertig, wenn: kompletter Durchlauf auf Handy-Viewport ohne Ladehänger, Reload stellt den Stand wieder her.
- Nach T3.

## T5 – Match-Feedback
- Gelber Rahmen, Stern, Vibration (mit Fallback), Popup "übernehmen / weiter sichten".
- Berührt: `public/match.ts`, `public/match.css`
- Fertig, wenn: Feedback erscheint genau einmal pro Favorit, Markierung bleibt in späteren Runden.
- Nach T3 und T4.

## T6 – Abschluss, Mail, Lock
- Bestätigungsdialog, Mail mit Dateinamen, Lock des Sets, Gesperrt-Ansicht.
- Berührt: `src/finish.ts`, `public/finish.ts`
- Fertig, wenn: Mail enthält genau N Dateinamen, zweiter Aufruf zeigt "Auswahl wurde gesendet", keine zweite Mail.
- Nach T1 und T4.

## T7 – Aufräumen nach Frist
- Löschen von Bildern und Auswahl nach Ablauf der Frist.
- Berührt: `src/cleanup.ts`
- Nach T1.

## T8 – E2E-Test
- Playwright mit Handy-Viewport: Upload, Link öffnen, Durchlauf bis zum Abschluss, Match-Fall, Lock.
- Berührt: `e2e/`
- Nach T2 bis T6.

## T9 – Deploy
- `npm run deploy` auf Infomaniak, Konfiguration über Umgebungsvariablen.
- Nach T8.

## Stand 2026-10-14 (Ende Tag 1)
- T0 bis T9 umgesetzt und gemerged (Worker: Devstral, Review/Integration: Dirigent).
- MVP läuft lokal vollständig (Upload → Auswahl → Link → Kunde swippt → Mail/Lock).
- Iterationen nach MVP-Aufbau (alle gemerged):
  - Upload-Formular: Inline-JS-Bugfix (Passwort in URL), ein Vorgang mit
    Element-States, Preview-Grid 3 Spalten, genau-N-Favoriten mit
    Zwei-Button-States, Auto-Upload mit Progress, Server-Thumbnails (400 px)
    als Upload-Bestätigung, sessionStorage-Token.
  - Kunden-UI: Auswahl-Modell statt Eliminierung (links = weiter,
    rechts = Auswahl; Match ohne Popup), Zähler "X von N ausgewählt".
- Staging (squint.silberblick.net) hinkt hinterher: Stand dort ist T0.
  Deploy-Konfiguration: siehe `DEPLOY.md` (git pull + Build-Kommando +
  Env-Variablen: Upload-Passwort, SMTP, Retention).
- Entscheidungen des Tages (SPEC „Offene Punkte"): N ist Pflicht (1),
  Mail nur Dateinamen (5), Client-Verkleinerung vor Upload (9, Auflage:
  keine Handy-Performance-Probleme), Retention in Tagen/Stunden (4).

## T11 – Client-Verkleinerung vor dem Upload (entschieden 2026-10-14)
- Browser verkleinert die Bilder vorab (lange Kante 1600 px, JPEG) und
  sendet nur die verkleinerten Fassungen; Server prüft/normalisiert
  weiter (sharp-Pipeline bleibt, akzeptiert beliebige JPEGs).
- AUFLAGE von Daniel: keine spürbaren Performance-Probleme auf dem Handy —
  auf älteren Geräten messen; falls problematisch: Fallback Server-only.
- Berührt: `public/upload.html` (Resizing im Browser, Progress-Logik),
  ggf. `src/upload.ts` (Akzeptanz vorverkleinerter Bilder, keine
  Hochskalierung).
- Mess-Kriterium: 20 Bilder à 4 MB auf Mittelklasse-Handy ohne Ruckler
  und deutlich schnellerer Gesamt-Upload als Status quo.

## T12 – Retention in Tagen (statt Millisekunden)
- `SQUINT_RETENTION_MS` durch lesbares Format ersetzen, z. B.
  `SQUINT_RETENTION_DAYS=30` (intern × 24 h). DEPLOY.md und AGENTS.md
  mitziehen; Cleanup-Tests anpassen.
- Berührt: `src/cleanup.ts`, `src/cleanup.test.ts`, `src/server.ts`,
  `DEPLOY.md`.

## T13 – E2E für das Upload-Formular
- Playwright-Test des Formular-Flows: Dateiauswahl → Auto-Upload mit
  Progress → Server-Thumb-Grid → Favoriten „X von N" → Link aktiv.
- Berührt: `e2e/squint.spec.ts`
- Hintergrund: SPEC „Offene Punkte" Nr. 10 (Suite testet bisher nur die API).

## T15 – Live-Deploy squint.silberblick.net
- Stand dorthin bringen: git pull, Build-Kommando setzen
  (`git pull && npm install && npm run build:client`), Env-Variablen
  (Upload-Passwort, SMTP, Retention), Neustart.
- Anleitung: `DEPLOY.md`.

## Reihenfolge
T0 → (T1 ∥ T3) → (T2 ∥ T4) → (T5 ∥ T6 ∥ T7) → T8 → T9
Manueller Check: nach T5 und T6 das Swipe-Gefühl auf einem echten Handy.
