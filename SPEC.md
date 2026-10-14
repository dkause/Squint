# Squint – Spec (MVP-Entwurf)

## Zweck
Squint hilft Kunden, aus vielen ähnlich aussehenden Fotos (Portraits) schnell und mobil die besten auszuwählen. Der Fotograf legt das Limit N fest, der Kunde reduziert per Swipe, bis genau N Bilder übrig sind. Stimmt eine Wahl mit der des Fotografen überein, gibt es ein Match.

## Prinzipien
1. **Restriktion:** Squint tut wenig, und das gut. Was nicht zu Limit-Auswahl und Mobilnutzung beiträgt, kommt nicht rein.
2. **Mobile-first:** Daumenbedienung. Desktop muss nutzbar sein (Pfeiltasten, Buttons), bekommt aber kein eigenes Layout.
3. **Diskret, kein SaaS:** eine Instanz, ein Fotograf, keine Konten, keine Registrierung.
4. **Dateinamen sind die Schnittstelle** zum bestehenden Ablauf des Fotografen.

## Nicht-Ziele (MVP)
Kein Login oder Konto für Kunden, keine Galerie oder Übersicht, kein Chat, keine Sterne-Bewertung, kein Payment, kein Capture-One-Plugin, kein Freitext des Kunden, keine Mehrmandantenfähigkeit, kein Teilen oder Download. Builder-Agenten bauen davon nichts ein, auch nicht "hilfreich".

## Ablauf Fotograf (geändert 2026-10-14: Auto-Upload, Server-Thumbnails, genau-N-Favoriten)
1. Passwort und N eintragen (1 ≤ N < Anzahl Bilder).
2. Bilder wählen (mehrere) — der Upload startet automatisch mit Fortschrittsanzeige (Prozent, XHR-Progress).
3. Server verkleinert jedes Bild mit sharp in zwei Fassungen und behält den Originaldateinamen: Web (lange Kante 1600 px, JPEG) unter `images/`, Thumbnail (lange Kante 400 px) unter `thumbs/`.
4. Das Auswahl-Grid (3 Spalten) rendert aus den Server-Thumbnails — sein Erscheinen bestätigt den erfolgreichen Upload. Favoriten: genau N antippen (Pflicht), "Auswahl speichern" sendet sie passwortgeschützt an `POST /:token/favorites`.
5. Ergebnis ist ein geheimer Link, der aktiv wird, sobald die Auswahl gespeichert ist. Hinweis "Link nur an den Kunden schicken." direkt unter der Überschrift. Den verschickt der Fotograf selbst. Token in sessionStorage (Reload-sicher).

## Ablauf Kunde (Zustandsmaschine, Auswahl-Modell)
Zustand: **Pool** (rotierende Reihenfolge der noch nicht gewählten Bilder), **ausgewählt** (zählt auf N), **Verlauf** (für Zurück).

Geändert 2026-10-14: Das Eliminierungs-Modell (links entfernen, rechts behalten)
wurde durch das Auswahl-Modell ersetzt — der Kunde wählt aktiv N Bilder aus.

- Start: Pool = alle Bilder in Upload-Reihenfolge. Ein Willkommens-Screen erklärt die Geste in einem Satz.
- **Links (weiter):** Bild bleibt im Pool, das nächste wird angezeigt.
- **Rechts (Auswahl):** Das Bild wird ausgewählt — es zählt auf N und verschwindet aus der Rotation.
- **Rotation:** Nach dem letzten Bild beginnt die nächste Runde mit dem verbliebenen Pool. Ausgewählte Bilder werden nicht mehr gezeigt.
- **Ende:** N Bilder ausgewählt → Abschlussdialog.
- **Anzeige:** "X von N ausgewählt".
- **Zurück:** macht die letzte Aktion rückgängig (Weiter oder Auswahl; auch ein Match wird zurückgenommen).

### Match
- Auswahl (Rechts) eines Favoriten, der noch nicht gematcht wurde: Vibration (wo verfügbar), gelber Rahmen und Stern oben rechts. Kein Entscheidungs-Popup — die Auswahl ist mit dem Swipe bereits erfolgt (entfiel mit dem Auswahl-Modell).
- Das Match-Feedback erscheint **einmal pro Bild**.
- Links (weiter) auf einen Favoriten: kein Feedback.
- Ohne Vibration (z. B. iOS-Safari) trägt das visuelle Feedback allein.

