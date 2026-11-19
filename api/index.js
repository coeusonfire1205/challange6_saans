import { handler } from '../server.mjs';
export default function (req, res) {
  const url = new URL(req.url, 'http://localhost');
  const route = url.searchParams.get('__path');
  if (route !== null) {
    url.searchParams.delete('__path');
    req.url =
      '/' + route.replace(/^\/+/, '') + (url.searchParams.size ? '?' + url.searchParams : '');
  }
  return handler(req, res);
}
