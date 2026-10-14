/**
 * Hilfsfunktionen für Upload-Tests mit Playwright
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Erstellt Test-JPEG-Bilder mit sharp
 * Erzeugt kleine JPEG-Dateien für den Upload-Test
 */
export async function createTestImages(count: number = 5): Promise<string[]> {
  const sharp = await import('sharp');
  const filenames: string[] = [];

  for (let i = 0; i < count; i++) {
    const filename = `test-image-${i + 1}.jpg`;
    const filepath = join(process.cwd(), 'e2e', 'fixtures', filename);
    
    // Erstelle ein kleines JPEG-Bild (100x100, farbig)
    const buffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: (i * 50) % 256, g: (i * 100) % 256, b: (i * 150) % 256 },
      },
    })
      .jpeg({ quality: 80 })
      .toBuffer();

    await sharp(buffer).toFile(filepath);
    filenames.push(filepath);
  }

  return filenames;
}

/**
 * Führt einen Upload über die Playwright API durch
 */
export async function uploadImages(
  request: APIRequestContext,
  password: string,
  imagePaths: string[],
  n: number,
  favorites: string[] = []
): Promise<{ token: string; ok: boolean; error?: string }> {
  // Bilder als Buffer lesen
  const imageBuffers = imagePaths.map(path => readFileSync(path));
  
  // Multipart-Formular erstellen
  const formData = new FormData();
  formData.append('password', password);
  formData.append('n', n.toString());
  formData.append('favorites', JSON.stringify(favorites));
  
  // Bilder hinzufügen
  for (const buffer of imageBuffers) {
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    formData.append('images', blob, `test-image-${imageBuffers.indexOf(buffer) + 1}.jpg`);
  }

  // Upload durchführen
  const response = await request.post('/upload', {
    multipart: formData,
  });

  const result = await response.json();
  
  if (response.ok() && result.token) {
    return { token: result.token, ok: true };
  } else {
    return { 
      token: '', 
      ok: false, 
      error: result.error || 'Upload fehlgeschlagen' 
    };
  }
}


