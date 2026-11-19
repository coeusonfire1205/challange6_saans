import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, extname } from 'node:path';
import { sources, makePlan } from './engine.mjs';
import { normalizeLocation } from './geo.mjs';
import { hosted, bindHost, permittedRequest } from './hosting.mjs';
import { air, mapAir } from './lib/air-quality.mjs';
import { aiStatus, answer } from './lib/assistant.mjs';
import { fetchJSON } from './lib/provider.mjs';
import { send, bodyOf } from './lib/http.mjs';
const root = fileURLToPath(new URL('./public/', import.meta.url));
const port = Number(process.env.PORT) || 3060;
export async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://tile.openstreetmap.org; script-src 'self'; connect-src 'self'; frame-ancestors 'none'",
  );
  try {
    const denied = permittedRequest(req, port);
    if (denied) return send(res, 403, { error: denied });
    const u = new URL(req.url, 'http://localhost');

    if ((req.method === 'GET' || req.method === 'HEAD') && u.pathname === '/healthz')
      return send(res, 200, { ok: true });
    if (req.method === 'GET' && u.pathname === '/api/health')
      return send(res, 200, {
        ok: true,
        runtime: hosted ? 'hosted' : 'local',
        ai: await aiStatus(),
      });
    if (req.method === 'GET' && u.pathname === '/api/search') {
      const name = u.searchParams.get('q')?.trim();
      if (!name || name.length < 2 || name.length > 100)
        return send(res, 400, { error: 'Enter 2–100 characters' });
      const d = await fetchJSON(
        'https://geocoding-api.open-meteo.com/v1/search?' +
          new URLSearchParams({ name, count: '8', language: 'en', format: 'json' }),
      );
      return send(res, 200, {
        results: (d.results || []).map((x) => ({
          name: x.name,
          admin1: x.admin1,
          country: x.country,
          latitude: x.latitude,
          longitude: x.longitude,
        })),
      });
    }
    if (req.method === 'POST' && u.pathname === '/api/map') {
      const b = await bodyOf(req);
      return send(res, 200, await mapAir(b.points));
    }
    if (req.method === 'POST' && u.pathname === '/api/dashboard') {
      const b = await bodyOf(req),
        location = normalizeLocation(b.location),
        data = await air(location, b.demo === true);
      return send(res, 200, { ...data, plan: makePlan(data, b.profile), sources });
    }
    if (req.method === 'POST' && u.pathname === '/api/chat')
      return send(res, 200, await answer(await bodyOf(req)));
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
    const files = {
      '/': 'index.html',
      '/app.js': 'app.js',
      '/ui.js': 'ui.js',
      '/style.css': 'style.css',
      '/theme.css': 'theme.css',
      '/home.js': 'home.js',
      '/dashboard.js': 'dashboard.js',
      '/dashboard.css': 'dashboard.css',
      '/assets/hero-orbit.png': 'assets/hero-orbit.png',
      '/assets/feature-orbit.png': 'assets/feature-orbit.png',
      '/assets/outfit.ttf': 'assets/outfit.ttf',
      '/favicon.svg': 'favicon.svg',
      '/engine.mjs': '../engine.mjs',
      '/geo.mjs': '../geo.mjs',
      '/map.js': 'map.js',
      '/vendor/leaflet/leaflet.js': 'vendor/leaflet/leaflet.js',
      '/vendor/leaflet/leaflet.css': 'vendor/leaflet/leaflet.css',
    };
    if (!Object.hasOwn(files, u.pathname)) return send(res, 404, { error: 'Not found' });
    const file = files[u.pathname],
      content = await readFile(join(root, file));
    const mime = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.mjs': 'text/javascript',
      '.css': 'text/css',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.ttf': 'font/ttf',
    };
    res.writeHead(200, {
      'Content-Type':
        mime[extname(file)] + (['.png', '.ttf'].includes(extname(file)) ? '' : '; charset=utf-8'),
      'Cache-Control': 'no-cache',
    });
    res.end(content);
  } catch (e) {
    send(res, 400, {
      error:
        e.message === 'fetch failed'
          ? 'Unable to reach data provider. Retry or explicitly select demo mode.'
          : e.message,
    });
  }
}
// Importing the handler in a serverless function must never open a listening socket.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const server = http.createServer(handler);
  server.listen(port, bindHost, () =>
    console.log(`Saans is running at http://${bindHost}:${port}\nPress Ctrl+C to stop.`),
  );
  server.on('error', (e) => {
    console.error(
      e.code === 'EADDRINUSE'
        ? `Port ${port} is in use. Open the existing app or change PORT in .env.`
        : e.message,
    );
    process.exitCode = 1;
  });
}
