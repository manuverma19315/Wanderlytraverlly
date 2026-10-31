import { store } from '../store.js';
import { esc, gradFor, money } from '../ui.js';
import { recommend, hasProfile } from '../recommender.js';
import { destCard, bindDestCards } from '../components.js';

const FEATURES = [
  ['🗺️', 'AI itinerary', 'Day-by-day plans with maps, timings, costs and weather.', '#/plan'],
  ['📷', 'Travel Lens', 'Snap a monument, dish or sign. Gemma 4 vision explains and translates it.', '#/lens'],
  ['📍', 'Nearby places', 'Real places around you, ranked by Gemma 4 for your interests.', '#/nearby'],
  ['✨', 'Find my destination', 'Answer 6 fun questions and get matched destinations.', '#/discover'],
];

export function render(el) {
  const trips = store.trips;
  const recs = recommend(4);
  const personal = hasProfile();

  el.innerHTML = `
    <section class="hero">
      <div class="hero-pill">⚡ Powered by Gemma 4 · multimodal · multilingual</div>
      <h1>Plan smarter trips with an AI that actually knows the way.</h1>
      <p>Itineraries, nearby gems, photo recognition and personal recommendations, all in one place. Your data stays in your browser.</p>
      <form class="hero-search" id="hero-form">
        <input id="hero-dest" placeholder="Where to? e.g. Jaipur, Kyoto, Goa…" aria-label="Destination" autocomplete="off">
        <button class="btn btn-hero" type="submit">Plan my trip ✈️</button>
      </form>
      <div class="row" style="margin-top:16px">
        <a class="btn btn-ghost btn-sm" href="#/discover">Not sure where? Take the quiz</a>
        <a class="btn btn-ghost btn-sm" href="#/demo">🎬 See the demo</a>
      </div>
    </section>

    <div class="grid grid-4" style="margin-top:22px">
      ${FEATURES.map(([ic, t, d, href]) => `
        <a class="card card-hover feature-card" href="${href}">
          <div class="feature-ic">${ic}</div>
          <h3 style="margin:4px 0 0">${t}</h3>
          <p class="small muted" style="margin:0">${d}</p>
        </a>`).join('')}
    </div>

    <div class="section-head">
      <div><h2>${personal ? 'Picked for you 💜' : 'Trending destinations 🔥'}</h2>
      <div class="small muted">${personal ? 'Based on your likes, quiz and trips' : 'Like a few places to personalise this'}</div></div>
      <a class="btn btn-ghost btn-sm" href="#/foryou">See all →</a>
    </div>
    <div class="grid grid-4" id="home-recs">
      ${recs.map(p => destCard(p, { reason: p.reason, match: personal ? p.score : null, compact: true })).join('')}
    </div>

    <div class="section-head">
      <h2>Your trips 🧳</h2>
      ${trips.length ? '<a class="btn btn-ghost btn-sm" href="#/trips">Manage →</a>' : ''}
    </div>
    ${trips.length ? `
      <div class="grid grid-3">
        ${trips.slice(0, 3).map(t => `
          <a class="card card-hover dest-card" href="#/trip/${t.id}">
            <div class="dest-cover" style="${gradFor(t.destination)};height:90px"><span style="font-size:2.2rem">🧳</span></div>
            <div class="dest-body">
              <h3 style="margin:0">${esc(t.title)}</h3>
              <div class="small muted">${t.days?.length || 0} days · ${money(t.budget?.total, t.currency)}</div>
            </div>
          </a>`).join('')}
      </div>` : `
      <div class="card row between">
        <div><h3 style="margin:0">No trips yet</h3><p class="small muted" style="margin:0">Plan your first trip, or load a sample one.</p></div>
        <div class="row"><a class="btn btn-primary" href="#/plan">Plan a trip</a><a class="btn btn-ghost" href="#/demo">Load sample</a></div>
      </div>`}
  `;

  el.querySelector('#hero-form').onsubmit = e => {
    e.preventDefault();
    const v = el.querySelector('#hero-dest').value.trim();
    location.hash = v ? `#/plan?dest=${encodeURIComponent(v)}` : '#/plan';
  };
  bindDestCards(el.querySelector('#home-recs'), recs);
}
