import { store } from '../store.js';
import { post } from '../api.js';
import { $, esc, loader, errorCard, toast, gradFor } from '../ui.js';
import { recommend, similarTo, topTags, hasProfile, demoRerank } from '../recommender.js';
import { CATALOG } from '../catalog.js';
import { destCard, bindDestCards, demoBanner } from '../components.js';

export function render(el) {
  const paint = () => {
    const recs = recommend(9);
    const personal = hasProfile();
    const tags = topTags(6);
    const maxW = tags[0]?.[1] || 1;
    const liked = store.profile.liked.slice(-2).reverse();

    el.innerHTML = `
      ${demoBanner()}
      <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:20px" id="fy-top">
        <div class="card">
          <h3>Your taste profile 🧬</h3>
          ${tags.length ? `<div class="stack" style="gap:10px;margin-top:10px">
            ${tags.map(([t, w]) => `<div class="budget-row"><span style="width:90px;text-transform:capitalize">${esc(t)}</span>
              <div class="bar"><i style="width:${(w / maxW * 100).toFixed(0)}%;background:var(--primary)"></i></div></div>`).join('')}
          </div>` : '<p class="small muted">No signals yet. Like places, take the quiz or plan a trip, and this updates instantly.</p>'}
          <div class="divider"></div>
          <div class="small muted">💜 ${store.profile.liked.length} liked · 👎 ${store.profile.disliked.length} hidden · 🔖 ${store.saved.length} saved</div>
          <div class="row" style="margin-top:12px">
            <a class="btn btn-sm btn-ghost" href="#/discover">✨ Take quiz</a>
            <button class="btn btn-sm btn-danger" id="reset">Reset</button>
          </div>
        </div>
        <div class="card" style="background:var(--hero);color:#fff;border:0">
          <h2 style="color:#fff">How recommendations work</h2>
          <ol class="small" style="opacity:.95;padding-left:1.2em;margin:0 0 14px">
            <li><b>Signals</b>: your quiz, likes, saves, trips and Lens scans build a tag-weight profile (older signals decay).</li>
            <li><b>Content scoring</b>: cosine similarity + popularity + budget fit, on-device.</li>
            <li><b>Diversity</b>: MMR re-ranking keeps the list varied.</li>
            <li><b>Gemma 4</b> re-ranks the top picks, explains why, and adds new ideas.</li>
          </ol>
          <button class="btn btn-white" id="ai-rerank" style="background:#fff;color:#3d2db8">✨ Personalise with Gemma 4</button>
        </div>
      </div>
      <div id="ai-picks"></div>
      <div class="section-head"><div><h2>${personal ? 'Recommended for you' : 'Popular right now'}</h2>
        <div class="small muted">${personal ? 'Scored on your device in real time. Tap 💜 or 👎 to teach it.' : 'Like or hide a few to personalise'}</div></div></div>
      <div class="grid grid-3" id="recs">${recs.map(p => destCard(p, { reason: p.reason, match: personal ? p.score : null })).join('')}</div>
      ${liked.map(name => {
        const sims = similarTo(name, 4);
        return sims.length ? `<div class="section-head"><h2>Because you liked ${esc(name)}</h2></div>
          <div class="grid grid-4 sim-row">${sims.map(p => destCard(p, { compact: true })).join('')}</div>` : '';
      }).join('')}
    `;
    if (window.matchMedia('(max-width: 900px)').matches) $('#fy-top', el).style.gridTemplateColumns = '1fr';

    bindDestCards($('#recs', el), recs, { onChange: act => act !== 'save' && setTimeout(paint, 350) });
    el.querySelectorAll('.sim-row').forEach(row => bindDestCards(row, CATALOG));
    $('#reset', el).onclick = () => {
      if (!confirm('Reset your taste profile?')) return;
      store.setProfile({ tags: {}, liked: [], disliked: [], seen: [], quiz: null });
      toast('Profile reset');
      paint();
    };
    $('#ai-rerank', el).onclick = () => aiRerank(recs);
  };

  async function aiRerank(recs) {
    const box = $('#ai-picks', el);
    const stop = loader(box, ['Reading your taste profile…', 'Re-ranking candidates…', 'Writing personal reasons…', 'Dreaming up new ideas…'], '💜');
    const p = store.profile;
    const candidates = recs.map(r => ({ name: r.name, country: r.country, tags: r.tags, score: r.score }));
    try {
      const res = await post('/api/recommend', { profile: p.tags, liked: p.liked, disliked: p.disliked, candidates }, () => demoRerank(recs));
      stop();
      paintAi(res.data, recs);
    } catch (err) {
      stop();
      errorCard(box, err, () => paintAi(demoRerank(recs), recs));
    }
  }

  function paintAi(data, recs) {
    const box = $('#ai-picks', el);
    const byName = Object.fromEntries(CATALOG.map(c => [c.name, c]));
    box.innerHTML = `
      <div class="section-head"><h2>✨ Gemma’s picks for you</h2></div>
      <div class="grid grid-3">
        ${(data.picks || []).map(p => {
          const c = byName[p.name] || recs.find(r => r.name === p.name) || {};
          return `<div class="card row" style="flex-wrap:nowrap;align-items:start">
            <div class="feature-ic" style="${gradFor(p.name)};background:linear-gradient(135deg,var(--c1),var(--c2));flex-shrink:0">${esc(c.emoji || '📍')}</div>
            <div><div class="row between"><b>${esc(p.name)}</b>${p.score ? `<span class="tag">${+p.score}%</span>` : ''}</div>
            <p class="small muted" style="margin:4px 0 8px">${esc(p.why)}</p>
            <a class="btn btn-sm btn-ghost" href="#/plan?dest=${encodeURIComponent(p.name)}">Plan →</a></div></div>`;
        }).join('')}
      </div>
      ${data.new_ideas?.length ? `<div class="section-head"><h2>🌱 New ideas beyond your list</h2></div>
      <div class="grid grid-4" id="new-ideas">${data.new_ideas.map(n => destCard(n, { compact: false })).join('')}</div>` : ''}`;
    const ideas = $('#new-ideas', el);
    if (ideas) bindDestCards(ideas, data.new_ideas);
  }

  paint();
}
