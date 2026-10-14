/**
 * Server-Abschluss (T6)
 * Mail mit Dateinamen, Lock des Sets
 */

import nodemailer from 'nodemailer';
import { readSet, lockSet, recordSelection, SetNotFoundError } from './storage.js';

// ============================================================================
// Typen
// ============================================================================

export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  to: string;
}

export interface FinishResult {
  ok: boolean;
  error?: string;
}

// ============================================================================
// Konfiguration
// ============================================================================

/** Lädt Mail-Konfiguration aus Umgebungsvariablen */
export function loadMailConfig(): MailConfig {
  const host = process.env.SQUINT_SMTP_HOST || '';
  const port = process.env.SQUINT_SMTP_PORT ? parseInt(process.env.SQUINT_SMTP_PORT, 10) : 465;
  const user = process.env.SQUINT_SMTP_USER || '';
  const pass = process.env.SQUINT_SMTP_PASS || '';
  const from = process.env.SQUINT_MAIL_FROM || '';
  const to = process.env.SQUINT_MAIL_TO || '';

  const missing: string[] = [];
  if (!host) missing.push('SQUINT_SMTP_HOST');
  if (!user) missing.push('SQUINT_SMTP_USER');
  if (!pass) missing.push('SQUINT_SMTP_PASS');
  if (!from) missing.push('SQUINT_MAIL_FROM');
  if (!to) missing.push('SQUINT_MAIL_TO');

  if (missing.length > 0) {
    throw new Error(`Fehlende Umgebungsvariablen für Mail-Konfiguration: ${missing.join(', ')}`);
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    from,
    to,
  };
}

// ============================================================================
// Hauptfunktion
// ============================================================================

/**
 * Beendet die Auswahl: sendet Mail mit Dateinamen und sperrt das Set.
 * 
 * Ablauf:
 * 1. Set lesen (404 wenn unbekannt)
 * 2. Prüfe locked (bereits gesendet → Fehler)
 * 3. Prüfe filenames: genau N Eintraege, alle muessen im Set existieren (nach originalname)
 * 4. Mail senden
 * 5. Auswahl speichern
 * 6. Set locken
 * 
 * Reihenfolge: erst Mail senden, dann locken (lieber ungesperrt ohne Mail als gesperrt ohne Mail)
 */
export async function finishSelection(
  token: string,
  filenames: string[],
  config: MailConfig
): Promise<FinishResult> {
  try {
    // 1. Set lesen
    const setData = await readSet(token);

    // 2. Prüfe locked
    if (setData.locked) {
      return {
        ok: false,
        error: 'bereits gesendet',
      };
    }

    // 3. Prüfe filenames
    const n = setData.n;
    if (filenames.length !== n) {
      return {
        ok: false,
        error: `Erwartet ${n} Dateinamen, erhalten ${filenames.length}`,
      };
    }

    // Prüfe, dass alle filenames im Set existieren (nach originalname)
    const originalnames = new Set(setData.images.map((img) => img.originalname));
    for (const filename of filenames) {
      if (!originalnames.has(filename)) {
        return {
          ok: false,
          error: `Unbekannter Dateiname: ${filename}`,
        };
      }
    }

    // 4. Mail senden
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });

    const subject = `Squint Auswahl ${token}`;
    const text = [
      `Es wurden ${n} Bilder ausgewählt:`,
      '',
      ...filenames.map((name) => `  - ${name}`),
      '',
      `Gesamt: ${n} Bilder`,
      `Empfänger: ${config.to}`,
    ].join('\n');

    await transporter.sendMail({
      from: config.from,
      to: config.to,
      subject,
      text,
    });

    // 5. Auswahl speichern
    await recordSelection(token, filenames);

    // 6. Set locken
    await lockSet(token);

    return { ok: true };
  } catch (error) {
    if (error instanceof SetNotFoundError) {
      return {
        ok: false,
        error: 'Set nicht gefunden',
      };
    }
    // Für andere Fehler: generische Fehlermeldung
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return {
      ok: false,
      error: message,
    };
  }
}
