import { mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

// Lokale Typen (entsprechen SPEC.md)
interface Image {
  filename: string;
  originalname: string;
  favorite: boolean;
}

interface SetData {
  createdAt: number;
  n: number;
  locked: boolean;
  images: Image[];
  selection?: string[];
}

// Fehlerklassen
export class SetNotFoundError extends Error {
  constructor(token: string) {
    super(`Set with token "${token}" not found`);
    this.name = 'SetNotFoundError';
  }
}

export class InvalidTokenError extends Error {
  constructor(token: string) {
    super(`Invalid token format: "${token}"`);
    this.name = 'InvalidTokenError';
  }
}

// Token-Validierung: genau 32 Hex-Zeichen (128 Bit)
const TOKEN_PATTERN = /^[0-9a-f]{32}$/;

function validateToken(token: string): void {
  if (!TOKEN_PATTERN.test(token)) {
    throw new InvalidTokenError(token);
  }
}

// Konfiguration
const dataDir = process.env.SQUINT_DATA_DIR ? resolve(process.env.SQUINT_DATA_DIR) : resolve('./data');

export { dataDir };

// Hilfsfunktion: Set-Pfad
function getSetPath(token: string): string {
  return join(dataDir, token);
}

function getSetJsonPath(token: string): string {
  return join(getSetPath(token), 'set.json');
}

// Token generieren: 128 Bit Zufall = 16 Bytes = 32 Hex-Zeichen
function generateToken(): string {
  return randomBytes(16).toString('hex');
}

// Set-Daten lesen
async function readSetData(token: string): Promise<SetData> {
  validateToken(token);
  const setPath = getSetJsonPath(token);
  try {
    const content = await readFile(setPath, 'utf8');
    return JSON.parse(content) as SetData;
  } catch {
    throw new SetNotFoundError(token);
  }
}

// Set-Daten schreiben
async function writeSetData(token: string, data: SetData): Promise<void> {
  const setPath = getSetJsonPath(token);
  await mkdir(getSetPath(token), { recursive: true });
  await writeFile(setPath, JSON.stringify(data, null, 2), 'utf8');
}

// Set anlegen
export interface CreateSetOptions {
  n: number;
}

export async function createSet(
  images: { filename: string; originalname: string; favorite: boolean }[],
  n: number
): Promise<string> {
  const token = generateToken();
  const now = Date.now();
  const setData: SetData = {
    createdAt: now,
    n,
    locked: false,
    images: images.map((img) => ({
      filename: img.filename,
      originalname: img.originalname,
      favorite: img.favorite,
    })),
  };
  await writeSetData(token, setData);
  return token;
}

// Set lesen
export async function readSet(token: string): Promise<SetData> {
  return readSetData(token);
}

// Set locken
export async function lockSet(token: string): Promise<void> {
  const data = await readSetData(token);
  data.locked = true;
  await writeSetData(token, data);
}

// Auswahl speichern
export async function recordSelection(token: string, filenames: string[]): Promise<void> {
  const data = await readSetData(token);
  data.selection = filenames;
  await writeSetData(token, data);
}

// Abgelaufene Sets löschen
export async function deleteExpired(olderThanMs: number, now: number): Promise<string[]> {
  const deletedTokens: string[] = [];
  
  try {
    const tokens = await readdir(dataDir);
    
    for (const token of tokens) {
      // Nur gültige Token-Verzeichnisse prüfen
      if (!TOKEN_PATTERN.test(token)) {
        continue;
      }
      
      const setJsonPath = getSetJsonPath(token);
      try {
        const content = await readFile(setJsonPath, 'utf8');
        const data = JSON.parse(content) as SetData;
        
        if (now - data.createdAt > olderThanMs) {
          await rm(getSetPath(token), { recursive: true, force: true });
          deletedTokens.push(token);
        }
      } catch {
        // set.json nicht lesbar oder ungültig - ignorieren
        continue;
      }
    }
  } catch {
    // dataDir existiert nicht - kein Problem
  }
  
  return deletedTokens;
}
