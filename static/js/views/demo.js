// Guided hackathon demo. Everything here runs on built-in data with zero network calls.
import { store } from '../store.js';
import { $, $$, esc, toast, md, money } from '../ui.js';
import { DEMO_TRIPS, DEMO_CHAT_SCRIPT, DEMO_LENS } from '../demo-data.js';
import { signals } from '../recommender.js';

const STEPS = [
  ['🗺️', 'AI itinerary', 'Open a full Jaipur or Goa plan: timeline, map, budget donut, packing list & phrasebook. Try drag-to-reorder and “Regenerate day”.', 'trip'],
  ['📷', 'Travel Lens (Gemma 4 vision)', 'Identify the Taj Mahal, a street-food dish, or read & translate a Hindi signboard.', '#/lens'],
  ['📍', 'Nearby places', 'Real OpenStreetMap places around India Gate, ranked and described by Gemma.', '#/nearby'],
  ['✨', 'Destination quiz', 'Six playful questions → traveller persona + matched destinations.', '#/discover'],
  ['💜', 'Recommendation engine', 'On-device content scoring + MMR diversity, re-ranked & explained by Gemma 4.', '#/foryou'],
  ['💬', 'Travel buddy chat', 'Streaming, multilingual assistant grounded in your trip.', '#/chat'],
];

