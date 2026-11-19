# Architecture and contribution guide

Saans uses native Node HTTP and browser JavaScript. Production has no third-party npm runtime dependencies. Prettier is a pinned development dependency; Leaflet is vendored under `public/vendor`.

## Request flow

`api/index.js` adapts Vercel requests to the same `server.mjs` handler used locally. The handler enforces host/origin policy, reads bounded JSON bodies, dispatches API calls, and serves an explicit static-file allowlist.

| Module                                                   | Responsibility                                                  |
| -------------------------------------------------------- | --------------------------------------------------------------- |
| `hosting.mjs`                                            | Local versus hosted network binding and origin policy           |
| `lib/http.mjs`                                           | JSON responses and consistent stream/serverless body validation |
| `lib/provider.mjs`                                       | Upstream HTTP status checking and request deadlines             |
| `lib/air-quality.mjs`                                    | Forecast and map provider adaptation                            |
| `lib/cache.mjs`                                          | Bounded, expiring in-process caches                             |
| `lib/assistant.mjs`                                      | AI context, cloud/Ollama adapters, labelled fallback            |
| `engine.mjs`                                             | Pure AQI categories, household plans and impact estimates       |
| `geo.mjs`                                                | Coordinate validation and map sampling                          |
| `public/app.js`                                          | Browser state, navigation and household interactions            |
| `public/dashboard.js`, `public/map.js`, `public/home.js` | Feature-specific views                                          |

## Contracts and limitations

- JSON API bodies must be objects of at most 20,000 bytes, whether streamed by Node or pre-parsed by Vercel.
- Forecast caches expire after ten minutes and hold at most 100 dashboard entries or 30 map batches. Each serverless process has its own disposable cache; correctness never depends on persistence.
- The forecast response uses modelled **US AQI**, not Indian NAQI or indoor measurements. Demo mode and rule-based answers remain explicitly labelled.
- Secrets come only from server environment variables. Never include `.env` in a commit, a screenshot or client JavaScript.
- The static allowlist intentionally exposes shared `engine.mjs` and `geo.mjs`, but no server-only modules.

## Development checks

Use Node 22 or newer, then run `npm ci`. Run `npm run format` after edits and `npm run check` before committing. The check runs formatting verification, recursively checks first-party JavaScript syntax, and runs Node's tests. `npm run test:coverage` produces an optional coverage report; coverage is not a substitute for meaningful assertions.

GitHub Actions runs the same checks on Node 22 and 24 for pushes to `main` and pull requests. Tests cover policy boundaries, request-body validation, cache expiry/eviction, geospatial mapping, AI fallback, local HTTP routes and the Vercel adapter. External providers are mocked in automated tests; successful tests do not certify provider uptime or a cloud deployment.

When adding a route, validate inputs at its boundary, keep provider logic outside the handler, and add a regression test for the observable behaviour. Keep browser strings escaped when interpolating user/provider data into HTML. Do not reformat vendored libraries.
