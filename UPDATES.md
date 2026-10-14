# Updates

Wünsche und Verbesserungsideen ohne beschlossene Umsetzung. Wird ein
Update aktuell, steigt es mit seiner Nummer als Ticket nach `TASKS.md`
auf (Nummer bleibt, Eintrag wandert). Bugs gehören nicht hierher
(`BUGS.md`), beschlossene Arbeit nicht (`TASKS.md`).

## T10 – Favoriten-Import aus Capture-One-Metadaten
- Beim Upload Favoriten automatisch aus dem Fotografen-Workflow übernehmen:
  Capture-One-Tags in den JPG-Metadaten (XMP: Rating/Farb-Tag/Keyword) oder
  Dateinamen-Konvention.
- Offen vor Umsetzung: exakte C1-Konvention (Sterne? Farb-Tag? Keyword?
  Dateinamen-Muster?) und Vorrang Metadatum vs. Dateiname.
- Berührt: `src/upload.ts`, `public/upload.html`
- SPEC-Nicht-Ziel „kein Capture-One-Plugin" bleibt unberührt (Upload-Import
  ist kein Plugin).

## T14 – Pinch-Zoom für die Kartenansicht
- Augen bei Portraits prüfen — SPEC „Offene Punkte" Nr. 6.
- Berührt: `public/swipe.ts`, `public/swipe.css`
