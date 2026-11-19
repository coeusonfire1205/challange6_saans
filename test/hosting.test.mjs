import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
test('production listener accepts public origin, rejects foreign origins and serves only allowed files', async (t) => {
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('../', import.meta.url),
    env: {
      ...process.env,
      PORT: '3069',
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PUBLIC_ORIGIN: 'https://saans.example',
      AI_BASE_URL: '',
      AI_API_KEY: '',
      OLLAMA_URL: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => child.kill());
  await once(child.stdout, 'data');
  const base = 'http://127.0.0.1:3069';
  const body = JSON.stringify({
    demo: true,
    location: { latitude: 28.6, longitude: 77.2, name: 'Delhi' },
  });
  assert.equal((await fetch(base + '/healthz')).status, 200);
  assert.equal((await (await fetch(base + '/api/health')).json()).runtime, 'hosted');
  assert.equal(
    (
      await fetch(base + '/api/dashboard', {
        method: 'POST',
        headers: { Origin: 'https://saans.example', 'Content-Type': 'application/json' },
        body,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await fetch(base + '/api/dashboard', {
        method: 'POST',
        headers: { Origin: 'https://evil.example' },
        body,
      })
    ).status,
    403,
  );
  for (const path of ['/.env', '/server.mjs', '/hosting.mjs', '/package.json'])
    assert.equal((await fetch(base + path)).status, 404);
  for (const path of ['/', '/app.js', '/engine.mjs', '/assets/outfit.ttf'])
    assert.equal((await fetch(base + path)).status, 200);
});
test('serverless adapter routes query strings and pre-parsed request bodies without listening', async () => {
  const { default: handler } = await import('../api/index.js');
  const invoke = async (url, body) => {
    let status, result;
    const res = {
      setHeader() {},
      writeHead(s) {
        status = s;
      },
      end(x) {
        result = x;
      },
    };
    await handler(
      { url, headers: { host: 'localhost:3060' }, method: body ? 'POST' : 'GET', body },
      res,
    );
    return { status, result };
  };
  assert.equal((await invoke('/api/index?__path=healthz')).status, 200);
  assert.match((await invoke('/api/index?__path=app.js')).result.toString(), /renderDashboard/);
  const d = await invoke('/api/index?__path=api%2Fdashboard', {
    demo: true,
    location: { latitude: 0, longitude: 0 },
  });
  assert.equal(d.status, 200);
  assert.equal(JSON.parse(d.result).mode, 'demo');
  assert.equal((await invoke('/api/index?__path=.env')).status, 404);
});
