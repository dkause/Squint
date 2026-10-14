import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSet, deleteExpired } from './storage.js';
import { SetNotFoundError, InvalidTokenError, dataDir as storageDataDir } from './storage.js';
import { handleUpload } from './upload.js';
import { finishSelection, loadMailConfig } from './finish.js';
import { loadCleanupConfig, startCleanupScheduler } from './cleanup.js';

const port = Number(process.env.PORT ?? 8080);

// Valid filename pattern for image serving
const FILENAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

// Static client assets served from public/
const PUBLIC_ASSETS = new Map<string, string>([
  ['/swipe.js', 'text/javascript; charset=utf-8'],
  ['/swipe.css', 'text/css; charset=utf-8'],
  ['/match.css', 'text/css; charset=utf-8'],
  ['/manifest.webmanifest', 'application/manifest+json'],
  ['/squint-icon.jpg', 'image/jpeg'],
]);

// Get directory of this file
const __dirname = dirname(fileURLToPath(import.meta.url));

// Ensure dataDir is a string
const dataDir = storageDataDir as string;

async function readBody(req: import('node:http').IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url!, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // Route: GET /
    if (pathname === '/') {
      try {
        const htmlPath = resolve(__dirname, '../public/index.html');
        const html = await readFile(htmlPath, 'utf8');
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch {
        res.writeHead(500);
        res.end('index.html nicht gefunden');
      }
      return;
    }

    // Route: GET /upload - photographer upload form
    if (pathname === '/upload' && req.method === 'GET') {
      try {
        const htmlPath = resolve(__dirname, '../public/upload.html');
        const html = await readFile(htmlPath, 'utf8');
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch {
        res.writeHead(500);
        res.end('upload.html nicht gefunden');
      }
      return;
    }

    // Route: POST /upload - create set from multipart form
    if (pathname === '/upload' && req.method === 'POST') {
      const result = await handleUpload(req);
      if (result.ok) {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ token: result.token }));
      } else {
        res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: result.error }));
      }
      return;
    }

    // Route: static client assets
    const assetType = PUBLIC_ASSETS.get(pathname);
    if (assetType !== undefined) {
      try {
        const assetPath = resolve(__dirname, '..', 'public', pathname.slice(1));
        const asset = await readFile(assetPath);
        res.writeHead(200, { 'content-type': assetType });
        res.end(asset);
      } catch {
        res.writeHead(404);
        res.end('Asset nicht gefunden');
      }
      return;
    }

    // Extract token from pathname (first segment)
    const pathSegments = pathname.split('/').filter(Boolean);
    const token = pathSegments[0];

    if (!token) {
      res.writeHead(404);
      res.end('Nicht gefunden');
      return;
    }

    // Route: GET /:token - serve index.html for customer view
    if (pathSegments.length === 1) {
      try {
        // Validate token exists
        await readSet(token);
        const htmlPath = resolve(__dirname, '../public/index.html');
        const html = await readFile(htmlPath, 'utf8');
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch (error) {
        if (error instanceof SetNotFoundError || error instanceof InvalidTokenError) {
          res.writeHead(404);
          res.end('Set nicht gefunden');
        } else {
          res.writeHead(500);
          res.end('Serverfehler');
        }
      }
      return;
    }

    // Route: GET /:token/meta - return set metadata as JSON
    if (pathSegments.length === 2 && pathSegments[1] === 'meta') {
      try {
        const setData = await readSet(token);
        const response = {
          n: setData.n,
          locked: setData.locked,
          images: setData.images.map(img => ({
            filename: img.filename,
            originalname: img.originalname,
            favorite: img.favorite
          }))
        };
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(response));
      } catch (error) {
        if (error instanceof SetNotFoundError || error instanceof InvalidTokenError) {
          res.writeHead(404);
          res.end('Set nicht gefunden');
        } else {
          res.writeHead(500);
          res.end('Serverfehler');
        }
      }
      return;
    }

    // Route: POST /:token/finish - confirm selection, send mail, lock set
    if (pathSegments.length === 2 && pathSegments[1] === 'finish' && req.method === 'POST') {
      const body = await readBody(req);
      let filenames: unknown;
      try {
        filenames = JSON.parse(body).filenames;
      } catch {
        res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'ungueltiger Request-Body' }));
        return;
      }
      if (!Array.isArray(filenames) || !filenames.every(f => typeof f === 'string')) {
        res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'filenames fehlen' }));
        return;
      }
      let mailConfig;
      try {
        mailConfig = loadMailConfig();
      } catch (error) {
        res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: `Mail nicht konfiguriert: ${(error as Error).message}` }));
        return;
      }
      const result = await finishSelection(token, filenames, mailConfig);
      const status = result.ok ? 200 : 400;
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(result.ok ? { ok: true } : { error: result.error }));
      return;
    }

    // Route: GET /:token/images/:filename - serve image file
    if (pathSegments.length === 3 && pathSegments[1] === 'images') {
      const filename = pathSegments[2] as string;

      // Validate filename to prevent path traversal
      if (!FILENAME_PATTERN.test(filename)) {
        res.writeHead(400);
        res.end('Ungültiger Dateiname');
        return;
      }

      try {
        // Validate token exists
        await readSet(token);
        const imagePath = join(dataDir, token, 'images', filename) as string;
        const file = await readFile(imagePath);
        res.writeHead(200, { 'content-type': 'image/jpeg' });
        res.end(file);
      } catch (error) {
        if (error instanceof SetNotFoundError || error instanceof InvalidTokenError) {
          res.writeHead(404);
          res.end('Set nicht gefunden');
        } else {
          res.writeHead(404);
          res.end('Bild nicht gefunden');
        }
      }
      return;
    }

    // No matching route
    res.writeHead(404);
    res.end('Nicht gefunden');
  } catch {
    res.writeHead(500);
    res.end('Serverfehler');
  }
});

server.listen(port, () => {
  console.log(`Squint laeuft auf Port ${port}`);
  const cleanupConfig = loadCleanupConfig();
  if (cleanupConfig) {
    startCleanupScheduler(cleanupConfig, {
      deleteExpired,
      now: () => Date.now(),
      setInterval: (fn: () => void, ms: number) => setInterval(fn, ms),
      clearInterval: (id: object) => clearInterval(id as NodeJS.Timeout),
    });
    console.log(`Cleanup aktiv: Frist ${cleanupConfig.retentionMs}ms, Intervall ${cleanupConfig.intervalMs}ms`);
  }
});
