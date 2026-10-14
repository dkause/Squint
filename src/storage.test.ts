import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

// Test-Konfiguration: temporäres Verzeichnis
const testDataDir = resolve('./test-data');

// Hilfsfunktion: Test-Verzeichnis bereinigen
async function cleanupTestDir(): Promise<void> {
  try {
    await rm(testDataDir, { recursive: true, force: true });
  } catch {
    // Ignorieren, wenn Verzeichnis nicht existiert
  }
}

// Hilfsfunktion: Set-Verzeichnis erstellen
async function createTestSetFiles(token: string, images: { filename: string; originalname: string; favorite: boolean }[], createdAt?: number): Promise<void> {
  const setPath = join(testDataDir, token);
  const imagesDir = join(setPath, 'images');
  
  // Set-Verzeichnis und Images-Verzeichnis erstellen
  await mkdir(imagesDir, { recursive: true });
  
  // set.json schreiben
  const setData = {
    createdAt: createdAt ?? Date.now(),
    n: images.length > 1 ? 2 : 1,
    locked: false,
    images: images.map(img => ({ filename: img.filename, originalname: img.originalname, favorite: img.favorite })),
  };
  await writeFile(join(setPath, 'set.json'), JSON.stringify(setData, null, 2), 'utf8');
  
  // Test-Bilddateien erstellen
  for (const img of images) {
    await writeFile(join(imagesDir, img.filename), 'test image content', 'utf8');
  }
}

// Dynamischer Import mit Umgebungsvariable
async function importStorage() {
  // Umgebungsvariable setzen
  process.env.SQUINT_DATA_DIR = testDataDir;
  
  // Modul importieren (wird gecached, aber wir setzen die Variable vor dem ersten Import)
  const storage = await import('./storage.js');
  return storage;
}

