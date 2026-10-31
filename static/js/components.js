// Reusable rendered pieces shared by several views.

import { store } from './store.js';
import { esc, gradFor, toast, $$ } from './ui.js';
import { signals } from './recommender.js';

/** Destination card with like / dislike / save / plan actions. */
export function destCard(p, { reason = '', match = null, compact = false } = {}) {
  const saved = store.isSaved(p.name);
  const liked = store.profile.liked.includes(p.name);
  return `
  <article class="card dest-card card-hover" data-place="${esc(p.name)}">
    <div class="dest-cover" style="${gradFor(p.name)}">
      <span>${esc(p.emoji || '📍')}</span>
      ${match != null ? `<span class="match">${match}% match</span>` : ''}
      ${p.hidden_gem ? '<span class="gem">💎 Hidden gem</span>' : ''}
    </div>
    <div class="dest-body">
      <div class="row between"><h3 style="margin:0">${esc(p.name)}</h3><span class="tiny muted">${esc(p.country || '')}</span></div>
      ${reason ? `<div class="small" style="color:var(--primary);font-weight:600">${esc(reason)}</div>` : ''}
      ${!compact && (p.why || p.blurb) ? `<p class="small muted" style="margin:0">${esc(p.why || p.blurb)}</p>` : ''}
      ${p.highlights?.length && !compact ? `<ul class="list-clean small">${p.highlights.slice(0, 3).map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
      <div class="chips">${(p.tags || []).slice(0, 4).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
        ${p.best_season ? `<span class="tag green">🗓 ${esc(p.best_season)}</span>` : ''}
        ${p.budget_per_day ? `<span class="tag amber">💰 ${esc(p.budget_per_day)}</span>` : ''}</div>
      <div class="actions">
        <button class="btn btn-sm btn-primary" data-act="plan">Plan trip →</button>
        <button class="btn btn-sm btn-ghost btn-icon" data-act="like" title="More like this" aria-pressed="${liked}">${liked ? '💜' : '🤍'}</button>
        <button class="btn btn-sm btn-ghost btn-icon" data-act="dislike" title="Not for me">👎</button>
        <button class="btn btn-sm btn-ghost btn-icon" data-act="save" title="Save to wishlist">${saved ? '🔖' : '📑'}</button>
      </div>
    </div>
  </article>`;
}

/** Wires up the action buttons for every destCard inside root. */
export function bindDestCards(root, places, { onChange } = {}) {
  const byName = Object.fromEntries(places.map(p => [p.name, p]));
  $$('[data-place]', root).forEach(card => {
    const place = byName[card.dataset.place];
    if (!place) return;
    card.addEventListener('click', e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      e.stopPropagation();
      const act = btn.dataset.act;
      if (act === 'plan') {
        signals.interests(place.tags || [], 1);
        location.hash = `#/plan?dest=${encodeURIComponent(place.name + (place.country ? ', ' + place.country : ''))}`;
      } else if (act === 'like') {
        signals.like(place);
        btn.textContent = '💜';
        toast(`Got it, more like ${place.name}`);
        onChange?.('like', place);
      } else if (act === 'dislike') {
        signals.dislike(place);
        card.style.transition = 'opacity .3s, transform .3s';
        card.style.opacity = '0'; card.style.transform = 'scale(.96)';
        setTimeout(() => { card.remove(); onChange?.('dislike', place); }, 300);
        toast('We’ll show fewer places like this');
      } else if (act === 'save') {
        const added = store.toggleSaved(place);
        if (added) signals.save(place);
        btn.textContent = added ? '🔖' : '📑';
        toast(added ? 'Saved to wishlist' : 'Removed from wishlist');
        onChange?.('save', place);
      }
    });
  });
}

export function demoBanner(text = 'Demo mode: showing built-in sample data (works offline).') {
  return store.settings.demo
    ? `<div class="demo-banner">🎬 ${esc(text)} <a href="#/settings" style="margin-left:auto">Switch to live Gemma</a></div>`
    : '';
}
