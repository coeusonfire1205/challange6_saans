import { demoData } from '../engine.mjs';
import { normalizePoints, mapResults } from '../geo.mjs';
import { fetchJSON } from './provider.mjs';
import { TTLCache } from './cache.mjs';
const cache = new TTLCache(100, 10 * 60 * 1000),
  mapCache = new TTLCache(30, 10 * 60 * 1000);
export async function air(location, demo = false) {
  if (demo) return demoData(location);
  const key = `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`,
    old = cache.get(key);
  if (old) return { ...old, location };
  const qs = new URLSearchParams({
    latitude: location.latitude,
    longitude: location.longitude,
    current: 'us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide',
    hourly: 'us_aqi,pm2_5',
    forecast_days: '3',
    timezone: 'auto',
    timeformat: 'unixtime',
  });
  const raw = await fetchJSON('https://air-quality-api.open-meteo.com/v1/air-quality?' + qs);
  if (!raw.current || !Array.isArray(raw.hourly?.time))
    throw new Error('Incomplete air-quality response');
  const data = {
    mode: 'live',
    location,
    timezone: raw.timezone || 'UTC',
    fetchedAt: new Date().toISOString(),
    current: raw.current,
    hours: raw.hourly.time.map((time, i) => ({
      time,
      aqi: raw.hourly.us_aqi[i],
      pm25: raw.hourly.pm2_5[i],
    })),
    source: 'Open-Meteo · Copernicus CAMS · modelled forecast',
  };
  cache.set(key, data);
  return data;
}
export async function mapAir(points) {
  const locations = normalizePoints(points),
    key = locations.map((p) => `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`).join(';');
  const old = mapCache.get(key);
  if (old) return { ...old, points: old.points.map((p, i) => ({ ...p, location: locations[i] })) };
  const params = new URLSearchParams({
    latitude: locations.map((p) => p.latitude).join(','),
    longitude: locations.map((p) => p.longitude).join(','),
    current: 'us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone',
    forecast_days: '1',
    timezone: 'auto',
    timeformat: 'unixtime',
  });
  const raw = await fetchJSON(
    'https://air-quality-api.open-meteo.com/v1/air-quality?' + params,
    {},
    25000,
  );
  const data = {
    points: mapResults(raw, locations),
    fetchedAt: new Date().toISOString(),
    source: 'Open-Meteo / Copernicus CAMS · modelled US AQI',
  };
  mapCache.set(key, data);
  return data;
}
