# Squint – Deploy (T9)

Ziel: Infomaniak Node.js-Webhosting, `squint.silberblick.net`, Branch `dev` (Staging = Produktion im MVP).

## Einrichtung (einmalig, erledigt)

- [x] Node.js-Site im Manager angelegt, Git-Import von `github.com/dkause/Squint`
- [x] Branch im Site-Verzeichnis: `dev`
- [x] sharp lauffaehig (Spike, libvips 8.18.7)
- [x] Empfangsort: 3000, App liest `process.env.PORT`

## Update / Deploy

1. Lokal: `npm run deploy` (pusht `dev` nach GitHub)
2. SSH auf den Host, dann:

   ```bash
   cd ~/sites/squint.silberblick.net
   git pull
   npm install
   npm run build:client
   ```

3. Im Infomaniak-Manager: Site **neu starten**.
4. Alternativ (empfohlen ab jetzt): Build-Kommando im Manager auf
   `git pull && npm install && npm run build:client` setzen — dann faehrt ein Klick auf
   "Neu erstellen" den kompletten Deploy.

## Umgebungsvariablen (Manager → erweiterte Einstellungen)

| Variable | Bedeutung | Beispiel / Hinweis |
|---|---|---|
| `SQUINT_UPLOAD_PASSWORD` | Passwort der Upload-Seite | selbst setzen, min. 12 Zeichen |
| `SQUINT_SMTP_HOST` | Mailserver | `mail.infomaniak.com` |
| `SQUINT_SMTP_PORT` | SMTP-Port | `465` (SSL) oder `587` (STARTTLS) |
| `SQUINT_SMTP_USER` | SMTP-Login | komplette Mail-Adresse |
| `SQUINT_SMTP_PASS` | SMTP-Passwort | generiert im Infomaniak-Mail-Assistent |
| `SQUINT_MAIL_FROM` | Absender der Auswahl-Mail | z. B. `squint@silberblick.net` |
| `SQUINT_MAIL_TO` | Empfaenger (Fotograf) | z. B. `daniel@silberblick.net` |
| `SQUINT_DATA_DIR` | Datenverzeichnis | optional; Default `./data` relativ zum Site-Verzeichnis |
| `SQUINT_RETENTION_MS` | Aufbewahrungsfrist der Sets | z. B. `2592000000` (30 Tage); fehlt = Loeschen deaktiviert |
| `SQUINT_CLEANUP_INTERVAL_MS` | Aufraeum-Intervall | optional; Default 1 Stunde |
| `PORT` | vom Manager vergeben | nicht selbst setzen |

Ohne Mail-Konfiguration laeuft die App, aber der Abschluss-Dialog meldet einen Fehler (kein Lock, keine Mail) — bewusst so.

## Erster Produktiv-Check

1. `https://squint.silberblick.net/upload` oeffnen → Passwort eingeben, 3-5 Bilder, Favorit, N=2 → Link erhalten.
2. Link am Handy oeffnen: Willkommen, swipe bis 2 uebrig, Match-Popup beim Favoriten, Abschluss bestaetigen.
3. Mail im Postfach pruefen: genau N Dateinamen.
4. Link erneut oeffnen: "Auswahl wurde gesendet".
5. Handy-Check: Vibration beim Match (Android), PWA-Install-Prompt (Add to Home Screen).

## Offen (nach MVP)

- Retention-Wert produktiv setzen und Cleanup-Log beobachten
- Manueller Check des Swipe-Gefuehls auf mehreren Geraeten
- `main` als Produktiv-Branch (derzeit laeuft alles ueber `dev`)
