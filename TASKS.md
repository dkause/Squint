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

## T10 – Favoriten-Import (zurückgestellt, nach MVP)
- Beim Upload Favoriten automatisch aus dem Fotografen-Workflow übernehmen:
  Capture-One-Tags in den JPG-Metadaten (XMP: Rating/Farb-Tag/Keyword) oder
  Dateinamen-Konvention. Checkbox-Liste im Upload-Formular erscheint vorangehakt
  (überschreibbar).
- VOR Umsetzung klären (mit Daniel): exakte C1-Konvention (Sterne? Farb-Tag?
  Keyword? Dateinamen-Muster?) und Vorrang Metadatum vs. Dateiname.
- Berührt: `src/upload.ts`, `public/upload.html`
- Nicht Teil des MVP; SPEC-Nicht-Ziel „kein Capture-One-Plugin" bleibt
  unberührt (Upload-Import ist kein Plugin).

## Reihenfolge
T0 → (T1 ∥ T3) → (T2 ∥ T4) → (T5 ∥ T6 ∥ T7) → T8 → T9
Manueller Check: nach T5 und T6 das Swipe-Gefühl auf einem echten Handy.
