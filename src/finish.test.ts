/**
 * Tests für src/finish.ts (T6)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  finishSelection,
  loadMailConfig,
  type MailConfig,
  type FinishResult,
} from './finish.js';
import {
  createSet,
  readSet,
  dataDir,
} from './storage.js';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

// ============================================================================
// Test-Helper
// ============================================================================

// Mock für nodemailer
const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'mock-id' });
const mockTransporter = {
  sendMail: mockSendMail,
};

// Mock für nodemailer.createTransport
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => mockTransporter),
  },
}));

// Test-Konfiguration
const testConfig: MailConfig = {
  host: 'test-host',
  port: 465,
  secure: true,
  auth: {
    user: 'test-user',
    pass: 'test-pass',
  },
  from: 'test-from@example.com',
  to: 'test-to@example.com',
};

// Test-Set erstellen
async function createTestSet(n: number, imageCount: number): Promise<string> {
  const images = Array.from({ length: imageCount }, (_, i) => ({
    filename: `img-${i}.jpg`,
    originalname: `original-${i}.jpg`,
    favorite: i % 2 === 0,
  }));
  return createSet(images, n);
}

// Test-Daten bereinigen
async function cleanupTestData(token: string): Promise<void> {
  try {
    await rm(join(dataDir, token), { recursive: true, force: true });
  } catch {
    // Ignorieren
  }
}

// ============================================================================
// Tests für loadMailConfig
// ============================================================================

describe('loadMailConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('sollte Konfiguration aus Umgebungsvariablen laden', () => {
    process.env.SQUINT_SMTP_HOST = 'smtp.example.com';
    process.env.SQUINT_SMTP_PORT = '587';
    process.env.SQUINT_SMTP_USER = 'user@example.com';
    process.env.SQUINT_SMTP_PASS = 'password';
    process.env.SQUINT_MAIL_FROM = 'from@example.com';
    process.env.SQUINT_MAIL_TO = 'to@example.com';

    const config = loadMailConfig();

    expect(config.host).toBe('smtp.example.com');
    expect(config.port).toBe(587);
    expect(config.secure).toBe(false); // Port 587 ist nicht 465
    expect(config.auth.user).toBe('user@example.com');
    expect(config.auth.pass).toBe('password');
    expect(config.from).toBe('from@example.com');
    expect(config.to).toBe('to@example.com');
  });

  it('sollte Standard-Port 465 verwenden, wenn nicht gesetzt', () => {
    process.env.SQUINT_SMTP_HOST = 'smtp.example.com';
    process.env.SQUINT_SMTP_USER = 'user@example.com';
    process.env.SQUINT_SMTP_PASS = 'password';
    process.env.SQUINT_MAIL_FROM = 'from@example.com';
    process.env.SQUINT_MAIL_TO = 'to@example.com';
    delete process.env.SQUINT_SMTP_PORT;

    const config = loadMailConfig();

    expect(config.port).toBe(465);
    expect(config.secure).toBe(true);
  });

  it('sollte Fehler werfen, wenn Umgebungsvariablen fehlen', () => {
    process.env.SQUINT_SMTP_HOST = 'smtp.example.com';
    // Fehlende Variablen
    delete process.env.SQUINT_SMTP_USER;
    delete process.env.SQUINT_SMTP_PASS;
    delete process.env.SQUINT_MAIL_FROM;
    delete process.env.SQUINT_MAIL_TO;

    expect(() => loadMailConfig()).toThrow('Fehlende Umgebungsvariablen');
  });
});

// ============================================================================
// Tests für finishSelection
// ============================================================================

describe('finishSelection', () => {
  let testToken: string;

  beforeEach(async () => {
    // Test-Verzeichnis sicherstellen
    await mkdir(dataDir, { recursive: true });
    testToken = await createTestSet(3, 10);
  });

  afterEach(async () => {
    await cleanupTestData(testToken);
    vi.clearAllMocks();
  });

  it('1. Mail sollte genau N Dateinamen enthalten', async () => {
    const filenames = ['original-0.jpg', 'original-1.jpg', 'original-2.jpg'];

    const result: FinishResult = await finishSelection(
      testToken,
      filenames,
      testConfig
    );

    expect(result.ok).toBe(true);

    // Prüfe, dass sendMail mit korrekten Parametern aufgerufen wurde
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const callArgs = mockSendMail.mock.calls[0]?.[0];
    expect(callArgs?.subject).toBe(`Squint Auswahl ${testToken}`);
    expect(callArgs?.from).toBe(testConfig.from);
    expect(callArgs?.to).toBe(testConfig.to);

    // Prüfe, dass alle Dateinamen im Text enthalten sind
    const text = callArgs?.text || '';
    expect(text).toContain('original-0.jpg');
    expect(text).toContain('original-1.jpg');
    expect(text).toContain('original-2.jpg');
    expect(text).toContain('Gesamt: 3 Bilder');
  });

  it('2. Zweiter Aufruf bei gelocktem Set: Fehler, keine zweite Mail', async () => {
    const filenames = ['original-0.jpg', 'original-1.jpg', 'original-2.jpg'];

    // Erster Aufruf
    await finishSelection(testToken, filenames, testConfig);

    // Set sollte jetzt gelockt sein
    const setData = await readSet(testToken);
    expect(setData.locked).toBe(true);

    // Zweiter Aufruf
    mockSendMail.mockClear();
    const result: FinishResult = await finishSelection(
      testToken,
      filenames,
      testConfig
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe('bereits gesendet');

    // Keine zweite Mail
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('3. Ungültige filenames (falsche Anzahl) → Fehler, keine Mail', async () => {
    // Falsche Anzahl: 2 statt 3
    const filenames = ['original-0.jpg', 'original-1.jpg'];

    const result: FinishResult = await finishSelection(
      testToken,
      filenames,
      testConfig
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Erwartet 3 Dateinamen');

    // Keine Mail
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('3b. Ungültige filenames (unbekannter Name) → Fehler, keine Mail', async () => {
    const filenames = ['original-0.jpg', 'original-1.jpg', 'unknown.jpg'];

    const result: FinishResult = await finishSelection(
      testToken,
      filenames,
      testConfig
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Unbekannter Dateiname');

    // Keine Mail
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('4. Nach Erfolg: set.json hat selection + locked=true', async () => {
    const filenames = ['original-0.jpg', 'original-1.jpg', 'original-2.jpg'];

    const result: FinishResult = await finishSelection(
      testToken,
      filenames,
      testConfig
    );

    expect(result.ok).toBe(true);

    // Prüfe set.json
    const setData = await readSet(testToken);
    expect(setData.locked).toBe(true);
    expect(setData.selection).toEqual(filenames);
  });

  it('sollte Fehler für unbekanntes Set zurückgeben', async () => {
    // Erstelle einen gültigen Token, der nicht existiert
    const unknownToken = '00000000000000000000000000000000';
    const result: FinishResult = await finishSelection(
      unknownToken,
      ['original-0.jpg'],
      testConfig
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Set nicht gefunden');

    // Keine Mail
    expect(mockSendMail).not.toHaveBeenCalled();
  });
});
