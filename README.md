# Saans — Urban Air Quality Assistant

Hack2skill Prompt Wars, Challenge 06. A local web application that helps households plan around urban air pollution, reduce indoor particle sources, and explore lower-emission routines.

## Run on Windows

Requirements: Node.js 22 or newer. No npm dependencies or build step are needed.

1. Open this folder, ideally `D:\hack2skill\challenge 6`.
2. Double-click `START.bat`, or run `npm start` in this folder.
3. Open http://127.0.0.1:3060.
4. Search a city or choose browser geolocation. Allow internet access for live forecast requests.
5. Set up **Your household** to tailor the routine.

The server binds to 127.0.0.1 only. Stop it with Ctrl+C. `npm run dev` enables server restart on edits. Change `PORT` in `.env` if needed; for a custom port open that URL manually rather than using the default-port launcher.

## Enable generative AI

The UI works without an AI key, but its fallback is explicitly labelled **built-in guidance**, not GenAI. For a GenAI challenge submission, configure and demonstrate a working model before submitting.

### Fully local generation with Ollama

Install Ollama from https://ollama.com/download/windows, then run:

```powershell
ollama pull qwen2.5:1.5b
```

Make sure Ollama is running. The app checks `http://127.0.0.1:11434` and uses `qwen2.5:1.5b` by default. Refresh the app after pulling the model. The small model is a starting point; response quality depends on the selected model and hardware. Model weights stay outside this repository and may require over 1 GB of disk space.

To use another model, copy `.env.example` to `.env` and edit `OLLAMA_MODEL`. If Ollama is not running, start the Ollama desktop app or run `ollama serve` in another terminal.

### Optional cloud provider

Use a provider supporting the `/chat/completions` API format. Set `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL` in `.env`. A configured cloud provider takes precedence over Ollama. Secrets remain server-side and `.env` is ignored by Git. Never put keys in frontend code. The configured provider receives the user's question, recent conversation, location, forecast and household settings when they send a chat message.

The assistant status distinguishes local AI, configured cloud AI and built-in guidance. A configured cloud endpoint is not verified until a successful response. If generation fails, the response visibly falls back to rules.

## Features

- Live city search and optional geolocation; Open-Meteo/CAMS modelled air quality.
- Clearly labelled **US AQI**, pollutant concentrations, 24/48-hour forecast controls, valid time and local time zone.
- AQI-focused dark violet dashboard: six pollutant cards, clickable map preview, saved cities, India/world comparisons and forecast CSV export.
- Opt-in demo data, unavailable-value handling and explicit connection errors. No silent fake live readings.
- Household profile for children, older adults, pollution sensitivity, purifier access and commute.
- Personal daily routine, completion tracking, text download and print.
- Indoor-air checklist with source control, ventilation and filtration guidance.
- Travel scenario calculator with visible illustrative assumptions and positive/negative differences.
- Local community pledges and a copyable brief; no invented users, live feed or counts.
- Context-grounded chat with local Ollama or an optional compatible cloud API.
- Responsive layout, keyboard controls, form labels, reduced-motion support and data methodology links.

## Stack and storage

Native Node.js HTTP server and Fetch API; vanilla JavaScript modules, semantic HTML and CSS; SVG charts and Leaflet 1.9.4 maps with OpenStreetMap tiles. No npm production dependencies; Leaflet 1.9.4 is vendored with its license. This keeps setup simple and the repository small. Browser localStorage holds profile, active city, up to eight saved cities, checklists and pledges. Chat stays in memory until reload or clear. Server memory caches forecast responses for up to 10 minutes. There is no account system or shared database in this local prototype.

## Architecture

`server.mjs`: local server, data proxy, validation, caching and AI integration.
`geo.mjs`: validated locations, bounded map batches and dateline-aware viewport sampling.
`public/map.js`: interactive world map and selected-point details.
`public/dashboard.js` and `public/dashboard.css`: AQI dashboard, forecast controls, saved locations and city comparisons.
`engine.mjs`: AQI categorisation, household plans, fallback guidance and impact calculations.
`public/app.js`: interface, forms, state and exports.
`public/style.css`: responsive design.
`test/engine.test.mjs`: meaningful rule and calculation tests.

## Data and evidence

- Forecast API and attribution: https://open-meteo.com/en/docs/air-quality-api — Open-Meteo and Copernicus Atmosphere Monitoring Service (CAMS). Forecast data is modelled on a grid, not a personal sensor reading. Attribution is shown in the app. Review the provider's current usage terms before deployment.
- AQI categories: https://www.airnow.gov/aqi/aqi-basics/ — US AQI is not India's National AQI. Do not compare the two as identical scales.
- Indoor particles: https://www.epa.gov/indoor-air-quality-iaq/indoor-particulate-matter
- Ozone devices: https://www.epa.gov/indoor-air-quality-iaq/ozone-generators-are-sold-air-cleaners
- Personal interventions: https://www.who.int/news-room/questions-and-answers/item/air-pollution-personal-interventions-and-risk-communication
- Ollama integration: https://docs.ollama.com/api/chat

