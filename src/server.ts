import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSet } from './storage.js';
import { SetNotFoundError, InvalidTokenError, dataDir as storageDataDir } from './storage.js';

const port = Number(process.env.PORT ?? 8080);

// Valid filename pattern for image serving
const FILENAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

// Get directory of this file
const __dirname = dirname(fileURLToPath(import.meta.url));

// Ensure dataDir is a string
const dataDir = storageDataDir as string;

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
});
