import { store } from '../store.js';
import { post } from '../api.js';
import { $, $$, esc, loader, errorCard, toast } from '../ui.js';
import { DEMO_TRIPS } from '../demo-data.js';
import { signals } from '../recommender.js';
import { demoBanner } from '../components.js';

const INTERESTS = [
  ['heritage', '🏰 History'], ['food', '🍜 Food'], ['nature', '🌿 Nature'], ['adventure', '🧗 Adventure'],
  ['beach', '🏖️ Beaches'], ['spiritual', '🛕 Spiritual'], ['shopping', '🛍️ Shopping'], ['nightlife', '🌃 Nightlife'],
  ['art', '🎨 Art & museums'], ['relaxation', '🧘 Relaxation'], ['wildlife', '🐅 Wildlife'], ['mountains', '🏔️ Mountains'],
];
const LANGS = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Japanese', 'Tamil', 'Bengali', 'Marathi', 'Arabic'];

export function demoTripFor(dest = '') {
  const t = /goa|beach|panaji|baga/i.test(dest) ? DEMO_TRIPS.goa : DEMO_TRIPS.jaipur;
  return t;
}

export function render(el, { query }) {
  const s = store.settings;
  const today = new Date().toISOString().slice(0, 10);
  const prefill = query.get('dest') || '';

  el.innerHTML = `
    ${demoBanner('Demo mode: you’ll get a sample Jaipur or Goa itinerary.')}
    <div class="split">
      <form class="card pad-lg stack" id="plan-form" style="gap:18px">
        <div>
          <h2 style="margin-bottom:4px">Where are you headed? ✈️</h2>
          <p class="muted small" style="margin:0">Gemma 4 builds a day-by-day plan with real places, timings, costs and a map.</p>
        </div>
        <div class="field">
          <label for="dest">Destination</label>
          <input class="input" id="dest" required placeholder="e.g. Jaipur, Rajasthan" value="${esc(prefill)}" autocomplete="off">
          <div class="chips" id="quick-dest">
            ${['Jaipur', 'Goa', 'Kyoto', 'Manali', 'Bali', 'Paris'].map(d => `<span class="chip" data-d="${d}">${d}</span>`).join('')}
          </div>
        </div>
        <div class="grid grid-3">
          <div class="field"><label for="start">Start date</label><input class="input" type="date" id="start" min="${today}"></div>
          <div class="field"><label for="days">Days: <b id="days-val">3</b></label><input type="range" id="days" min="1" max="10" value="3"></div>
          <div class="field"><label for="travelers">Travellers</label><input class="input" type="number" id="travelers" min="1" max="20" value="2"></div>
        </div>
        <div class="grid grid-2">
          <div class="field"><label for="budget">Total budget (optional)</label>
            <div class="row" style="flex-wrap:nowrap">
              <select class="input" id="currency" style="width:96px">${['INR', 'USD', 'EUR', 'GBP', 'JPY'].map(c => `<option ${c === s.currency ? 'selected' : ''}>${c}</option>`).join('')}</select>
              <input class="input" type="number" id="budget" min="0" step="500" placeholder="e.g. 40000">
            </div>
          </div>
          <div class="field"><label for="lang">Plan language</label>
            <select class="input" id="lang">${LANGS.map(l => `<option ${l === s.language ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        </div>
        <div class="field"><label>Interests</label>
          <div class="chips" id="interests">${INTERESTS.map(([k, l]) => `<span class="chip" data-k="${k}">${l}</span>`).join('')}</div>
        </div>
        <div class="grid grid-2">
          <div class="field"><label>Pace</label>
            <div class="segmented" id="pace">${['relaxed', 'balanced', 'packed'].map(p => `<button type="button" data-v="${p}" class="${p === 'balanced' ? 'on' : ''}">${p}</button>`).join('')}</div></div>
          <div class="field"><label>Style</label>
            <div class="segmented" id="style">${['budget', 'mid-range', 'luxury'].map(p => `<button type="button" data-v="${p}" class="${p === 'mid-range' ? 'on' : ''}">${p}</button>`).join('')}</div></div>
        </div>
        <div class="field"><label for="notes">Anything else? (diet, kids, accessibility, must-sees)</label>
          <textarea class="input" id="notes" rows="2" placeholder="Vegetarian, travelling with a 6-year-old, want one sunrise spot…"></textarea></div>
        <button class="btn btn-hero btn-lg" type="submit">✨ Generate itinerary</button>
      </form>
      <div id="plan-side" class="stack sticky">
        <div class="card">
          <h3>What you’ll get</h3>
          <ul class="list-clean">
            <li>Day-by-day timeline with real places & timings</li>
            <li>Interactive map with numbered stops</li>
            <li>Budget breakdown & 7-day weather</li>
            <li>Packing list, phrasebook & etiquette</li>
            <li>Drag to reorder, regenerate any day</li>
            <li>Save offline, share via link, print as PDF</li>
          </ul>
        </div>
        <div class="card">
          <h3>No internet? 🎬</h3>
          <p class="small muted">Open a ready-made itinerary instantly.</p>
          <div class="row">
            <button class="btn btn-ghost btn-sm" data-sample="jaipur">🏰 Jaipur, 3 days</button>
            <button class="btn btn-ghost btn-sm" data-sample="goa">🏖️ Goa, 4 days</button>
          </div>
        </div>
      </div>
    </div>`;

  const form = $('#plan-form', el);
  const daysInput = $('#days', el);
  daysInput.oninput = () => { $('#days-val', el).textContent = daysInput.value; };
  $$('#quick-dest .chip', el).forEach(c => c.onclick = () => { $('#dest', el).value = c.dataset.d; });
  $$('#interests .chip', el).forEach(c => c.onclick = () => c.classList.toggle('on'));
  for (const id of ['pace', 'style']) {
    $$(`#${id} button`, el).forEach(b => b.onclick = () => {
      $$(`#${id} button`, el).forEach(x => x.classList.toggle('on', x === b));
    });
  }
  $$('[data-sample]', el).forEach(b => b.onclick = () => openTrip(DEMO_TRIPS[b.dataset.sample], { provider: 'Demo data', model: 'offline', demo: true }));

  form.onsubmit = async e => {
    e.preventDefault();
    const body = {
      destination: $('#dest', el).value.trim(),
      days: +daysInput.value,
      start_date: $('#start', el).value || null,
      travelers: +$('#travelers', el).value || 2,
      budget: +$('#budget', el).value || null,
      currency: $('#currency', el).value,
      interests: $$('#interests .chip.on', el).map(c => c.dataset.k),
      pace: $('#pace .on', el).dataset.v,
      style: $('#style .on', el).dataset.v,
      notes: $('#notes', el).value.trim(),
      language: $('#lang', el).value,
    };
    if (!body.destination) return;
    store.setSettings({ currency: body.currency, language: body.language });
    signals.interests(body.interests, 2);
    await generate(el, body);
  };
}