export function render(el) {
  const demoOn = store.settings.demo;
  el.innerHTML = `
    <section class="hero" style="padding:36px">
      <div class="hero-pill">🎬 Demo showcase · works 100% offline</div>
      <h1>Wanderly in 2 minutes</h1>
      <p>Every feature below runs on built-in sample data, so the demo works even if the hackathon Wi-Fi doesn’t. Flip one switch to go back to live Gemma 4.</p>
      <div class="row" style="margin-top:18px">
        <button class="btn btn-white btn-lg" id="demo-on" style="background:#fff;color:#3d2db8">${demoOn ? '✅ Demo mode is ON' : '🎬 Turn on Demo mode'}</button>
        <button class="btn btn-ghost" id="seed">🌱 Seed sample profile & trips</button>
      </div>
    </section>

    <div class="section-head"><h2>Guided tour</h2><span class="small muted">Click any step</span></div>
    <div class="grid grid-2">
      ${STEPS.map(([ic, t, d, href], i) => `
        <div class="card card-hover demo-step" data-step="${i}">
          <div class="n">${ic}</div>
          <div><b>${i + 1}. ${t}</b><p class="small muted" style="margin:4px 0 0">${d}</p>
            ${href === 'trip' ? `<div class="row" style="margin-top:10px">
              <button class="btn btn-sm btn-primary" data-trip="jaipur">🏰 Jaipur, 3 days</button>
              <button class="btn btn-sm btn-ghost" data-trip="goa">🏖️ Goa, 4 days</button></div>` : ''}
          </div>
        </div>`).join('')}
    </div>

    <div class="section-head"><h2>Sample itineraries</h2></div>
    <div class="grid grid-2">
      ${Object.entries(DEMO_TRIPS).map(([k, t]) => `
        <div class="card">
          <div class="row between"><h3 style="margin:0">${esc(t.title)}</h3><span class="tag amber">${money(t.budget.total, t.currency)}</span></div>
          <p class="small muted">${esc(t.summary)}</p>
          ${t.days.map(d => `<div class="small" style="margin:4px 0"><b>Day ${d.day}</b> · ${esc(d.theme)} <span class="muted">(${d.items.length} stops)</span></div>`).join('')}
          <button class="btn btn-sm btn-primary" style="margin-top:10px" data-trip="${k}">Open itinerary →</button>
        </div>`).join('')}
    </div>

    <div class="section-head"><h2>Lens results preview</h2></div>
    <div class="grid grid-3">
      ${DEMO_LENS.map(s => `
        <a class="card card-hover dest-card" href="#/lens">
          <img src="${s.image}" alt="${esc(s.label)}" style="height:150px;object-fit:cover;width:100%">
          <div class="dest-body"><b>${esc(s.data.name)}</b><div class="small muted">${esc(s.data.summary)}</div>
          <span class="tag">${s.data.confidence}% confidence</span></div>
        </a>`).join('')}
    </div>

    <div class="section-head"><h2>Chat replay</h2><button class="btn btn-sm btn-ghost" id="replay">▶ Replay</button></div>
    <div class="card"><div class="chat-log" id="replay-log" style="max-height:none"></div></div>

    <div class="section-head"><h2>Why Gemma 4?</h2></div>
    <div class="grid grid-4">
      ${[
        ['👁️', 'Multimodal', 'Native image understanding powers Travel Lens: landmarks, food, signs & OCR.'],
        ['🧩', 'Structured output', 'Reliable JSON itineraries, rankings and toolkits rendered straight into UI.'],
        ['🌏', 'Multilingual', 'Plans, chat and translations in 10+ languages, including Hindi & Tamil.'],
        ['🔓', 'Open weights', 'Runs on AI Studio, OpenRouter, or self-hosted. No lock-in, free tiers.'],
      ].map(([ic, t, d]) => `<div class="card feature-card"><div class="feature-ic">${ic}</div><b>${t}</b><p class="small muted" style="margin:0">${d}</p></div>`).join('')}
    </div>`;

  $('#demo-on', el).onclick = () => {
    store.setSettings({ demo: true });
    toast('🎬 Demo mode on');
    render(el);
  };
  $('#seed', el).onclick = () => {
    signals.quiz({ vibe: 'Living history', activity: 'A food crawl' }, ['heritage', 'food', 'art', 'heritage'], 2);
    signals.like({ name: 'Udaipur', tags: ['heritage', 'relaxation', 'art'] });
    signals.like({ name: 'Kyoto', tags: ['heritage', 'spiritual', 'food', 'art'] });
    for (const k of Object.keys(DEMO_TRIPS)) {
      if (!store.trips.some(t => t.title === DEMO_TRIPS[k].title)) {
        store.saveTrip({ ...structuredClone(DEMO_TRIPS[k]), meta: { provider: 'Demo data', model: 'offline', demo: true } });
      }
    }
    toast('Seeded 2 trips + a taste profile 🌱');
  };
  $$('[data-trip]', el).forEach(b => b.onclick = e => {
    e.stopPropagation();
    store.draft = { ...structuredClone(DEMO_TRIPS[b.dataset.trip]), meta: { provider: 'Demo data', model: 'offline', demo: true } };
    location.hash = '#/trip/draft';
  });
  $$('[data-step]', el).forEach(c => c.onclick = () => {
    const href = STEPS[+c.dataset.step][3];
    if (href !== 'trip') {
      if (!store.settings.demo) { store.setSettings({ demo: true }); toast('🎬 Demo mode switched on for the tour'); }
      location.hash = href;
    }
  });

  let replayTimer = null;
  const replay = async () => {
    const log = $('#replay-log', el);
    if (!log) return;
    log.innerHTML = '';
    clearTimeout(replayTimer);
    for (const m of DEMO_CHAT_SCRIPT) {
      if (!log.isConnected) return;
      const b = document.createElement('div');
      b.className = `msg ${m.role === 'user' ? 'user' : 'bot'}`;
      log.appendChild(b);
      if (m.role === 'user') {
        b.textContent = m.content;
        await new Promise(r => { replayTimer = setTimeout(r, 600); });
      } else {
        let acc = '';
        for (const w of m.content.split(/(\s+)/)) {
          if (!log.isConnected) return;
          acc += w;
          b.innerHTML = md(acc);
          await new Promise(r => { replayTimer = setTimeout(r, 22); });
        }
        await new Promise(r => { replayTimer = setTimeout(r, 500); });
      }
    }
  };
  $('#replay', el).onclick = replay;
  replay();
  return () => clearTimeout(replayTimer);
}