describe('storage', () => {
  let storage: Awaited<ReturnType<typeof importStorage>>;

  beforeEach(async () => {
    await cleanupTestDir();
    await mkdir(testDataDir, { recursive: true });
    // Import mit gesetzter Umgebungsvariable
    storage = await importStorage();
  });

  afterEach(async () => {
    await cleanupTestDir();
    delete process.env.SQUINT_DATA_DIR;
  });

  describe('createSet', () => {
    it('erzeugt Token mit 32 Hex-Zeichen (128 Bit Entropie)', async () => {
      const token = await storage.createSet([
        { filename: 'img1.jpg', originalname: 'original1.jpg', favorite: false },
      ], 1);
      
      expect(token).toMatch(/^[0-9a-f]{32}$/);
      expect(token.length).toBe(32);
    });

    it('erzeugt eindeutige Token über 1000 Läufe', async () => {
      const tokens = new Set<string>();
      const count = 1000;
      
      for (let i = 0; i < count; i++) {
        const token = await storage.createSet([
          { filename: `img${i}.jpg`, originalname: `original${i}.jpg`, favorite: false },
        ], 1);
        tokens.add(token);
      }
      
      expect(tokens.size).toBe(count);
    });

    it('schreibt set.json mit korrekten Daten', async () => {
      const now = Date.now();
      const token = await storage.createSet([
        { filename: 'img1.jpg', originalname: 'original1.jpg', favorite: true },
        { filename: 'img2.jpg', originalname: 'original2.jpg', favorite: false },
      ], 2);
      
      const setData = await storage.readSet(token);
      
      expect(setData.n).toBe(2);
      expect(setData.locked).toBe(false);
      expect(setData.images).toHaveLength(2);
      expect(setData.images[0]!.filename).toBe('img1.jpg');
      expect(setData.images[0]!.originalname).toBe('original1.jpg');
      expect(setData.images[0]!.favorite).toBe(true);
      expect(setData.images[1]!.filename).toBe('img2.jpg');
      expect(setData.images[1]!.favorite).toBe(false);
      expect(setData.createdAt).toBeGreaterThanOrEqual(now - 1000);
      expect(setData.createdAt).toBeLessThanOrEqual(now + 1000);
    });
  });

  describe('readSet', () => {
    it('liest ein bestehendes Set', async () => {
      const token = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
      await createTestSetFiles(token, [
        { filename: 'img1.jpg', originalname: 'original1.jpg', favorite: true },
      ]);
      
      const setData = await storage.readSet(token);
      
      expect(setData.images).toHaveLength(1);
      expect(setData.images[0]!.filename).toBe('img1.jpg');
    });

    it('wirft SetNotFoundError für unbekannten Token', async () => {
      await expect(storage.readSet('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4'))
        .rejects.toThrow(storage.SetNotFoundError);
    });

    it('wirft InvalidTokenError für ungültigen Token (zu kurz)', async () => {
      await expect(storage.readSet('abc'))
        .rejects.toThrow(storage.InvalidTokenError);
    });

    it('wirft InvalidTokenError für ungültigen Token (Pfad-Traversal)', async () => {
      await expect(storage.readSet('../evil'))
        .rejects.toThrow(storage.InvalidTokenError);
    });

    it('wirft InvalidTokenError für ungültigen Token (nicht-Hex)', async () => {
      await expect(storage.readSet('abcdefghijklmnopqrstuvwxyz123456'))
        .rejects.toThrow(storage.InvalidTokenError);
    });
  });

  describe('lockSet', () => {
    it('setzt locked auf true', async () => {
      const token = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
      await createTestSetFiles(token, [
        { filename: 'img1.jpg', originalname: 'original1.jpg', favorite: false },
      ]);
      
      await storage.lockSet(token);
      
      const setData = await storage.readSet(token);
      expect(setData.locked).toBe(true);
    });

    it('wirft SetNotFoundError für unbekannten Token', async () => {
      await expect(storage.lockSet('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4'))
        .rejects.toThrow(storage.SetNotFoundError);
    });
  });

  describe('recordSelection', () => {
    it('speichert die finale Auswahl', async () => {
      const token = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
      await createTestSetFiles(token, [
        { filename: 'img1.jpg', originalname: 'original1.jpg', favorite: false },
        { filename: 'img2.jpg', originalname: 'original2.jpg', favorite: false },
      ]);
      
      await storage.recordSelection(token, ['img1.jpg']);
      
      const setData = await storage.readSet(token);
      expect(setData.selection).toEqual(['img1.jpg']);
    });

    it('speichert mehrere ausgewählte Dateien', async () => {
      const token = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
      await createTestSetFiles(token, [
        { filename: 'img1.jpg', originalname: 'original1.jpg', favorite: false },
        { filename: 'img2.jpg', originalname: 'original2.jpg', favorite: false },
        { filename: 'img3.jpg', originalname: 'original3.jpg', favorite: false },
      ]);
      
      await storage.recordSelection(token, ['img1.jpg', 'img3.jpg']);
      
      const setData = await storage.readSet(token);
      expect(setData.selection).toEqual(['img1.jpg', 'img3.jpg']);
    });

    it('wirft SetNotFoundError für unbekannten Token', async () => {
      await expect(storage.recordSelection('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4', ['img1.jpg']))
        .rejects.toThrow(storage.SetNotFoundError);
    });
  });

  describe('deleteExpired', () => {
    it('löscht Sets, deren Erstelldatum älter ist als die Frist', async () => {
      const oldToken = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
      const recentToken = 'b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4';
      
      // Altes Set (vor 2 Stunden)
      const oldCreatedAt = Date.now() - 2 * 60 * 60 * 1000;
      await createTestSetFiles(oldToken, [
        { filename: 'old.jpg', originalname: 'old.jpg', favorite: false },
      ], oldCreatedAt);
      
      // Aktuelles Set (vor 1 Minute)
      const recentCreatedAt = Date.now() - 60 * 1000;
      await createTestSetFiles(recentToken, [
        { filename: 'recent.jpg', originalname: 'recent.jpg', favorite: false },
      ], recentCreatedAt);
      
      const now = Date.now();
      const deleted = await storage.deleteExpired(1 * 60 * 60 * 1000, now); // 1 Stunde Frist
      
      expect(deleted).toContain(oldToken);
      expect(deleted).not.toContain(recentToken);
      
      // Prüfen, dass das alte Set gelöscht wurde
      try {
        await readFile(join(testDataDir, oldToken, 'set.json'), 'utf8');
        expect.fail('Altes Set sollte gelöscht sein');
      } catch {
        // Erwartet - Datei sollte nicht existieren
      }
      
      // Prüfen, dass das aktuelle Set noch existiert
      const recentContent = await readFile(join(testDataDir, recentToken, 'set.json'), 'utf8');
      expect(JSON.parse(recentContent).createdAt).toBe(recentCreatedAt);
    });

    it('löscht auch die Bilddateien im images-Verzeichnis', async () => {
      const token = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
      
      // Set mit Bild erstellen
      const oldCreatedAt = Date.now() - 2 * 60 * 60 * 1000;
      await createTestSetFiles(token, [
        { filename: 'test.jpg', originalname: 'test.jpg', favorite: false },
      ], oldCreatedAt);
      
      const now = Date.now();
      await storage.deleteExpired(1 * 60 * 60 * 1000, now); // 1 Stunde Frist
      
      // Prüfen, dass sowohl set.json als auch das Bild gelöscht wurden
      try {
        await readFile(join(testDataDir, token, 'set.json'), 'utf8');
        expect.fail('set.json sollte gelöscht sein');
      } catch {
        // Erwartet
      }
      
      try {
        await readFile(join(testDataDir, token, 'images', 'test.jpg'), 'utf8');
        expect.fail('Bilddatei sollte gelöscht sein');
      } catch {
        // Erwartet
      }
    });

    it('löscht keine Sets, wenn keines abgelaufen ist', async () => {
      const token = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
      
      const createdAt = Date.now();
      await createTestSetFiles(token, [
        { filename: 'test.jpg', originalname: 'test.jpg', favorite: false },
      ], createdAt);
      
      const now = Date.now();
      const deleted = await storage.deleteExpired(1 * 60 * 60 * 1000, now); // 1 Stunde Frist
      
      expect(deleted).toHaveLength(0);
      
      // Set sollte noch existieren
      const content = await readFile(join(testDataDir, token, 'set.json'), 'utf8');
      expect(JSON.parse(content).createdAt).toBe(createdAt);
    });

    it('behandelt ungültige Token-Verzeichnisse als nicht abgelaufen', async () => {
      // Ungültiges Verzeichnis erstellen (kein Hex-Token)
      const invalidDir = join(testDataDir, 'invalid');
      await mkdir(invalidDir, { recursive: true });
      await writeFile(join(invalidDir, 'set.json'), '{}', 'utf8');
      
      const now = Date.now();
      const deleted = await storage.deleteExpired(0, now); // Alle Sets sollten abgelaufen sein
      
      // Ungültige Verzeichnisse sollten ignoriert werden
      expect(deleted).not.toContain('invalid');
    });

    it('behandelt leeres data-Verzeichnis', async () => {
      const now = Date.now();
      const deleted = await storage.deleteExpired(1 * 60 * 60 * 1000, now);
      
      expect(deleted).toHaveLength(0);
    });

    it('behandelt nicht existierendes data-Verzeichnis', async () => {
      // data-Verzeichnis löschen
      await rm(testDataDir, { recursive: true, force: true });
      
      const now = Date.now();
      const deleted = await storage.deleteExpired(1 * 60 * 60 * 1000, now);
      
      expect(deleted).toHaveLength(0);
    });
  });

  describe('Integration: create, read, lock, recordSelection', () => {
    it('vollständiger Workflow: Set anlegen, lesen, locken, Auswahl speichern', async () => {
      // Set anlegen
      const token = await storage.createSet([
        { filename: 'img1.jpg', originalname: 'original1.jpg', favorite: true },
        { filename: 'img2.jpg', originalname: 'original2.jpg', favorite: false },
        { filename: 'img3.jpg', originalname: 'original3.jpg', favorite: true },
      ], 2);
      
      // Set lesen
      let setData = await storage.readSet(token);
      expect(setData.locked).toBe(false);
      expect(setData.n).toBe(2);
      expect(setData.images).toHaveLength(3);
      
      // Set locken
      await storage.lockSet(token);
      setData = await storage.readSet(token);
      expect(setData.locked).toBe(true);
      
      // Auswahl speichern
      await storage.recordSelection(token, ['img1.jpg', 'img3.jpg']);
      setData = await storage.readSet(token);
      expect(setData.selection).toEqual(['img1.jpg', 'img3.jpg']);
    });
  });
});
