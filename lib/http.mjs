const MAX_BODY_BYTES = 20_000;
export function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}
/** Accept both Node request streams and bodies already parsed by Vercel. */
export async function bodyOf(req) {
  let raw;
  if (req.body !== undefined) {
    raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) throw new Error('Request too large');
  } else {
    let bytes = 0;
    const chunks = [];
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > MAX_BODY_BYTES) throw new Error('Request too large');
      chunks.push(buffer);
    }
    raw = Buffer.concat(chunks).toString() || '{}';
  }
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new Error('Request must contain valid JSON');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Request body must be a JSON object');
  }
  return body;
}
