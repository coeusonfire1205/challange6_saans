# Build brief and prompt record

This records the supplied brief and implementation decisions, not a fabricated transcript of tool use.

## Supplied challenge

Create a GenAI-powered assistant that helps families and communities navigate severe winter smog and urban air pollution. Suggest low-emission daily routines, indoor air quality practices and sustainable alternatives tailored to location and lifestyle, clearly explaining the direct impact of choices.

## User constraints

Build on the user's Windows computer in `D:\hack2skill\challenge 6`; run locally first and deploy later. Public GitHub repository, below 10 MB, exactly one branch, maximum three submission attempts. The provided workflow calls for creating and cloning the repository before coding.

## Implementation direction

Saans uses modelled air quality, household-aware deterministic recommendations and context-grounded generative chat. The UI separates live model forecasts, illustrative demo data, rule-based fallback and AI responses. It avoids unsupported indoor AQI estimates and guaranteed health/carbon outcomes. The impact calculator exposes its scenario assumptions.

## Remaining external setup

A model/provider must be available for actual generative chat. A public GitHub repository URL has not been supplied for this build. Deployment and portal submission are later tasks.

## AQI dashboard direction (v1.3)

User supplied https://www.aqi.in/in and requested a combination with the previous GPT X-inspired template. Added a location-focused AQI summary, six pollutant cards, map preview, 24/48-hour AQI or PM2.5 forecast, CSV export, saved cities, selected India/world comparisons, personalised action cards and assistant CTA. Retained the existing homepage, world map and household tools.
