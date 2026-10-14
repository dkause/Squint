import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const port = Number(process.env.PORT ?? 8080);

const server = createServer(async (req, res) => {
  if (req.url === '/') {
    try {
      const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch {
      res.writeHead(500);
      res.end('index.html nicht gefunden');
    }
    return;
  }
  res.writeHead(404);
  res.end('Nicht gefunden');
});

server.listen(port, () => {
  console.log(`Squint laeuft auf Port ${port}`);
});
