import { store } from '../store.js';
import { post, isDemo, demoResult } from '../api.js';
import { $, $$, esc, loader, errorCard, renderMap, toast, CAT_EMOJI } from '../ui.js';
import { DEMO_NEARBY } from '../demo-data.js';
import { signals } from '../recommender.js';
import { demoBanner } from '../components.js';

const INTERESTS = ['heritage', 'nature', 'food', 'spiritual', 'art', 'shopping', 'nightlife', 'adventure'];

export function render(el) {
  const state = { radius: 5, interests: new Set(), filter: 'all', sort: 'smart', result: null };

  el.innerHTML = `
    ${demoBanner('Demo mode: showing places around India Gate, New Delhi.')}
    <div class="card pad-lg">
      <h2 style="margin-bottom:4px">What’s worth seeing around here? 📍</h2>
      <p class="muted small">Real places from Wikipedia & OpenStreetMap, ranked and described by Gemma 4 for your interests.</p>
      <div class="row" style="margin-top:12px">
        <button class="btn btn-primary" id="gps">📡 Use my location</button>
        <span class="muted small">or</span>
        <form id="place-form" class="row" style="flex:1;min-width:240px;flex-wrap:nowrap">
          <input class="input" id="place" placeholder="Type a place: Connaught Place, Delhi" autocomplete="off">
          <button class="btn btn-ghost" type="submit">Search</button>
        </form>
      </div>
      <div class="grid grid-2" style="margin-top:16px">
        <div class="field"><label>Radius: <b id="r-val">5 km</b></label><input type="range" id="radius" min="1" max="20" value="5"></div>
        <div class="field"><label>I’m into…</label>
          <div class="chips" id="near-int">${INTERESTS.map(t => `<span class="chip" data-t="${t}">${CAT_EMOJI[t] || ''} ${t}</span>`).join('')}</div></div>
      </div>
    </div>
    <div id="near-results" style="margin-top:20px"></div>`;

  $('#radius', el).oninput = e => { state.radius = +e.target.value; $('#r-val', el).textContent = `${state.radius} km`; };
  $$('#near-int .chip', el).forEach(c => c.onclick = () => {
    c.classList.toggle('on');
    c.classList.contains('on') ? state.interests.add(c.dataset.t) : state.interests.delete(c.dataset.t);
  });

  $('#gps', el).onclick = () => {
    if (isDemo()) return search({});
    if (!navigator.geolocation) return toast('Geolocation not supported. Type a place instead.', 'err');
    const btn = $('#gps', el);
    btn.disabled = true; btn.textContent = '📡 Locating…';
    navigator.geolocation.getCurrentPosition(
      pos => { btn.disabled = false; btn.textContent = '📡 Use my location'; search({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      () => { btn.disabled = false; btn.textContent = '📡 Use my location'; toast('Location permission denied. Type a place instead.', 'err'); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  $('#place-form', el).onsubmit = e => {
    e.preventDefault();
    const place = $('#place', el).value.trim();
    if (place || isDemo()) search({ place });
  };

  async function search(loc) {
    const box = $('#near-results', el);
    const stop = loader(box, ['Scanning the map around you…', 'Pulling real places nearby…', 'Ranking for your interests…', 'Writing quick hooks…'], '📍');
    signals.interests([...state.interests], 0.5);
    try {
      const res = isDemo()
        ? await demoResult(DEMO_NEARBY.data, { center: DEMO_NEARBY.center, label: DEMO_NEARBY.label, source: DEMO_NEARBY.source })
        : await post('/api/nearby', { ...loc, radius_km: state.radius, interests: [...state.interests] });
      stop();
      state.result = res;
      paintResults();
    } catch (err) {
      stop();
      errorCard(box, err, async () => {
        state.result = await demoResult(DEMO_NEARBY.data, { center: DEMO_NEARBY.center, label: DEMO_NEARBY.label, source: DEMO_NEARBY.source });
        paintResults();
      });
    }
  }

  function paintResults() {
    const box = $('#near-results', el);
    const res = state.result;
    const all = res.data.places || [];
    const cats = [...new Set(all.map(p => p.category).filter(Boolean))];
    let places = state.filter === 'all' ? all : all.filter(p => p.category === state.filter);
    if (state.sort === 'distance') places = [...places].sort((a, b) => (a.distance_km ?? 99) - (b.distance_km ?? 99));
    if (state.sort === 'must') places = [...places].sort((a, b) => (b.must_see ? 1 : 0) - (a.must_see ? 1 : 0));

    box.innerHTML = `
      <div class="card" style="margin-bottom:16px">
        <div class="row between">
          <div><div class="tiny muted" style="font-weight:700;letter-spacing:.06em">AROUND</div><h3 style="margin:0">${esc(res.label || '')}</h3></div>
          <span class="tag plain">${res.source === 'gemma' ? 'Gemma 4 knowledge' : res.source === 'places' ? 'Map data only (AI offline)' : 'Wikipedia + OSM, ranked by Gemma 4'}</span>
        </div>
        ${res.data.area_summary ? `<p class="muted" style="margin:8px 0 0">${esc(res.data.area_summary)}</p>` : ''}
      </div>
      <div class="row between" style="margin-bottom:12px">
        <div class="chips">
          <span class="chip ${state.filter === 'all' ? 'on' : ''}" data-f="all">All (${all.length})</span>
          ${cats.map(c => `<span class="chip ${state.filter === c ? 'on' : ''}" data-f="${esc(c)}">${CAT_EMOJI[c] || '📍'} ${esc(c)}</span>`).join('')}
        </div>
        <div class="segmented" id="sort">
          ${[['smart', 'Best'], ['must', 'Must-see'], ['distance', 'Nearest']].map(([v, l]) => `<button data-v="${v}" class="${state.sort === v ? 'on' : ''}">${l}</button>`).join('')}
        </div>
      </div>
      <div class="split">
        <div class="stack">
          ${places.length ? places.map((p, i) => `
            <div class="card" style="padding:16px">
              <div class="row between" style="align-items:start">
                <div style="flex:1;min-width:0">
                  <div class="row" style="gap:8px"><span class="tag plain">${i + 1}</span><b>${CAT_EMOJI[p.category] || '📍'} ${esc(p.name)}</b>
                    ${p.must_see ? '<span class="tag accent">⭐ must-see</span>' : ''}</div>
                  ${p.hook ? `<p class="small" style="margin:6px 0">${esc(p.hook)}</p>` : ''}
                  <div class="tl-meta">
                    ${p.distance_km != null ? `<span>📏 ${p.distance_km} km</span>` : ''}
                    ${p.best_time ? `<span>🕒 ${esc(p.best_time)}</span>` : ''}
                    ${p.time_needed ? `<span>⏱ ${esc(p.time_needed)}</span>` : ''}
                  </div>
                </div>
                <div class="stack" style="gap:6px">
                  <button class="btn btn-sm btn-ghost btn-icon" data-save="${esc(p.name)}" title="Save">${store.isSaved(p.name) ? '🔖' : '📑'}</button>
                  ${p.lat ? `<a class="btn btn-sm btn-ghost btn-icon" target="_blank" rel="noopener" title="Directions" href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}">🧭</a>` : ''}
                </div>
              </div>
            </div>`).join('') : '<div class="card muted">Nothing in this category. Try a bigger radius.</div>'}
        </div>
        <div class="sticky"><div class="map" id="near-map"></div></div>
      </div>`;

    $$('[data-f]', box).forEach(c => c.onclick = () => { state.filter = c.dataset.f; paintResults(); });
    $$('#sort button', box).forEach(b => b.onclick = () => { state.sort = b.dataset.v; paintResults(); });
    $$('[data-save]', box).forEach(b => b.onclick = () => {
      const p = all.find(x => x.name === b.dataset.save);
      const place = { name: p.name, country: res.label?.split(',').pop()?.trim(), emoji: CAT_EMOJI[p.category] || '📍', tags: p.tags?.length ? p.tags : [p.category], blurb: p.hook };
      const added = store.toggleSaved(place);
      if (added) signals.save(place);
      b.textContent = added ? '🔖' : '📑';
      toast(added ? 'Saved to wishlist' : 'Removed');
    });
    renderMap($('#near-map', box), places.map((p, i) => ({ lat: +p.lat, lng: +p.lng, title: p.name, sub: p.hook, label: i + 1 })),
      { me: res.center, route: false });
  }
}
