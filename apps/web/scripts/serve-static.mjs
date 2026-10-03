// Serves the static export (out/) the way CloudFront will: every request goes
// through the real CloudFront Function in infra/functions/viewer-request.js.
// Usage: npm run build && npm run serve:static
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../out');
const fnSource = await readFile(
  path.resolve(here, '../../../infra/functions/viewer-request.js'),
  'utf8',
);
const handler = new Function(`${fnSource}; return handler;`)();

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
};

const port = Number(process.env.PORT ?? 3001);

http
  .createServer(async (req, res) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    const { uri } = handler({ request: { uri: decodeURIComponent(pathname) } });
    const file = path.join(outDir, path.normalize(uri));
    try {
      if (!file.startsWith(outDir)) throw new Error('outside out/');
      const body = await readFile(file);
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
      });
      res.end(body);
    } catch {
      // Mirrors the distribution's 403/404 -> /404.html error response.
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      res.end(await readFile(path.join(outDir, '404.html')));
    }
  })
  .listen(port, () =>
    console.log(`Static export (CloudFront rewrite emulated) on http://localhost:${port}`),
  );
