import { escapeHTML as esc } from '/ui.js';
import { category, impact, sources } from '/engine.mjs';
import { renderAirMap, destroyAirMap } from '/map.js';
import { renderHome } from '/home.js';
import { renderDashboard, destroyDashboard } from '/dashboard.js';
const $ = (s) => document.querySelector(s);

function read(k, f) {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? f;
  } catch {
    return f;
  }
}
function save(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    toast('Browser storage is unavailable. Changes last for this session.');
  }
}
let profile = read('saans.profile', {
    commute: 'car',
    distance: 8,
    start: 9,
    end: 18,
    budget: 'low',
  }),
  location = read('saans.location', { name: 'New Delhi', latitude: 28.6139, longitude: 77.209 }),
  demo = false,
  data = null,
  busy = false,
  requestId = 0,
  health = null,
  messages = [],
  sending = false;
let checks = read('saans.checks', {}),
  pledges = read('saans.pledges', {});
const views = [
  ['home', '◇', 'Home'],
  ['overview', '◫', 'Air quality'],
  ['map', '◎', 'World map'],
  ['routine', '◷', 'My routine'],
  ['indoor', '⌂', 'Indoor air'],
  ['impact', '↗', 'My impact'],
  ['community', '♧', 'Community'],
  ['assistant', '✧', 'Ask Saans'],
];
const descriptions = {
  home: ['Intelligence for the air we share.', 'A clearer way to breathe. A better way to live.'],
  map: [
    'A world of air, at your fingertips.',
    'Explore air quality across the globe. Choose a point to shape your daily plan.',
  ],
  overview: [
    'Good choices start with better air.',
    'Understand your air. Plan your day. Look after your people.',
  ],
  routine: [
    'A better day, one choice at a time.',
    'A practical routine shaped around your household and the air outside.',
  ],
  indoor: [
    'Make home your breathing space.',
    'Start with the sources. Build simple habits that help your indoor air.',
  ],
  impact: [
    'Small switches. Visible impact.',
    'Explore what a different commute could mean for your footprint.',
  ],
  community: [
    'Cleaner air starts with us.',
    'Turn individual habits into a conversation in your community.',
  ],
  assistant: [
    'A little guidance goes a long way.',
    'Ask about your air, your routine, and the choices in between.',
  ],
};
function route() {
  return views.some((x) => x[0] === locationHash()) ? locationHash() : 'home';
}
function locationHash() {
  return window.location.hash.slice(1);
}
function toast(text) {
  $('#toast').textContent = text;
  $('#toast').style.display = 'block';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($('#toast').style.display = 'none'), 3500);
}
function notice(text) {
  $('#notice').innerHTML = text ? `<div class="notice">${esc(text)}</div>` : '';
}
async function api(path, body) {
  const r = await fetch(
    path,
    body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {},
  );
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}
function payload() {
  return { location, profile, demo };
}
const num = (n, d = 0) => (Number.isFinite(n) ? n.toFixed(d) : '—');
function time(t, opts = {}) {
  return new Date(t * 1000).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: data?.timezone || 'UTC',
    ...opts,
  });
}
function future() {
  return (data?.hours || [])
    .filter((h) => h.time >= Date.now() / 1000 && Number.isFinite(h.aqi))
    .slice(0, 24);
}
async function load() {
  const id = ++requestId;
  busy = true;
  data = null;
  notice('');
  render();
  $('#refresh').disabled = true;
  try {
    const d = await api('/api/dashboard', payload());
    if (id !== requestId) return;
    data = d;
    notice(
      demo
        ? 'DEMO MODE — illustrative sample readings. These are not current conditions for this location.'
        : '',
    );
  } catch (e) {
    if (id !== requestId) return;
    notice(e.message);
  } finally {
    if (id === requestId) {
      busy = false;
      $('#refresh').disabled = false;
      render();
    }
  }
}
function goto(name) {
  window.location.hash = name;
  if (route() === name) render();
}
function render() {
  const view = route();
  destroyDashboard();
  document.body.dataset.view = view;
  $('#nav').innerHTML = views
    .map(
      ([id, icon, label]) =>
        `<a href="#${id}" class="${id === view ? 'active' : ''}" ${id === view ? 'aria-current="page"' : ''} title="${label}"><span class="nav-icon">${icon}</span><span class="nav-label">${label}</span></a>`,
    )
    .join('');
  $('#selected-location').innerHTML =
    `<span>⌖ <strong>${esc(location.name)}</strong><small>${Number(location.latitude).toFixed(3)}°, ${Number(location.longitude).toFixed(3)}°</small></span><span>${busy ? 'Updating AQI…' : data ? `${demo ? 'Demo · ' : ''}US AQI ${num(data.current.us_aqi)} · ${esc(data.plan.category.label)}` : 'AQI unavailable'} <a href="#map">Explore map ↗</a></span>`;
  $('#page-title').textContent = descriptions[view][0];
  $('#page-subtitle').textContent = descriptions[view][1];
  $('#section-name').textContent = views.find((x) => x[0] === view)[2];
  if (view === 'home') {
    destroyAirMap();
    $('#view').innerHTML = renderHome({ data, busy, location, demo, chart });
    return;
  }
  if (view === 'map') {
    renderAirMap({ location, data, busy, demo, onPick: selectLocation });
    return;
  }
  destroyAirMap();
  if (busy) {
    $('#view').innerHTML =
      '<div class="loading"><div class="loader"></div>Checking the air around you…</div>';
    return;
  }
  if (!data) {
    $('#view').innerHTML =
      '<div class="card empty"><div class="sparkle">⌁</div><h2>Let’s find your air.</h2><p class="muted">Refresh to connect to the forecast provider, search another city,<br>or turn on demo data to explore the app.</p><button class="button" id="retry">Try again</button></div>';
    $('#retry').onclick = load;
    return;
  }
  ({
    overview: overview,
    routine: routine,
    indoor: indoor,
    impact: impactView,
    community: community,
    assistant: assistant,
  })[view]();
  document.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => goto(b.dataset.go)));
}
function chart() {
  const hs = future();
  if (hs.length < 2) return '<p class="muted">Hourly forecast is unavailable.</p>';
  const max = Math.max(100, ...hs.map((x) => x.aqi)) * 1.15,
    w = 600,
    h = 150,
    left = 32,
    right = 580,
    top = 12,
    bottom = 122;
  const pts = hs.map((v, i) => [
    left + (i / (hs.length - 1)) * (right - left),
    bottom - (v.aqi / max) * (bottom - top),
  ]);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p.map((n) => n.toFixed(1)).join(',')).join(' ');
  const grid = [0, Math.round(max / 2), Math.round(max)]
    .map((v) => {
      const y = bottom - (v / max) * (bottom - top);
      return `<line x1="32" y1="${y}" x2="580" y2="${y}" stroke="#28272f" stroke-dasharray="3 5"/><text x="0" y="${y + 3}">${v}</text>`;
    })
    .join('');
  const ticks = [
    0,
    Math.floor((hs.length - 1) / 3),
    Math.floor((2 * (hs.length - 1)) / 3),
    hs.length - 1,
  ]
    .map(
      (i) =>
        `<text x="${pts[i][0]}" y="146" text-anchor="${i === 0 ? 'start' : i === hs.length - 1 ? 'end' : 'middle'}">${esc(time(hs[i].time))}</text>`,
    )
    .join('');
  return `<svg class="chart" role="img" aria-label="Next 24 hours of modelled US AQI, from ${Math.round(hs[0].aqi)} to ${Math.round(hs.at(-1).aqi)}; detailed values below" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#8d6bff" stop-opacity=".65"/><stop offset="1" stop-color="#8d6bff" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${path} L580,122 L32,122 Z" fill="url(#fade)"/><path d="${path}" stroke="#b69cff" stroke-width="2.5" fill="none"/>${ticks}</svg>`;
}
function overview() {
  renderDashboard({ data, location, demo, onPick: selectLocation, toast });
}
function dayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: data.timezone }).format(new Date());
}
function routine() {
  $('#view').innerHTML =
    `<div class="status-strip">⌖ ${esc(location.name)} · ${esc(data.plan.category.label)} · ${profile.children || profile.older || profile.sensitive ? 'Extra care for sensitive household members' : 'General household guidance'}${demo ? ' · Demo scenario' : ''}</div><div class="routine-grid">${data.plan.items.map((x) => `<article class="card routine-card"><div class="routine-meta"><span>◷ ${esc(x.time)}</span><span class="pill">${esc(x.tag)}</span></div><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p><div class="impact-explanation"><strong>Why this helps</strong><br>${esc(x.impact)}</div><label class="done-row"><input type="checkbox" data-routine="${x.id}" ${checks[dayKey() + x.id] ? 'checked' : ''}> I’ve done this today</label></article>`).join('')}</div><div class="banner"><div><h3>A plan you can take with you.</h3><p>Save your routine or share it with your household. Forecasts can change.</p></div><div class="export-row"><button class="button secondary" id="export-plan">Download plan</button><button class="button" id="print-plan">Print</button></div></div>`;
  document.querySelectorAll('[data-routine]').forEach(
    (x) =>
      (x.onchange = () => {
        checks[dayKey() + x.dataset.routine] = x.checked;
        save('saans.checks', checks);
      }),
  );
  $('#print-plan').onclick = () => window.print();
  $('#export-plan').onclick = () => download('Saans-daily-plan.txt', planText());
}
const indoorTips = [
  [
    'sources',
    'Skip indoor smoke and incense',
    'Avoid smoking, candles and incense indoors. Reducing pollution at its source is the first step.',
    'Free habit',
  ],
  [
    'cook',
    'Capture cooking emissions',
    'Use an exhaust hood vented outdoors when cooking. Limit unnecessary high-heat frying and keep burners maintained.',
    'Source control',
  ],
  [
    'dust',
    'Damp-dust your surfaces',
    'Use a damp cloth or mop to limit resuspended dust. Avoid dry sweeping when practical.',
    'Low cost',
  ],
  [
    'filter',
    'Choose filtration that fits',
    'If buying a particle air cleaner, choose one sized for the room, follow filter maintenance instructions and avoid ozone-generating devices.',
    'Equipment',
  ],
  [
    'windows',
    'Check before you ventilate',
    'Outdoor air can dilute indoor pollutants but may add particles during smog. Ventilate when conditions improve and never compromise heat or combustion safety.',
    'Daily check',
  ],
  [
    'plants',
    'Keep plants for joy, not purification',
    'Houseplants do not replace source control, suitable filtration or ventilation. Outdoor AQI also cannot tell you the air quality inside your room.',
    'Myth check',
  ],
];
function indoor() {
  const count = indoorTips.filter((x) => checks['indoor-' + x[0]]).length;
  $('#view').innerHTML =
    `<div class="grid-bottom"><section><div class="card" style="margin-bottom:20px"><div class="card-head"><h2>Your cleaner-home checklist</h2><span class="pill">${count} / ${indoorTips.length} habits</span></div><div class="progress"><div style="width:${(count / indoorTips.length) * 100}%"></div></div><p class="fine">Progress tracks your selected habits, not a measured improvement in indoor air.</p></div><div class="checklist">${indoorTips.map(([id, title, body, tag]) => `<label class="check-item"><input type="checkbox" data-indoor="${id}" ${checks['indoor-' + id] ? 'checked' : ''}><div><h3>${title}</h3><p>${body}</p><span class="pill" style="margin-top:12px">${tag}</span></div></label>`).join('')}</div></section><aside><section class="card day-card"><div class="sparkle">⌂</div><h2>One room.<br>A good place to start.</h2><p>${profile.purifier ? 'Use your purifier in the room where your household spends the most time.' : 'Start with a room where your household spends the most time. Remove avoidable particle sources first.'}</p><p>There’s no indoor sensor connected. We won’t estimate an indoor AQI from the outdoor number.</p></section><section class="card" style="margin-top:20px"><h2>Read the evidence</h2><p class="muted">Practical guidance from public health and environmental sources.</p>${sources
      .slice(2)
      .map(
        (s) =>
          `<a class="source-link" href="${s.url}" target="_blank" rel="noreferrer">${s.name} ↗</a>`,
      )
      .join('')}</section></aside></div>`;
  document.querySelectorAll('[data-indoor]').forEach(
    (x) =>
      (x.onchange = () => {
        checks['indoor-' + x.dataset.indoor] = x.checked;
        save('saans.checks', checks);
        indoor();
      }),
  );
}
function modeOptions(selected) {
  return Object.entries({
    car: 'Solo car',
    bus: 'Bus',
    metro: 'Metro / rail',
    bike: 'Bicycle',
    walk: 'Walking',
  })
    .map(([id, n]) => `<option value="${id}" ${selected === id ? 'selected' : ''}>${n}</option>`)
    .join('');
}
function impactView() {
  $('#view').innerHTML =
    `<div class="grid-top"><section class="card"><div class="card-head"><h2>Reimagine your commute</h2><span class="pill">Scenario calculator</span></div><form id="impact-form" class="form-grid"><label>Total daily travel (km)<input id="km" type="number" value="${Number(profile.distance || 8) * 2}" min="0" max="200" step=".5" required></label><label>Travel days<input id="days" type="number" value="22" min="0" max="365" step="1" required></label><label>From<select id="from-mode">${modeOptions(profile.commute || 'car')}</select></label><label>To<select id="to-mode">${modeOptions('metro')}</select></label></form><div id="impact-bars"></div><p class="fine">Distance includes the return trip. Compare the same distance for both modes.</p></section><section class="card day-card"><p class="kicker">ESTIMATED SCENARIO DIFFERENCE</p><div id="impact-result"></div><p>This is a planning estimate, not measured emissions or a prediction of your city’s AQI.</p></section></div><section class="card" style="margin-top:22px"><h2>Transparent assumptions. No hidden magic.</h2><p class="muted">Illustrative factors chosen for this prototype, in kg CO₂e per passenger-kilometre. They are not official India-specific factors. Actual emissions depend on occupancy, vehicle, energy supply and operations. Walking and cycling count zero operational emissions here; lifecycle and dietary effects are excluded.</p><table><thead><tr><th>Mode</th><th>Assumed kg CO₂e / passenger-km</th></tr></thead><tbody>${Object.entries(
      { car: 0.18, bus: 0.08, metro: 0.04, bike: 0, walk: 0 },
    )
      .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v.toFixed(2)}</td></tr>`)
      .join(
        '',
      )}</tbody></table><p class="fine">Formula: total daily distance × travel days × (baseline factor − alternative factor). Changing travel mode cannot be translated into a personal AQI reduction.</p></section><div class="banner"><div><h3>Lower emissions, with exposure in mind.</h3><p>During heavy smog, consider enclosed public transit instead of outdoor cycling or walking.</p></div><button class="button secondary" data-go="routine">Check my routine ↗</button></div>`;
  $('#impact-form').oninput = updateImpact;
  updateImpact();
}
function updateImpact() {
  if (!$('#impact-form').checkValidity()) {
    $('#impact-result').innerHTML = '<p>Please enter a valid distance and number of days.</p>';
    return;
  }
  const r = impact(
      Number($('#km').value),
      Number($('#days').value),
      $('#from-mode').value,
      $('#to-mode').value,
    ),
    max = Math.max(r.baseline, r.alternative, 1);
  $('#impact-result').innerHTML =
    `<div class="stat-big">${Math.abs(r.saved).toFixed(1)}<small> kg CO₂e</small></div><strong>${r.saved >= 0 ? 'potentially avoided' : 'additional emissions'}</strong><p>Across ${r.km.toFixed(0)} passenger-kilometres in this scenario.</p>`;
  $('#impact-bars').innerHTML = [
    ['Current', r.baseline],
    ['Alternative', r.alternative],
  ]
    .map(
      ([n, v]) =>
        `<div class="bar-compare"><span>${n}</span><div class="bar-track"><div style="width:${(v / max) * 100}%"></div></div><strong>${v.toFixed(1)} kg</strong></div>`,
    )
    .join('');
}
const actions = [
  [
    'idle',
    'Make the school gate idle-free',
    'Switch off parked engines where safe and permitted. Invite your school community to keep pickup areas clearer of exhaust.',
    '↗',
  ],
  [
    'share',
    'Share a ride, skip an extra trip',
    'Coordinate an existing commute or combine errands. Ask your neighbours which trips you already have in common.',
    '♧',
  ],
  [
    'burn',
    'Keep waste out of the fire',
    'Avoid burning leaves and rubbish. Follow local collection rules and share alternatives with your housing community.',
    '⌂',
  ],
];
function community() {
  $('#view').innerHTML =
    `<div class="status-strip">Your pledges are stored on this device. This local prototype does not publish posts or show invented community counts.</div><div class="routine-grid">${actions.map(([id, title, body, icon]) => `<article class="card pledge"><span class="action-icon">${icon}</span><h3>${title}</h3><p>${body}</p><button class="button ${pledges[id] ? 'secondary' : ''}" data-pledge="${id}">${pledges[id] ? '✓ Pledged · undo' : 'Make this my pledge'}</button></article>`).join('')}<article class="card day-card"><div class="sparkle">✧</div><h2>A useful conversation starter.</h2><p>Copy a short air-quality brief for your household or neighbourhood group.</p><button class="button" id="copy-brief">Copy today’s brief ↗</button></article></div><div class="banner"><div><h3>${actions.filter((x) => pledges[x[0]]).length} personal pledges. One shared intention.</h3><p>Pledges are commitments, not verified emission reductions.</p></div></div>`;
  document.querySelectorAll('[data-pledge]').forEach(
    (x) =>
      (x.onclick = () => {
        pledges[x.dataset.pledge] = !pledges[x.dataset.pledge];
        save('saans.pledges', pledges);
        community();
      }),
  );
  $('#copy-brief').onclick = async () => {
    try {
      await navigator.clipboard.writeText(planText());
      toast('Brief copied. Share it wherever you choose.');
    } catch {
      download('Saans-community-brief.txt', planText());
    }
  };
}
function assistant() {
  const status = health?.ai?.available
    ? `${health.ai.provider} · ${health.ai.model}`
    : 'Built-in guidance · AI not connected';
  $('#view').innerHTML =
    `<div class="assistant-layout"><section class="card chat-card"><div class="chat-head"><span class="action-icon">✧</span><div><h2>Ask Saans</h2><span class="small-label">${esc(status)}</span></div></div><div id="chat-messages" class="chat-messages" role="log" aria-live="polite"></div><form class="chat-input" id="chat-form"><textarea id="question" aria-label="Your question" placeholder="Can we go for a walk this evening?" maxlength="2000" required rows="2"></textarea><button class="button" id="send-chat" ${sending ? 'disabled' : ''}>${sending ? 'Thinking…' : 'Send ↗'}</button></form></section><aside><section class="card"><p class="eyebrow">START SOMEWHERE SIMPLE</p><h2>Make it about your day.</h2>${['Can my children play outside today?', 'When should I open my windows?', 'How can I make my commute cleaner?', 'Explain today’s air quality in Hindi.'].map((q) => `<button class="suggestion" data-question="${esc(q)}">${esc(q)} ↗</button>`).join('')}<p class="fine">The assistant receives the selected location, forecast and household settings. With Ollama, generation stays on your computer. A configured cloud provider receives that context.</p></section><p class="source-summary">For everyday planning, not diagnosis. Check official local advisories. Forecasts are model estimates and may differ from a nearby monitor.</p><button class="text-button" id="clear-chat">Clear conversation</button></aside></div>`;
  renderMessages();
  $('#chat-form').onsubmit = sendChat;
  document.querySelectorAll('[data-question]').forEach(
    (x) =>
      (x.onclick = () => {
        $('#question').value = x.dataset.question;
        $('#question').focus();
      }),
  );
  $('#clear-chat').onclick = () => {
    if (!sending) {
      messages = [];
      renderMessages();
    }
  };
}
function renderMessages() {
  if (!$('#chat-messages')) return;
  $('#chat-messages').innerHTML = messages.length
    ? messages
        .map(
          (m) =>
            `<div class="message ${m.role === 'user' ? 'user' : ''}">${esc(m.content)}${m.label ? `<span class="message-meta">${esc(m.label)}</span>` : ''}</div>`,
        )
        .join('')
    : '<div class="message">Hello, I’m Saans. Ask me about the air outside, a cleaner home, or a daily routine for your household.<span class="message-meta">Choose a question or write your own.</span></div>';
  $('#chat-messages').scrollTop = $('#chat-messages').scrollHeight;
}
async function sendChat(e) {
  e.preventDefault();
  if (sending) return;
  const q = $('#question').value.trim();
  if (!q) return;
  const chatContext = requestId;
  const history = messages.map((m) => ({ role: m.role, content: m.content }));
  messages.push({ role: 'user', content: q });
  $('#question').value = '';
  sending = true;
  $('#send-chat').disabled = true;
  $('#send-chat').textContent = 'Thinking…';
  renderMessages();
  try {
    const d = await api('/api/chat', { ...payload(), question: q, history });
    if (chatContext !== requestId) return;
    messages.push({
      role: 'assistant',
      content: (d.notice ? d.notice + '\n\n' : '') + d.text,
      label:
        d.mode === 'ai'
          ? `AI-generated · ${d.model} · review with local advisories`
          : 'Built-in guidance · not an AI-generated response',
    });
  } catch (e) {
    if (chatContext !== requestId) return;
    messages.push({
      role: 'assistant',
      content: 'I couldn’t get an answer: ' + e.message,
      label: 'Connection issue',
    });
  } finally {
    sending = false;
    if ($('#send-chat')) {
      $('#send-chat').disabled = false;
      $('#send-chat').textContent = 'Send ↗';
      renderMessages();
    }
  }
}
function planText() {
  return (
    `SAANS · DAILY AIR BRIEF\n${location.name} · ${new Date().toLocaleString('en-IN', { timeZone: data.timezone })}\n${demo ? 'DEMO DATA — not current conditions' : 'Modelled forecast from Open-Meteo / CAMS'}\nUS AQI: ${num(data.current.us_aqi)} (${data.plan.category.label}). Not India NAQI.\n\n` +
    data.plan.items.map((x) => `${x.time} — ${x.title}\n${x.body}\nWhy: ${x.impact}`).join('\n\n') +
    '\n\nCheck local official advisories. Outdoor forecasts do not measure indoor air.\nSources:\n' +
    sources.map((x) => x.url).join('\n')
  );
}
function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function openProfile() {
  const f = $('#profile-form');
  for (const [k, v] of Object.entries(profile)) {
    const el = f.elements.namedItem(k);
    if (el) {
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = v;
    }
  }
  $('#profile-dialog').showModal();
}
$('#profile-open').onclick = openProfile;
$('#profile-button').onclick = openProfile;
$('#profile-form').onsubmit = (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  profile = {
    children: f.has('children'),
    older: f.has('older'),
    sensitive: f.has('sensitive'),
    purifier: f.has('purifier'),
    commute: f.get('commute'),
    distance: Number(f.get('distance')),
    start: Number(f.get('start')),
    end: Number(f.get('end')),
    budget: f.get('budget'),
  };
  save('saans.profile', profile);
  $('#profile-dialog').close();
  messages = [];
  load();
};
$('.close-dialog');
document
  .querySelectorAll('.close-dialog')
  .forEach((b) => (b.onclick = () => b.closest('dialog').close()));
$('#sources-open').onclick = () => {
  $('#methodology').innerHTML =
    '<p class="muted">Air quality comes from Open-Meteo using Copernicus CAMS atmospheric modelling. Values are forecasts on a model grid, not measurements from a sensor at your home. We display US AQI explicitly; it is not India’s National AQI. All times use the selected location’s time zone.</p><p class="muted">Live requests are cached for up to 10 minutes. Demo mode is opt-in and uses illustrative values. Missing values remain unavailable. Forecast error, local traffic and indoor sources can change actual exposure.</p><p class="muted">Personal plans use transparent household rules. The assistant uses a configured language model when available, otherwise it labels built-in guidance. Travel impact uses illustrative factors with the formula shown in My impact.</p>' +
    sources
      .map(
        (s) =>
          `<a class="source-link" target="_blank" rel="noreferrer" href="${s.url}">${s.name} ↗</a>`,
      )
      .join('');
  $('#sources-dialog').showModal();
};
$('#refresh').onclick = load;
$('#demo').onchange = (e) => {
  demo = e.target.checked;
  messages = [];
  load();
};
let geoWatch = null,
  lastGeoUpdate = 0;
function stopFollowing() {
  if (geoWatch !== null) {
    navigator.geolocation.clearWatch(geoWatch);
    geoWatch = null;
  }
  $('#follow-location').checked = false;
}
function selectLocation(next, fromGPS = false) {
  if (!fromGPS) stopFollowing();
  location = {
    name: next.name,
    latitude: Number(next.latitude),
    longitude: Number(next.longitude),
  };
  save('saans.location', location);
  demo = false;
  $('#demo').checked = false;
  messages = [];
  $('#search-results').innerHTML = '';
  $('#city-search').value = '';
  load();
}
$('#search-form').onsubmit = async (e) => {
  e.preventDefault();
  const b = e.target.querySelector('button');
  b.disabled = true;
  $('#search-results').textContent = 'Finding cities…';
  try {
    const d = await api('/api/search?q=' + encodeURIComponent($('#city-search').value.trim()));
    $('#search-results').innerHTML = d.results.length
      ? d.results
          .map(
            (x, i) =>
              `<button class="search-result" data-city="${i}">${esc([x.name, x.admin1, x.country].filter(Boolean).join(', '))} ↗</button>`,
          )
          .join('')
      : 'No matching cities. Try a nearby city or a different spelling.';
    document.querySelectorAll('[data-city]').forEach(
      (x) =>
        (x.onclick = () => {
          const c = d.results[Number(x.dataset.city)];
          selectLocation({
            name: [c.name, c.admin1, c.country].filter(Boolean).join(', '),
            latitude: c.latitude,
            longitude: c.longitude,
          });
        }),
    );
  } catch (err) {
    $('#search-results').textContent = err.message;
  } finally {
    b.disabled = false;
  }
};
function geoResult(pos, follow = false) {
  $('#locate').disabled = false;
  const lat = pos.coords.latitude,
    lon = pos.coords.longitude;
  const distance = Math.hypot(
    (lat - location.latitude) * 111,
    (lon - location.longitude) * 111 * Math.cos((lat * Math.PI) / 180),
  );
  if (follow && lastGeoUpdate && distance < 1 && Date.now() - lastGeoUpdate < 600000) return;
  if (follow && Date.now() - lastGeoUpdate < 30000) return;
  lastGeoUpdate = Date.now();
  selectLocation(
    { name: `My location (${lat.toFixed(3)}, ${lon.toFixed(3)})`, latitude: lat, longitude: lon },
    true,
  );
}
function geoError() {
  notice(
    'Location access was unavailable. Allow location permission in your browser, or search a city / click the world map.',
  );
  $('#locate').disabled = false;
  stopFollowing();
}
$('#locate').onclick = () => {
  if (!navigator.geolocation) return geoError();
  $('#locate').disabled = true;
  navigator.geolocation.getCurrentPosition((p) => geoResult(p), geoError, {
    timeout: 15000,
    maximumAge: 60000,
  });
};
$('#follow-location').onchange = (e) => {
  if (!e.target.checked) return stopFollowing();
  if (!navigator.geolocation) return geoError();
  lastGeoUpdate = 0;
  geoWatch = navigator.geolocation.watchPosition((p) => geoResult(p, true), geoError, {
    timeout: 15000,
    maximumAge: 60000,
    enableHighAccuracy: false,
  });
};
window.addEventListener('hashchange', () => {
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
});
api('/api/health')
  .then((d) => {
    health = d;
    $('.local-pill').innerHTML =
      '<i></i> ' + (d.runtime === 'hosted' ? 'Hosted app' : 'Runs locally');
    if (route() === 'assistant' && !busy) render();
  })
  .catch(() => {});
load();
