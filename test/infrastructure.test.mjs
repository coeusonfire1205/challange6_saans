import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { TTLCache } from '../lib/cache.mjs';
import { bodyOf } from '../lib/http.mjs';
test('cache expires at its boundary and evicts the oldest entry at capacity', () => {
  let now = 0;
  const cache = new TTLCache(2, 100, () => now);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  assert.equal(cache.get('a'), undefined);
  assert.equal(cache.get('b'), 2);
  now = 100;
  assert.equal(cache.get('b'), undefined);
  assert.equal(cache.get('c'), undefined);
});
test('refreshing a cache key does not evict unrelated entries', () => {
  const cache = new TTLCache(2, 1000);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('a', 3);
  assert.equal(cache.get('a'), 3);
  assert.equal(cache.get('b'), 2);
});
test('streamed and serverless request bodies have equivalent validation', async () => {
  for (const value of [
    '{"demo":true}',
    'null',
    '[]',
    'true',
    '{broken',
    JSON.stringify({ text: 'x'.repeat(20000) }),
  ]) {
    const requests = [{ body: value }, Readable.from([Buffer.from(value)])];
    for (const req of requests) {
      if (value === '{"demo":true}') assert.deepEqual(await bodyOf(req), { demo: true });
      else await assert.rejects(bodyOf(req));
    }
  }
  assert.deepEqual(await bodyOf({ body: { demo: true } }), { demo: true });
});

import { escapeHTML } from '../public/ui.js';
test('shared HTML escaping keeps provider text inert in text and quoted attributes', () => {
  assert.equal(
    escapeHTML(`<img src="x" onerror='alert(1)'>&`),
    '&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;&amp;',
  );
  assert.equal(escapeHTML(null), '');
});
