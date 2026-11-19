# Validation record — Saans v1.3

## Previous installed version (v1.2)
Project folder: D:\hack2skill\challenge 6
Local app: http://127.0.0.1:3060
World map: http://127.0.0.1:3060/#map
The server now runs from the D-drive project. An ignored .env file is prepared; existing .env contents are preserved during updates.

## Verified on Windows / Node.js v24.22.1
All 11 automated tests pass: AQI boundaries, missing values, sensitive-household plans, high-pollution travel advice, ventilation safety, emission arithmetic, profile bounds, coordinate validation, bounded map batches, coordinate/result associations, date-line wrapping and server/AI integration with a mock provider.

Headless Chrome browser checks passed:
- Actual city search and location selection; New Delhi and London returned different live model forecasts.
- Initial world map with 24 colour-coded city points and successfully loaded OpenStreetMap tiles.
- Marker selection, exact-coordinate lookup for Sydney, zoom controls and a 20-point viewport refresh.
- Actual map mouse click changed the active location and displayed its returned AQI.
- Geolocation and follow-location toggle with simulated coordinates in an isolated test profile.
- Shared location details, responsive mobile layout, no horizontal overflow and no JavaScript exceptions.
- Desktop and mobile screenshots visually reviewed.

## Remaining external setup
Real AI generation requires the user's later API configuration or a local Ollama model. Live AQI, city search, maps, routines and checklists work independently of AI credentials.
Fill AI_BASE_URL, AI_API_KEY and AI_MODEL in .env for a compatible provider, then restart the server.
GitHub creation/clone/push, public visibility and branch verification are not yet performed. Deployment and submission remain deferred.

## Data limits
Air readings are Open-Meteo/CAMS model forecasts, explicitly labelled US AQI. Map points are sampled model values rather than monitoring stations or a continuous pollution heatmap. Geographic zoom does not increase atmospheric model resolution.
Travel emission factors remain illustrative prototype assumptions.


## Reference-design verification (v1.2)
The supplied PDF was inspected visually. The new home page and application theme use its black background, large geometric typography, violet/blue orbital artwork and dark glass-like panels. Desktop and mobile screenshots were reviewed.

All 11 automated tests pass on the user's Windows computer after the redesign. Headless Chrome verified the default homepage, locally hosted font and images, live forecast preview, dashboard CTA, 24 loaded map points, all eight routes at desktop and mobile widths, and the household dialog. No JavaScript exceptions or page-level horizontal overflow were detected. The existing AI configuration file was preserved. Source is approximately 1.4 MB, excluding secrets and Git metadata.

## AQI dashboard update (v1.3)

The v1.3 source package contains the AQI-focused dashboard and retains the prior homepage and world map. Automated syntax and 11 core/integration tests passed in the build workspace. A live Open-Meteo request returned all six concentration fields, their µg/m³ units, US AQI and 72 forecast timestamps.

A separate jsdom integration check exercised the six pollutant cards, escaped location labels, missing readings, metric/duration switches, CSV trigger, saved-city add/remove and invalid storage, city comparisons and sorting, selection callbacks, map longitude wrapping, methodology action, demo disclosure and stale-response protection after route teardown. The city and map responses in that check were fixtures; it was not a live browser test.

## Installed and browser-verified on 19 November 2026

Version 1.3 is installed in D:\hack2skill\challenge 6 and running at http://127.0.0.1:3060/#overview. The previous source was backed up to C:\Users\singh\AppData\Local\Temp\saans-backup-20261119-200926. The existing .env was preserved, verified by matching hashes without exposing its contents.

All 11 automated tests passed on Windows. Headless Chrome verified actual live data for all six pollutants, India/world city comparisons, changing from New Delhi (US AQI 170) to London (37), saved locations, forecast metric/range controls, methodology dialog, demo toggle and 24 world-map city markers. These values are observations at test time, not permanent readings.

All eight routes were checked at 1500, 768 and 390 pixel widths, with no page-level horizontal overflow or JavaScript exceptions. Desktop and mobile screenshots were visually reviewed. The dashboard was opened in the user's normal browser. AI credentials remain for the user to configure; no deployment, repository push or submission was performed.