### Abschluss
- Dialog "Diese N Bilder senden?" mit Bestätigen oder Zurück.
- Senden: Mail an den Fotografen (Adresse aus der Konfiguration) mit den **Dateinamen** der N Bilder.
- Das Set wird **gelockt**: Der Link zeigt nur noch "Auswahl wurde gesendet". Wiederöffnen kann nur der Fotograf, manuell.

## Daten
- Flatfile pro Set: `data/<token>/set.json`, `data/<token>/images/` (1600 px) und `data/<token>/thumbs/` (400 px, Auswahl-Grid).
- `set.json`: Erstelldatum, N, gelockt ja/nein, Bildliste (Datei, Originalname, Favorit), Auswahl nach Abschluss.
- Der Zwischenstand der Kundensitzung liegt im Browser (localStorage), damit ein Reload oder App-Wechsel nichts verliert. Der Server erfährt nur das Endergebnis.
- Die Favoriten stehen in den Daten, die der Browser lädt, und sind damit technisch einsehbar. Das ist akzeptiert.
- Bilder und Auswahl werden nach einer Frist gelöscht (Wert offen).

## Zugriff
- Token mit mindestens 128 Bit Zufall in der URL. Bilder sind nur mit Token erreichbar.
- Upload-Seite hinter einem Passwort aus der Umgebungskonfiguration.

## Technik
- Node.js + TypeScript auf Infomaniak (Node-Webhosting, kein VPS), keine Datenbank.
- Bildverarbeitung mit `sharp`. Die Lauffähigkeit auf Infomaniak ist früh zu prüfen.
- Frontend: Vanilla TypeScript, Pointer Events, kein Framework, kein Tailwind (Vorschlag).
- PWA-fähig (Manifest), Offline nicht nötig.
- Mail über SMTP (Infomaniak-Postfach).
- Die Zustandsmaschine besteht aus reinen Funktionen ohne DOM und ist per Unit-Test prüfbar.
- Design: Squint Design System (Figma), Basis Material Design 3, IBM Plex, Schwarz/Weiß/Grau, Favoriten in Gelb.
- Barrierefreiheit: ✓/✗-Buttons als Alternative zur Geste, Pfeiltasten am Desktop, starker Kontrast, Zähler als aria-live.

## Offene Punkte
1. ~~"Nichts passt"~~ — entschieden (2026-10-14): N ist Pflicht, kein Abbruch für den Kunden.
2. ~~Wortlaut des Zählers~~ — erledigt (2026-10-14): Kunde "X von N ausgewählt", Fotograf "X von N" im Speichern-Button.
3. ~~Tiefe von Zurück~~ — entschieden (2026-10-14): einstufig (letzte Aktion).
4. **Aufbewahrungsfrist:** Cleanup ist gebaut; Konfiguration soll in Tagen/Stunden lesbar sein (statt Millisekunden), Wert wird beim Deploy gesetzt. Umstellung offen (T12).
5. ~~Match-Vermerk in der Mail~~ — entschieden (2026-10-14): nur die N Dateinamen.
6. **Pinch-Zoom im MVP** (Augen prüfen bei Portraits)? Nicht umgesetzt.
7. ~~Bildreihenfolge~~ — entschieden (2026-10-14): Upload-Reihenfolge.
8. ~~Funktioniert `sharp` auf dem Infomaniak-Webhosting?~~ Beantwortet (2026-10-14): ja — Spike `scripts/sharp-spike.ts` lief auf dem Node.js-Hosting, libvips 8.18.7.
9. ~~Upload-Flaschenhals~~ — entschieden (2026-10-14): Client verkleinert vorab (ca. Faktor 10 schneller), Server normalisiert trotzdem — AUFLAGE: darf auf dem Handy keine spürbaren Performance-Probleme machen (sonst Server-only). Umsetzung offen (T11).
10. **E2E deckt das Upload-Formular nicht ab:** Playwright testet die API, nicht den Formular-Flow (Auto-Upload, Progress, Grid, Favoriten-Speichern). Nachziehen?
