import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLocation, normalizePoints, mapResults, viewportPoints } from '../geo.mjs';
test('location validation rejects absent, blank and out-of-range coordinates', () => {
  for (const latitude of [null, undefined, '', true, 91, NaN])
    assert.throws(() => normalizeLocation({ latitude, longitude: 20 }));
  assert.throws(() => normalizeLocation({ latitude: 0, longitude: 181 }));
  assert.deepEqual(normalizeLocation({ name: 'Equator', latitude: 0, longitude: 0 }), {
    name: 'Equator',
    latitude: 0,
    longitude: 0,
  });
});
test('map batches are bounded and preserve coordinate-to-result associations', () => {
  assert.throws(() => normalizePoints([]));
  assert.throws(() => normalizePoints(Array(25).fill({ latitude: 0, longitude: 0 })));
  const points = normalizePoints([
    { name: 'Delhi', latitude: 28, longitude: 77 },
    { name: 'London', latitude: 51, longitude: 0 },
  ]);
  const result = mapResults([{ current: { us_aqi: 180 } }, { current: { us_aqi: 28 } }], points);
  assert.equal(result[0].location.name, 'Delhi');
  assert.equal(result[0].current.us_aqi, 180);
  assert.equal(result[1].location.name, 'London');
  assert.equal(result[1].current.us_aqi, 28);
  assert.throws(() => mapResults([{}], points));
  assert.deepEqual(mapResults({}, [points[0]])[0].current, {});
});
test('viewport samples wrap the date line and cap world width', () => {
  const p = viewportPoints({ south: -30, north: 60, west: 170, east: 210 });
  assert.equal(p.length, 20);
  assert.ok(p.every((p) => p.longitude >= -180 && p.longitude <= 180));
  assert.ok(p.some((p) => p.longitude > 170));
  assert.ok(p.some((p) => p.longitude < 0));
  const world = viewportPoints({ south: -89, north: 89, west: -400, east: 400 });
  assert.ok(world.every((p) => Math.abs(p.latitude) <= 80));
  assert.throws(() => viewportPoints({ south: 30, north: 20, west: 0, east: 10 }));
});
