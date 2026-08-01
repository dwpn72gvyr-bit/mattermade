// Production static server for the console SPA. Dependency-free by design:
// serves apps/web/dist with an index.html fallback for client-side routes,
// binds 0.0.0.0:$PORT for Railway.

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
};

async function readFileSafe(filePath) {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return undefined;
    return await fs.readFile(filePath);
  } catch {
    return undefined;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    // Resolve inside dist only; anything escaping the root falls back to the SPA.
    const requested = path.normalize(path.join(DIST, decodeURIComponent(url.pathname)));
    const inDist = requested.startsWith(DIST + path.sep) || requested === DIST;

    let filePath = inDist ? requested : path.join(DIST, 'index.html');
    let body = await readFileSafe(filePath);
    if (body === undefined) {
      // Client-side route (/projects/prj-e etc.): serve the app shell.
      filePath = path.join(DIST, 'index.html');
      body = await readFileSafe(filePath);
    }
    if (body === undefined) {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('dist/ is missing; run the build first');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const isAsset = filePath.includes(`${path.sep}assets${path.sep}`);
    res.writeHead(200, {
      'content-type': MIME[ext] ?? 'application/octet-stream',
      // Vite assets are content-hashed and safe to cache hard; the shell is not.
      'cache-control': isAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('server error');
    console.error(err);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`OuterEdit console serving ${DIST} on 0.0.0.0:${PORT}`);
});
