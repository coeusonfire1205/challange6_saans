export async function fetchJSON(url, options = {}, timeout = 15000) {
  const r = await fetch(url, { ...options, signal: AbortSignal.timeout(timeout) });
  if (!r.ok) throw new Error(`Provider returned HTTP ${r.status}`);
  return r.json();
}