The commute factors (car 0.18, bus 0.08, metro 0.04, bike/walk 0 kg CO2e/passenger-km) are **illustrative prototype assumptions**, not certified or India-specific values. Operational walking/cycling emissions are treated as zero; lifecycle and dietary effects are excluded. Replace these factors with appropriate sourced values for a production deployment. No claim is made about precise exposure reductions or an AQI decrease caused by a user's actions.

## Validation

Run `npm run check`. Tests cover AQI category boundaries, absent readings, sensitive groups, high-pollution travel advice, ventilation safety, emission arithmetic, demo disclosure and profile bounds.

Useful manual checks: search and select a city; save a household profile; switch demo mode; navigate all eight tabs; mark and reload checklist items; compare both emission reductions and increases; download/print a plan; copy a community brief; send a chat with and without an available model; try a narrow mobile viewport.

## Hack2skill submission constraints

- Public GitHub repository, one branch only (use `main`).
- Repository must be under 10 MB. Keep model weights, `.env`, dependencies, archives and generated test artifacts outside Git.
- Maximum three submission attempts; do a final functional review first.
- The supplied instructions ask for a public repository to be created and cloned into the AI platform before coding. This working copy was prepared before a repository URL was supplied. Do not claim the sequence was completed; verify with the organisers how to handle this before submission.
- GitHub creation, pushing, deployment and portal submission are not performed by this local app.

Before submitting, connect a working generative model, verify the public repo and its single branch, check tracked size and history, and complete a real demo. Review generated advice against the cited sources. This is everyday planning guidance, not diagnosis or an emergency service.

## Location and world map (v1.1)

Search a city and choose a result, press **Use my location**, or click **World map**. Selecting a city, GPS position, exact coordinate or map point retrieves its actual model forecast, switches off demo mode and updates the shared location across the dashboard, routine and chat. Missing data remains unavailable. Old chat replies are discarded if the selected context changes while generation is running.

The world map supports dragging, touch/pinch and +/- zoom. It loads colour-coded forecasts for 24 world cities initially. **Load this area** retrieves a 20-point sample of the current visible bounds, including areas across the date line. **Selected location** centres the map on your chosen point. Click any marker or any map position for full pollutants and a forecast-backed routine. A coordinate form and an expandable point list provide alternatives to clicking the map.

Map colours represent sampled **US AQI model forecasts**, not monitoring stations or an interpolated global heatmap. Zoom does not improve the atmospheric model's source resolution. Requests are bounded and cached for ten minutes. Map tiles load directly from OpenStreetMap with visible attribution, normal browser caching and a referrer; no bulk tile downloads are performed. See https://operations.osmfoundation.org/policies/tiles/ before deployment. Leaflet license is included in public/vendor/leaflet/LICENSE.

**Follow my location** is opt-in and requires browser geolocation permission. It refreshes the position while the app is open, when the device moves about 1 km or ten minutes have elapsed, with a minimum interval of 30 seconds. Selecting a city or map point disables following. Stop following by unticking it. The selected coordinates are sent to Open-Meteo for the forecast; this does not connect an indoor air sensor.

The AI key is independent of air-quality/map access. A `.env` file is prepared in the project folder on the user's computer. Fill AI_BASE_URL, AI_API_KEY and AI_MODEL for a compatible provider, then restart the app. `.env` is a file, not a folder, and is excluded from Git.

## Design update (v1.2)

The default route is a new home page inspired by the user's supplied GPT X reference PDF: black backgrounds, violet/blue orbital artwork, large geometric headings and translucent dark panels. All eight destinations (Home plus the existing seven app screens) use consistent navigation and styling. The homepage AQI preview uses the selected location's actual app data, with loading/unavailable/demo states.

`public/home.js` renders the homepage; `public/theme.css` layers the reference-inspired design over the existing component layouts. Outfit is hosted locally with its SIL Open Font License in `public/assets/Outfit-OFL.txt`. The two orbital images were reconstructed from the supplied PDF's embedded images and alpha masks; provenance is recorded in `public/assets/ASSETS.md`. These are decorative and have empty alt text. AI credentials and household data are not bundled in the source package.

## Updating an existing local installation

Stop the running app with Ctrl+C. Extract this package and copy its contents into `D:\hack2skill\challenge 6`, replacing matching source files. Keep your existing `.env`; the package contains only `.env.example`. Restart with `START.bat` and open http://127.0.0.1:3060/#overview. No deployment is performed.

The dashboard borrows the information hierarchy of AQI.in while keeping Saans’s dark violet identity. It uses Open-Meteo/CAMS data, not the AQI.in API. City comparisons cover six selected cities, not a complete pollution ranking. SO2 and CO concentrations are shown in µg/m³.
