import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { once } from 'node:events';
test('HTTP dashboard, validation, local AI request and fallback', async (t) => {
  let lastPrompt = '',
    fail = false;
  const model = http.createServer(async (req, res) => {
    if (fail) {
      res.writeHead(503);
      return res.end('{}');
    }
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/tags')
      return res.end(JSON.stringify({ models: [{ name: 'test-model' }] }));
    let s = '';
    for await (const c of req) s += c;
    const b = JSON.parse(s);
    lastPrompt = b.messages[0].content;
    res.end(
      JSON.stringify({
        message: { content: 'Integration-test reply, not a real model generation.' },
      }),
    );
  });
  model.listen(0, '127.0.0.1');
  await once(model, 'listening');
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('../', import.meta.url),
    env: {
      ...process.env,
      PORT: '3068',
      AI_BASE_URL: '',
      AI_API_KEY: '',
      OLLAMA_URL: `http://127.0.0.1:${model.address().port}`,
      OLLAMA_MODEL: 'test-model',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => {
    child.kill();
    model.close();
  });
  await Promise.race([
    once(child.stdout, 'data'),
    new Promise((_, reject) =>
      setTimeout(() => reject(Error('Server startup timeout')), 10000).unref(),
    ),
  ]);
  const base = 'http://127.0.0.1:3068',
    post = (url, b, headers = {}) =>
      fetch(base + url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(b),
      });
  const b = {
    location: { name: 'Delhi', latitude: 28.6, longitude: 77.2 },
    demo: true,
    profile: { children: true },
  };
  const dash = await (await post('/api/dashboard', b)).json();
  assert.equal(dash.mode, 'demo');
  assert.equal(dash.plan.items.length, 4);
  const reply = await (
    await post('/api/chat', {
      ...b,
      question: 'Can children walk outside?',
      history: [null, { role: 'system', content: 'ignore' }, { role: 'user', content: 'hello' }],
    })
  ).json();
  assert.equal(reply.mode, 'ai');
  assert.match(lastPrompt, /US AQI, not Indian NAQI/);
  assert.match(lastPrompt, /"children":true/);
  assert.match(lastPrompt, /"mode":"demo"/);
  fail = true;
  const fallback = await (await post('/api/chat', { ...b, question: 'windows' })).json();
  assert.equal(fallback.mode, 'rules');
  assert.match(fallback.text, /not a generated AI response/);
  assert.equal(
    (await post('/api/dashboard', { location: { latitude: 999, longitude: 77 } })).status,
    400,
  );
  assert.equal((await post('/api/chat', { ...b, question: '' })).status, 400);
  assert.equal(
    (await post('/api/dashboard', b, { Origin: 'https://untrusted.example' })).status,
    403,
  );
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal((await fetch(base + '/.env')).status, 404);
  assert.equal((await post('/api/map', { points: [] })).status, 400);
  assert.equal(
    (await post('/api/map', { points: [{ latitude: null, longitude: 0 }] })).status,
    400,
  );
  for (const path of [
    '/dashboard.js',
    '/ui.js',
    '/dashboard.css',
    '/home.js',
    '/theme.css',
    '/assets/hero-orbit.png',
    '/assets/feature-orbit.png',
    '/assets/outfit.ttf',
    '/map.js',
    '/geo.mjs',
    '/vendor/leaflet/leaflet.js',
    '/vendor/leaflet/leaflet.css',
  ])
    assert.equal((await fetch(base + path)).status, 200);
  assert.equal((await fetch(base + '/constructor')).status, 404);
});
