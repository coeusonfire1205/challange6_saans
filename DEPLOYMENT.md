# Deploy Saans

This app needs a Node.js backend. GitHub Pages and a static-only upload cannot run `/api/chat`, city search or AQI proxy requests. Do not deploy only the `public` folder.

## Vercel

1. Import `coeusonfire1205/challange6_saans`, branch `main`.
2. Framework preset: **Other**. Root directory: repository root. Leave Build Command and Output Directory overrides disabled (no frontend compilation is needed).
3. Add `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL` under the project's server environment variables, then deploy/redeploy. Do not prefix the key with `NEXT_PUBLIC_` or `VITE_`.
4. Open the generated HTTPS URL. Check `/healthz` and `/api/health`, then test Ask Saans.

`vercel.json` sends routes to the Node function in `api/index.js`, which imports the shared server handler without opening a port. Public assets are explicitly included in the function bundle. Node 22 or newer is required. A provider request can take up to 90 seconds; the function is configured for up to 120 seconds, subject to your hosting plan limits.

## Render

Create a **Web Service**, connect the repository and use:

- Runtime: Node
- Build command: `npm ci --include=dev && npm run check`
- Start command: `npm start`
- Environment: `NODE_ENV=production`, `HOST=0.0.0.0`
- Health check: `/healthz`

Alternatively create a Blueprint from `render.yaml`. Choose the service plan in Render; no paid plan is selected by this project. Render supplies `PORT`; do not force your local 3060 setting there.

## AI settings

For Gemini's OpenAI-compatible endpoint:

```
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_API_KEY=<your Gemini key>
AI_MODEL=<a model enabled for your Google project>
```

Use the provider and model that successfully generate a response in your account. A model-list response or a configured-cloud label does not verify generation. Provider errors, quota limits and unavailable models still produce explicitly labelled built-in guidance.

For any other OpenAI-compatible provider, set its API root, key and exact model ID. The app appends `/chat/completions` to the API root. Deployment does not upload your local `.env`; configure secrets in the hosting dashboard. `OLLAMA_URL=http://127.0.0.1:11434` is a local-only option and must not be copied to cloud hosting. Hosted instances skip local Ollama discovery unless you explicitly configure an accessible endpoint.

Custom HTTPS domains work with same-origin requests. For a reverse proxy that replaces Host, set `PUBLIC_ORIGIN` to your exact public HTTPS origin. Unrelated cross-origin browser POSTs are rejected. Local development stays loopback-only unless HOST is explicitly set.

The public prototype has no sign-in or durable shared rate limiting. Use your host's rate limits and provider spending limits for a public demo. Browser profiles/checklists remain device-local; server caches are temporary and instance-local. No database is required.

## Verification status

Local and simulated production integration tests validate routing, same-origin POSTs, cross-origin rejection, secret-file exclusion and importing the serverless handler without a listener. An actual hosted build/deployment must still be verified on the selected platform. No live site is created by pushing this configuration.
