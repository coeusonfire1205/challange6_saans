export const sources = [
  {
    name: 'Open-Meteo / CAMS air quality forecasts',
    url: 'https://open-meteo.com/en/docs/air-quality-api',
  },
  { name: 'AirNow: AQI basics', url: 'https://www.airnow.gov/aqi/aqi-basics/' },
  {
    name: 'EPA: indoor particulate matter',
    url: 'https://www.epa.gov/indoor-air-quality-iaq/indoor-particulate-matter',
  },
  {
    name: 'EPA: ozone-generating air cleaners',
    url: 'https://www.epa.gov/indoor-air-quality-iaq/ozone-generators-are-sold-air-cleaners',
  },
  {
    name: 'WHO: personal interventions',
    url: 'https://www.who.int/news-room/questions-and-answers/item/air-pollution-personal-interventions-and-risk-communication',
  },
];
export function category(value) {
  if (!Number.isFinite(value) || value < 0)
    return { label: 'Unavailable', color: '#697780', level: -1 };
  const n = Math.round(value),
    ranges = [50, 100, 150, 200, 300, Infinity];
  const level = ranges.findIndex((x) => n <= x);
  return {
    label: [
      'Good',
      'Moderate',
      'Unhealthy for sensitive groups',
      'Unhealthy',
      'Very unhealthy',
      'Hazardous',
    ][level],
    color: ['#2d886b', '#a48116', '#c66a27', '#c94d4d', '#8d569c', '#8b3455'][level],
    level,
  };
}
export function profileOf(p = {}) {
  return {
    sensitive: !!p.sensitive,
    children: !!p.children,
    older: !!p.older,
    purifier: !!p.purifier,
    commute: ['car', 'bus', 'metro', 'bike', 'walk'].includes(p.commute) ? p.commute : 'car',
    distance: Math.min(100, Math.max(0, Number(p.distance) || 0)),
    budget: ['low', 'medium', 'high'].includes(p.budget) ? p.budget : 'low',
    start: Math.min(23, Math.max(0, Number(p.start) || 9)),
    end: Math.min(23, Math.max(0, Number(p.end) || 18)),
  };
}
export function makePlan(data, raw = {}) {
  const p = profileOf(raw),
    c = category(data.current.us_aqi),
    vulnerable = p.sensitive || p.children || p.older;
  const elevated = c.level >= 3 || (c.level >= 2 && vulnerable),
    unknown = c.level < 0;
  const hours = (data.hours || [])
    .filter((h) => Number.isFinite(h.aqi) && h.time >= Date.now() / 1000)
    .slice(0, 24);
  const best = hours.reduce((a, b) => (!a || b.aqi < a.aqi ? b : a), null);
  const family = vulnerable
    ? 'Your household includes someone more sensitive to air pollution. '
    : '';
  return {
    category: c,
    best,
    items: [
      {
        id: 'move',
        time: 'Morning',
        title: unknown
          ? 'Check conditions before exercise'
          : elevated
            ? 'Bring your workout indoors'
            : 'Choose a quieter route',
        body: unknown
          ? 'Air-quality data is unavailable. Check an official local advisory before planning prolonged outdoor exercise.'
          : elevated
            ? `${family}Reduce prolonged or strenuous outdoor activity. Use a cleaner indoor space for exercise; follow local advisories.`
            : 'Avoid busy roads and adjust outdoor activity if symptoms occur. Sensitive people may need shorter or lighter activity even at moderate AQI.',
        impact:
          'Less time near traffic can reduce exposure. A cleaner hour is not a guarantee of safe air.',
        tag: 'Exposure',
      },
      {
        id: 'commute',
        time: `${String(p.start).padStart(2, '0')}:00`,
        title:
          p.commute === 'car' ? 'Make one trip a shared trip' : 'Keep your commute low-emission',
        body:
          p.commute === 'car'
            ? 'Try metro, bus or an existing carpool where practical. Combine errands into the same trip.'
            : `Keep using ${p.commute === 'bike' ? 'cycling' : p.commute}. ${elevated ? 'For high-pollution days, consider an enclosed public-transit alternative to walking or cycling.' : 'Choose routes away from heavy traffic when possible.'}`,
        impact:
          'Replacing solo car kilometres can reduce transport emissions. See the calculator for explicit assumptions.',
        tag: 'Emissions',
      },
      {
        id: 'home',
        time: 'At home',
        title: p.purifier ? 'Set up a cleaner-air room' : 'Start with indoor pollution sources',
        body: p.purifier
          ? 'Run a suitable particle air cleaner in the room you use most. Maintain filters and avoid ozone-generating devices.'
          : 'Avoid smoking, incense and candles indoors. Damp-dust rather than dry-sweeping; use a kitchen exhaust vented outdoors when cooking.',
        impact:
          'Source control reduces indoor particle generation. A particle filter does not remove every gas.',
        tag: p.budget === 'low' ? 'Low cost' : 'Indoor air',
      },
      {
        id: 'air',
        time: 'Evening',
        title: elevated
          ? 'Ventilate with outdoor conditions in mind'
          : 'Check before opening windows',
        body: 'Balance fresh air with outdoor pollution, heat and indoor sources. Ventilate when outdoor air improves; avoid sealing an unsafe, overheated or combustion-polluted room. Outdoor AQI cannot measure your indoor air.',
        impact:
          'Ventilation helps dilute indoor pollutants, but polluted outdoor air can add particles.',
        tag: 'Indoor air',
      },
    ],
  };
}
export function impact(distance, days, baseline, alternative) {
  // Editable illustrative scenario assumptions, NOT official emissions factors.
  const factors = { car: 0.18, bus: 0.08, metro: 0.04, bike: 0, walk: 0 };
  if (!(baseline in factors) || !(alternative in factors)) throw new Error('Unknown travel mode');
  const km = Number(distance),
    d = Number(days);
  if (!Number.isFinite(km) || !Number.isFinite(d) || km < 0 || km > 200 || d < 0 || d > 365)
    throw new Error('Invalid distance or days');
  return {
    baseline: km * d * factors[baseline],
    alternative: km * d * factors[alternative],
    saved: km * d * (factors[baseline] - factors[alternative]),
    factors,
    km: km * d,
  };
}
export function fallbackAnswer(question, data, p) {
  const plan = makePlan(data, p),
    q = question.toLowerCase();
  if (/chest pain|cannot breathe|can't breathe|severe breath/.test(q))
    return 'For severe breathing difficulty or chest pain, seek urgent medical help. This assistant cannot assess or diagnose symptoms.';
  if (/plant|ioniz|ozone generator/.test(q))
    return 'Houseplants are not a substitute for ventilation, source control or a suitable particle filter. Avoid ozone-generating air cleaners: ozone is a lung irritant. Start by reducing smoke, incense and cooking emissions indoors.';
  let items = plan.items;
  if (/window|ventilat|खिड़की/.test(q)) items = [items[3]];
  else if (/purifi|indoor|room|घर/.test(q)) items = [items[2], items[3]];
  else if (/run|walk|exercise|child|school/.test(q)) items = [items[0]];
  else if (/commut|travel|carbon|bus|metro/.test(q)) items = [items[1]];
  return (
    `For ${data.location.name}, the ${data.mode === 'demo' ? 'illustrative demo' : 'modelled forecast'} US AQI is ${Number.isFinite(data.current.us_aqi) ? Math.round(data.current.us_aqi) : 'unavailable'} (${plan.category.label}).\n\n` +
    items.map((x) => `${x.title}: ${x.body}\nWhy it matters: ${x.impact}`).join('\n\n') +
    '\n\nThis is guidance from built-in rules, not a generated AI response. Check official local advisories.'
  );
}
export function demoData(location) {
  const now = Math.floor(Date.now() / 3600000) * 3600;
  return {
    mode: 'demo',
    location,
    timezone: 'Asia/Kolkata',
    fetchedAt: new Date().toISOString(),
    current: {
      time: now,
      us_aqi: 178,
      pm2_5: 91,
      pm10: 145,
      nitrogen_dioxide: 31,
      ozone: 46,
      sulphur_dioxide: 12,
      carbon_monoxide: 540,
    },
    hours: Array.from({ length: 48 }, (_, i) => ({
      time: now + i * 3600,
      aqi: Math.round(150 + 35 * Math.cos(i / 4)),
      pm25: Math.round(72 + 25 * Math.cos(i / 4)),
    })),
    source: 'Illustrative sample data — not current conditions',
  };
}
