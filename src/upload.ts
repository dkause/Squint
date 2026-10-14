import { IncomingMessage } from 'node:http';
import { Readable } from 'node:stream';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { createSet, dataDir } from './storage.js';

// Typen
export type UploadResult = { ok: true; token: string } | { ok: false; error: string };

// Sanitize filename: nur [a-zA-Z0-9._-] erlaubt, andere Zeichen durch "-" ersetzen
function sanitizeFilename(original: string): string {
  return original
    .split('')
    .map((char) => /^[a-zA-Z0-9._-]$/.test(char) ? char : '-')
    .join('')
    .replace(/^-+|-+$/g, '') // Führende/trailing Bindestriche entfernen
    .replace(/-{2,}/g, '-'); // Mehrere Bindestriche zu einem zusammenfassen
}

// Hilfsfunktion: Dateiendung extrahieren
function getExtension(filename: string): { base: string; ext: string } {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return { base: filename, ext: '' };
  }
  return {
    base: filename.slice(0, lastDotIndex),
    ext: filename.slice(lastDotIndex),
  };
}

// Erlaubte MIME-Typen
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

// Bild mit sharp verarbeiten: lange Kante max 1600px, JPEG, Qualität 80
async function processImage(buffer: Buffer): Promise<Buffer> {
  const processedBuffer = await sharp(buffer)
    .resize({
      width: 1600,
      height: 1600,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80 })
    .toBuffer();
  
  return processedBuffer;
}

export async function handleUpload(req: IncomingMessage): Promise<UploadResult> {
  try {
    // 1. Passwort prüfen
    const uploadPassword = process.env.SQUINT_UPLOAD_PASSWORD;
    if (!uploadPassword) {
      return { ok: false, error: 'Upload-Passwort nicht konfiguriert' };
    }

    // 2. Multipart-Parsing mit nativem Node 22 Request
    const bodyStream = Readable.toWeb(req) as unknown as ReadableStream<Uint8Array>;
    
    // Headers für den Web-Request vorbereiten
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers[key] = value;
      } else if (Array.isArray(value)) {
        headers[key] = value.join(', ');
      }
    }
    
    // Request-Objekt für formData() erstellen
    // duplex ist Teil von Undici, nicht der DOM-RequestInit-Typen
    const webRequest = new Request('http://localhost', {
      method: 'POST',
      headers,
      body: bodyStream,
      duplex: 'half',
    } as RequestInit);
    
    // FormData parsen
    const formData = await webRequest.formData();
    
    // 3. Passwort aus Formular
    const password = formData.get('password');
    if (typeof password !== 'string' || password !== uploadPassword) {
      return { ok: false, error: 'falsches Passwort' };
    }
    
    // 4. Bilder aus Formular
    const imagesFiles = formData.getAll('images') as File[];
    
    if (!imagesFiles || imagesFiles.length === 0) {
      return { ok: false, error: 'Keine Bilder hochgeladen' };
    }
    
    // 5. Favoriten aus Formular (JSON-Array)
    const favoritesRaw = formData.get('favorites');
    let favorites: string[] = [];
    
    if (typeof favoritesRaw === 'string') {
      try {
        favorites = JSON.parse(favoritesRaw);
      } catch {
        return { ok: false, error: 'Ungültiges Favoriten-Format' };
      }
    }
    
    // 6. N aus Formular
    const nRaw = formData.get('n');
    if (typeof nRaw !== 'string') {
      return { ok: false, error: 'N fehlt' };
    }
    
    const n = parseInt(nRaw, 10);
    if (isNaN(n)) {
      return { ok: false, error: 'N muss eine Zahl sein' };
    }
    
    // 7. Validierung: 1 <= N < Anzahl Bilder
    const imageCount = imagesFiles.length;
    if (n < 1) {
      return { ok: false, error: 'N muss mindestens 1 sein' };
    }
    if (n >= imageCount) {
      return { ok: false, error: `N muss kleiner als die Anzahl der Bilder (${imageCount}) sein` };
    }
    
    // 8. Bilder verarbeiten und Metadaten sammeln
    interface ProcessedImage {
      originalname: string;
      sanitizedName: string;
      buffer: Buffer;
      favorite: boolean;
    }
    
    const processedImages: ProcessedImage[] = [];
    
    for (const file of imagesFiles) {
      // Prüfe MIME-Type
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return { ok: false, error: `Nicht unterstützter Dateityp: ${file.type}` };
      }
      
      // Datei-Inhalt lesen
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Bild verarbeiten
      const processedBuffer = await processImage(buffer);
      
      // Dateinamen sanitizen
      const sanitizedName = sanitizeFilename(file.name);
      
      // Favoriten-Status
      const isFavorite = favorites.includes(file.name);
      
      processedImages.push({
        originalname: file.name,
        sanitizedName,
        buffer: processedBuffer,
        favorite: isFavorite,
      });
    }
    
    // 9. Eindeutige Dateinamen bestimmen
    const desiredNames: string[] = processedImages.map(img => img.sanitizedName);
    const finalNames: string[] = [];
    const usedNames = new Set<string>();
    
    for (let i = 0; i < desiredNames.length; i++) {
      const desiredName = desiredNames[i]!;
      let finalName = desiredName;
      let counter = 1;
      
      while (usedNames.has(finalName)) {
        counter++;
        const { base, ext } = getExtension(desiredName);
        finalName = `${base}-${counter}${ext}`;
      }
      
      usedNames.add(finalName);
      finalNames.push(finalName);
    }
    
    // 10. Set erstellen mit den finalen Namen
    const imagesForSet: { filename: string; originalname: string; favorite: boolean }[] = [];
    for (let i = 0; i < processedImages.length; i++) {
      const processedImage = processedImages[i]!;
      imagesForSet.push({
        filename: finalNames[i]!,
        originalname: processedImage.originalname,
        favorite: processedImage.favorite,
      });
    }
    
    const token = await createSet(imagesForSet, n);
    
    // 11. Bilder in das richtige Verzeichnis speichern
    const tokenImagesDir = join(dataDir, token, 'images');
    await mkdir(tokenImagesDir, { recursive: true });
    
    for (let i = 0; i < processedImages.length; i++) {
      const filePath = join(tokenImagesDir, finalNames[i]!);
      await writeFile(filePath, processedImages[i]!.buffer);
    }
    
    return { ok: true, token };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('Upload error:', error);
    return { ok: false, error: errorMessage };
  }
}