async function generate(el, body) {
  const box = el.querySelector('.split');
  const stop = loader(box, [
    `Researching ${body.destination}…`, 'Picking must-see places…', 'Grouping stops by neighbourhood…',
    'Finding great local food…', 'Estimating costs…', `Mapping all ${body.days} days…`,
  ], '🗺️');
  try {
    const res = await post('/api/itinerary', body, () => demoTripFor(body.destination));
    stop();
    if (!res.data?.days?.length) throw new Error('Gemma returned an itinerary without days. Please try again.');
    openTrip(res.data, res, body);
  } catch (err) {
    stop();
    errorCard(box, err, () => openTrip(demoTripFor(body.destination), { provider: 'Demo data', model: 'offline', demo: true }, body));
    const retry = document.createElement('button');
    retry.className = 'btn btn-ghost';
    retry.textContent = '↻ Try again';
    retry.onclick = () => generate(el, body);
    box.querySelector('.row')?.prepend(retry);
  }
}

function openTrip(data, meta, request) {
  const trip = structuredClone(data);
  trip.meta = { provider: meta.provider, model: meta.model, demo: !!meta.demo, latency_ms: meta.latency_ms };
  if (request) trip.request = request;
  delete trip.id;
  store.draft = trip;
  toast(meta.demo ? 'Loaded sample itinerary' : 'Your itinerary is ready ✨');
  location.hash = '#/trip/draft';
}
