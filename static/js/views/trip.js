import { store } from '../store.js';
import { post, get, isDemo } from '../api.js';
import {
  $, $$, esc, money, toast, renderMap, weatherIcon, TYPE_EMOJI, emptyState, setTitle, errorCard, loader, showProvider,
} from '../ui.js';
import { demoToolkit } from '../demo-data.js';
import { demoBanner } from '../components.js';

const BUDGET_COLORS = { stay: '#7b61ff', food: '#ff6a4d', transport: '#0ea5e9', activities: '#12a571', misc: '#e69a00' };

export function encodeTrip(trip) {
  const { id, savedAt, toolkit, ...rest } = trip;
  return btoa(unescape(encodeURIComponent(JSON.stringify(rest)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeTrip(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(escape(atob(b64))));
}

export async function render(el, { arg, name }) {
  let trip;
  try {
    trip = name === 'share' ? decodeTrip(arg) : arg === 'draft' ? store.draft : store.getTrip(arg);
  } catch {
    trip = null;
  }
  if (!trip?.days?.length) {
    el.innerHTML = emptyState('🧭', 'Trip not found', 'It may have been deleted, or the link is broken.',
      '<a class="btn btn-primary" href="#/plan">Plan a new trip</a>');
    return;
  }
  if (trip.meta) showProvider(trip.meta);
  setTitle(trip.title || 'Trip');
  const state = { day: 0, tab: 'itinerary' };
  const isSaved = () => !!(trip.id && store.getTrip(trip.id));
  const persist = () => { if (isSaved()) store.saveTrip(trip); else if (name !== 'share') store.draft = trip; };

  el.innerHTML = `
    ${trip.meta?.demo ? demoBanner('This itinerary is sample data from Demo mode.') : ''}
    <section class="trip-header">
      <div style="flex:1;min-width:260px">
        <div class="chips" style="margin-bottom:8px">${(trip.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        <h1 style="font-size:clamp(1.5rem,3vw,2.1rem)">${esc(trip.title)}</h1>
        <p class="muted" style="max-width:720px">${esc(trip.summary || '')}</p>
      </div>
      <div class="row no-print">
        <button class="btn btn-primary" id="save-btn"></button>
        <button class="btn btn-ghost" id="share-btn" title="Copy share link">🔗 Share</button>
        <button class="btn btn-ghost" id="print-btn" title="Print or save as PDF">🖨️</button>
        <a class="btn btn-ghost" href="#/chat?trip=${esc(trip.id || 'draft')}" title="Ask the travel buddy about this trip">💬 Ask</a>
      </div>
    </section>

    <div class="grid grid-4 stats-grid" style="margin:18px 0">
      <div class="card stat"><b>${trip.days.length}</b><span>days</span></div>
      <div class="card stat"><b id="stop-count"></b><span>stops planned</span></div>
      <div class="card stat"><b>${money(trip.budget?.total, trip.currency)}</b><span>estimated total</span></div>
      <div class="card stat"><b style="font-size:1rem;line-height:1.35">${esc(trip.best_time || '—')}</b><span>best time to visit</span></div>
    </div>

    <div class="tabs no-print" role="tablist">
      <button data-tab="itinerary" class="on">🗺️ Itinerary</button>
      <button data-tab="budget">💰 Budget</button>
      <button data-tab="toolkit">🎒 Packing & phrases</button>
      <button data-tab="tips">💡 Tips</button>
    </div>
    <div id="tab-body"></div>
  `;

  const saveBtn = $('#save-btn', el);
  const paintSave = () => { saveBtn.textContent = isSaved() ? '✓ Saved' : '💾 Save trip'; };
  paintSave();
  saveBtn.onclick = () => {
    if (isSaved()) { toast('Already in My trips'); return; }
    trip = store.saveTrip(trip);
    paintSave();
    toast('Trip saved to My trips');
    if (location.hash !== `#/trip/${trip.id}`) history.replaceState(null, '', `#/trip/${trip.id}`);
  };
  $('#share-btn', el).onclick = async () => {
    const url = `${location.origin}/#/share/${encodeTrip(trip)}`;
    try {
      if (navigator.share && /Mobi/i.test(navigator.userAgent)) await navigator.share({ title: trip.title, url });
      else { await navigator.clipboard.writeText(url); toast('Share link copied 📋'); }
    } catch { prompt('Copy this link', url); }
  };
  $('#print-btn', el).onclick = () => window.print();

  $$('.tabs button', el).forEach(b => b.onclick = () => {
    $$('.tabs button', el).forEach(x => x.classList.toggle('on', x === b));
    state.tab = b.dataset.tab;
    paint();
  });

  function paint() {
    $('#stop-count', el).textContent = trip.days.reduce((n, d) => n + (d.items?.length || 0), 0);
    const body = $('#tab-body', el);
    if (state.tab === 'itinerary') paintItinerary(body);
    else if (state.tab === 'budget') paintBudget(body);
    else if (state.tab === 'toolkit') paintToolkit(body);
    else paintTips(body);
  }

  // ------------------------------------------------------------ itinerary
  function paintItinerary(body) {
    const days = state.day === 0 ? trip.days : [trip.days[state.day - 1]];
    body.innerHTML = `
      <div class="split">
        <div class="stack">
          <div class="day-tabs no-print">
            <button class="day-tab ${state.day === 0 ? 'on' : ''}" data-day="0">All days</button>
            ${trip.days.map((d, i) => `<button class="day-tab ${state.day === i + 1 ? 'on' : ''}" data-day="${i + 1}">Day ${d.day}</button>`).join('')}
          </div>
          ${days.map(d => dayBlock(d)).join('')}
        </div>
        <div class="stack sticky">
          <div class="map" id="trip-map"></div>
          <div class="card" style="padding:14px">
            <div class="row between" style="margin-bottom:8px"><h3 style="margin:0">Weather</h3><span class="tiny muted">7-day forecast · Open-Meteo</span></div>
            <div class="weather-strip" id="weather"><div class="skeleton" style="height:84px;flex:1"></div></div>
          </div>
        </div>
      </div>`;

    $$('.day-tab', body).forEach(b => b.onclick = () => { state.day = +b.dataset.day; paint(); });
    $$('[data-regen]', body).forEach(b => b.onclick = () => regenDay(+b.dataset.regen, b));
    $$('[data-del]', body).forEach(b => b.onclick = () => {
      const [di, ii] = b.dataset.del.split(':').map(Number);
      const removed = trip.days[di].items.splice(ii, 1)[0];
      persist(); paint();
      toast(`Removed ${removed.title}`);
    });
    bindDrag(body);

    const points = days.flatMap(d => d.items.map((it, i) => ({
      lat: +it.lat, lng: +it.lng, title: it.title, type: it.type,
      sub: `Day ${d.day} · ${it.time}`, label: state.day === 0 ? d.day : i + 1,
    })));
    renderMap($('#trip-map', body), points, { center: trip.center, route: state.day !== 0 });
    loadWeather($('#weather', body));
  }

  function dayBlock(d) {
    const di = trip.days.indexOf(d);
    const dayCost = d.items.reduce((s, it) => s + (+it.cost || 0), 0);
    return `
      <div class="card" data-dayblock="${di}">
        <div class="row between" style="margin-bottom:14px">
          <div><div class="tiny muted" style="font-weight:700;letter-spacing:.06em">DAY ${d.day}</div>
          <h3 style="margin:0">${esc(d.theme || '')}</h3></div>
          <div class="row no-print">
            <span class="tag plain">${money(dayCost, trip.currency)}</span>
            <button class="btn btn-sm btn-ghost" data-regen="${di}" title="Ask Gemma for a fresh plan for this day">🔄 Regenerate</button>
          </div>
        </div>
        <div class="timeline" data-day="${di}">
          ${d.items.map((it, ii) => `
            <div class="tl-item" draggable="true" data-type="${esc(it.type)}" data-idx="${ii}">
              <div class="tl-num">${ii + 1}</div>
              <div class="tl-card">
                <div class="row between" style="gap:6px">
                  <div class="row" style="gap:8px"><span class="drag-handle no-print" title="Drag to reorder">⋮⋮</span>
                  <b>${TYPE_EMOJI[it.type] || '📍'} ${esc(it.title)}</b></div>
                  <button class="btn btn-sm btn-ghost btn-icon no-print" style="width:28px;height:28px" data-del="${di}:${ii}" title="Remove stop">✕</button>
                </div>
                <div class="tl-meta" style="margin:4px 0 6px">
                  <span>🕒 ${esc(it.time)}</span><span>⏱ ${fmtDur(it.duration_min)}</span>
                  <span>${+it.cost ? '💰 ' + money(it.cost, trip.currency) : '🆓 Free'}</span>
                </div>
                <div class="small muted">${esc(it.description || '')}</div>
                ${it.tip ? `<div class="tl-tip">💡 ${esc(it.tip)}</div>` : ''}
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  function bindDrag(body) {
    let from = null;
    $$('.timeline', body).forEach(tl => {
      const di = +tl.dataset.day;
      $$('.tl-item', tl).forEach(item => {
        item.addEventListener('dragstart', e => { from = { di, ii: +item.dataset.idx }; item.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
        item.addEventListener('dragend', () => { item.classList.remove('dragging'); $$('.drop-target', body).forEach(x => x.classList.remove('drop-target')); });
        item.addEventListener('dragover', e => { if (from?.di === di) { e.preventDefault(); item.classList.add('drop-target'); } });
        item.addEventListener('dragleave', () => item.classList.remove('drop-target'));
        item.addEventListener('drop', e => {
          e.preventDefault();
          if (!from || from.di !== di) return;
          const to = +item.dataset.idx;
          if (to === from.ii) return;
          const items = trip.days[di].items;
          const times = items.map(x => x.time); // keep the time slots, move the places
          const [moved] = items.splice(from.ii, 1);
          items.splice(to, 0, moved);
          items.forEach((x, i) => { x.time = times[i]; });
          from = null;
          persist(); paint();
          toast('Order updated');
        });
      });
    });
  }

  async function regenDay(di, btn) {
    const instruction = prompt('Anything specific for this day? (optional)\ne.g. "more food spots", "kid friendly", "rainy day plan"', '') ;
    if (instruction === null) return;
    btn.disabled = true;
    btn.textContent = '⏳ Thinking…';
    const block = $(`[data-dayblock="${di}"]`, el);
    const stop = loader(block, [`Re-planning day ${trip.days[di].day}…`, 'Finding places you haven’t seen…', 'Checking travel times…'], '🔄');
    try {
      const res = await post('/api/itinerary/day', { trip, day: trip.days[di].day, instruction }, () => {
        const d = structuredClone(trip.days[di]);
        d.items = [...d.items.slice(1), d.items[0]].map((x, i) => ({ ...x, time: trip.days[di].items[i].time }));
        d.theme = d.theme + (instruction ? ` (${instruction})` : ' (remixed)');
        return d;
      });
      const d = res.data;
      if (!Array.isArray(d?.items) || !d.items.length) throw new Error('Gemma returned an empty day.');
      trip.days[di] = { ...d, day: trip.days[di].day };
      persist();
      toast(`Day ${trip.days[di].day} refreshed ✨`);
      paint();
    } catch (err) {
      stop();
      errorCard(block, err);
      setTimeout(paint, 4000);
    }
  }

  async function loadWeather(box) {
    if (!box) return;
    const c = trip.center || trip.days[0]?.items?.[0];
    let days = [];
    if (isDemo() || !c) {
      const base = new Date();
      days = Array.from({ length: 7 }, (_, i) => ({
        date: new Date(base.getTime() + i * 864e5).toISOString().slice(0, 10),
        code: [0, 1, 2, 0, 3, 1, 61][i], max: [29, 30, 28, 27, 26, 28, 25][i], min: [14, 15, 15, 13, 12, 14, 16][i], rain: [0, 5, 10, 0, 20, 5, 60][i],
      }));
    } else {
      try { days = (await get(`/api/weather?lat=${c.lat}&lng=${c.lng}`)).days; } catch { days = []; }
    }
    if (!box.isConnected) return;
    box.innerHTML = days.length ? days.map(w => `
      <div class="weather-day">
        ${new Date(w.date).toLocaleDateString(undefined, { weekday: 'short' })}
        <span class="wi">${weatherIcon(w.code)}</span>
        <b>${Math.round(w.max)}°</b> <span class="muted">${Math.round(w.min)}°</span>
        ${w.rain != null ? `<div class="tiny muted">💧${w.rain}%</div>` : ''}
      </div>`).join('') : '<span class="small muted">Weather unavailable offline.</span>';
  }

  // ------------------------------------------------------------ budget
  function paintBudget(body) {
    const b = trip.budget || {};
    const cats = Object.keys(BUDGET_COLORS).filter(k => +b[k] > 0);
    const total = cats.reduce((s, k) => s + +b[k], 0) || 1;
    let acc = 0;
    const arcs = cats.map(k => {
      const frac = b[k] / total;
      const seg = `<circle r="15.915" cx="20" cy="20" fill="none" stroke="${BUDGET_COLORS[k]}" stroke-width="6"
        stroke-dasharray="${(frac * 100).toFixed(2)} ${(100 - frac * 100).toFixed(2)}" stroke-dashoffset="${(25 - acc * 100).toFixed(2)}"></circle>`;
      acc += frac;
      return seg;
    }).join('');
    const travelers = trip.request?.travelers || 2;
    body.innerHTML = `
      <div class="grid grid-2">
        <div class="card">
          <h3>Where the money goes</h3>
          <div class="row" style="gap:24px;align-items:center">
            <svg class="donut" viewBox="0 0 40 40" role="img" aria-label="Budget breakdown">${arcs}
              <text x="20" y="19" text-anchor="middle" font-size="3.6" font-weight="800" fill="currentColor">${money(b.total || total, trip.currency)}</text>
              <text x="20" y="24" text-anchor="middle" font-size="2.6" fill="currentColor" opacity=".6">total</text></svg>
            <div class="stack" style="flex:1;min-width:200px;gap:10px">
              ${cats.map(k => `
                <div class="budget-row"><span style="width:86px;text-transform:capitalize">${k}</span>
                  <div class="bar"><i style="width:${(b[k] / total * 100).toFixed(1)}%;background:${BUDGET_COLORS[k]}"></i></div>
                  <b style="width:90px;text-align:right">${money(b[k], trip.currency)}</b></div>`).join('')}
            </div>
          </div>
        </div>
        <div class="card">
          <h3>Per day & per person</h3>
          <div class="stack" style="gap:10px">
            ${trip.days.map(d => {
              const c = d.items.reduce((s, it) => s + (+it.cost || 0), 0);
              return `<div class="row between small"><span>Day ${d.day} · ${esc(d.theme || '')}</span><b>${money(c, trip.currency)}</b></div>`;
            }).join('')}
            <div class="divider" style="margin:6px 0"></div>
            <div class="row between"><span>Per person (${travelers} travellers)</span><b>${money((b.total || total) / travelers, trip.currency)}</b></div>
            <div class="row between"><span>Per day</span><b>${money((b.total || total) / trip.days.length, trip.currency)}</b></div>
          </div>
          <p class="tiny muted" style="margin-top:12px">Estimates by Gemma 4 for planning only. Prices vary by season.</p>
        </div>
      </div>`;
  }

  // ------------------------------------------------------------ toolkit
  async function paintToolkit(body) {
    if (!trip.toolkit) {
      const stop = loader(body, ['Packing your bag…', 'Learning local phrases…', 'Checking etiquette & safety…'], '🎒');
      try {
        const month = trip.request?.start_date ? new Date(trip.request.start_date).toLocaleString('en', { month: 'long' }) : '';
        const res = await post('/api/toolkit', {
          destination: trip.destination, days: trip.days.length, month, travelers: trip.request?.travelers || 2,
          activities: trip.tags || [],
        }, () => demoToolkit(trip.destination));
        trip.toolkit = res.data;
        persist();
      } catch (err) {
        stop();
        errorCard(body, err, () => { trip.toolkit = demoToolkit(trip.destination); persist(); paint(); });
        return;
      }
      stop();
      if (state.tab !== 'toolkit') return;
    }
    const tk = trip.toolkit;
    const checks = store.checks;
    const key = (cat, item) => `${trip.id || trip.title}|${cat}|${item}`;
    body.innerHTML = `
      <div class="grid grid-2">
        <div class="card">
          <div class="row between"><h3>🎒 Packing list</h3><button class="btn btn-sm btn-ghost no-print" id="tk-refresh">🔄 Regenerate</button></div>
          <div class="grid grid-2 checklist">
            ${(tk.packing || []).map(c => `<div><div class="small" style="font-weight:700;margin:6px 0">${esc(c.category)}</div>
              ${(c.items || []).map(i => `<label><input type="checkbox" data-k="${esc(key(c.category, i))}" ${checks[key(c.category, i)] ? 'checked' : ''}><span>${esc(i)}</span></label>`).join('')}
            </div>`).join('')}
          </div>
        </div>
        <div class="card">
          <h3>🗣️ Phrasebook <span class="tag plain" style="vertical-align:middle">${esc(tk.language || '')}</span></h3>
          ${(tk.phrases || []).map(p => `<div class="phrase"><span class="muted">${esc(p.en)}</span><span><b>${esc(p.local)}</b><br><span class="tiny muted">${esc(p.pronunciation || '')}</span></span></div>`).join('')}
        </div>
        <div class="card"><h3>🙏 Etiquette</h3><ul class="list-clean">${(tk.etiquette || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div class="card"><h3>🛡️ Safety</h3><ul class="list-clean">${(tk.safety || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
          ${tk.emergency ? `<div class="row" style="margin-top:12px">${Object.entries(tk.emergency).map(([k, v]) => `<span class="tag accent">${esc(k.replace('_', ' '))}: ${esc(v)}</span>`).join('')}</div>` : ''}</div>
        <div class="card" style="grid-column:1/-1"><h3>💸 Money tips</h3><ul class="list-clean">${(tk.money_tips || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      </div>`;
    $$('input[data-k]', body).forEach(cb => cb.onchange = () => store.setCheck(cb.dataset.k, cb.checked));
    $('#tk-refresh', body).onclick = () => { delete trip.toolkit; paint(); };
  }

  function paintTips(body) {
    body.innerHTML = `
      <div class="grid grid-2">
        <div class="card"><h3>💡 Insider tips</h3><ul class="list-clean">${(trip.tips || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
        <div class="card"><h3>🗓️ When to go</h3><p>${esc(trip.best_time || '—')}</p>
          ${trip.request ? `<div class="divider"></div><h3>Your request</h3>
          <div class="small muted">${esc(trip.request.travelers)} travellers · ${esc(trip.request.pace)} pace · ${esc(trip.request.style)}
          ${trip.request.interests?.length ? '<br>Interests: ' + esc(trip.request.interests.join(', ')) : ''}
          ${trip.request.notes ? '<br>Notes: ' + esc(trip.request.notes) : ''}</div>` : ''}
          ${trip.meta ? `<div class="divider"></div><div class="tiny muted">Generated by ${esc(trip.meta.model)} via ${esc(trip.meta.provider)}</div>` : ''}
        </div>
      </div>`;
  }

  paint();
}

function fmtDur(min) {
  const m = +min || 0;
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h${m % 60 ? ' ' + (m % 60) + 'm' : ''}`;
}
