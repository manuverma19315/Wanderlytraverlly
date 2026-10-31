import { store } from '../store.js';
import { $, $$, esc, gradFor, money, toast, emptyState } from '../ui.js';
import { destCard, bindDestCards } from '../components.js';

export function render(el) {
  const paint = () => {
    const trips = store.trips;
    const saved = store.saved;
    const draft = store.draft;
    el.innerHTML = `
      <div class="row between" style="margin-bottom:16px">
        <div><h1 style="margin:0">My trips 🧳</h1><p class="muted" style="margin:0">Stored only in this browser. Export to back up or move devices.</p></div>
        <div class="row">
          <button class="btn btn-ghost btn-sm" id="export">⬇️ Export</button>
          <label class="btn btn-ghost btn-sm" style="cursor:pointer">⬆️ Import<input type="file" id="import" accept="application/json" hidden></label>
          <a class="btn btn-primary btn-sm" href="#/plan">+ New trip</a>
        </div>
      </div>

      ${draft && !trips.some(t => t.title === draft.title) ? `
        <div class="card row between" style="margin-bottom:16px;border-style:dashed">
          <div><span class="tag amber">Unsaved draft</span> <b>${esc(draft.title)}</b></div>
          <a class="btn btn-sm btn-primary" href="#/trip/draft">Open draft</a>
        </div>` : ''}

      ${trips.length ? `<div class="grid grid-3">${trips.map(t => `
        <article class="card dest-card">
          <a class="dest-cover" href="#/trip/${t.id}" style="${gradFor(t.destination)};height:100px"><span style="font-size:2.4rem">🧳</span></a>
          <div class="dest-body">
            <a href="#/trip/${t.id}" style="color:inherit"><h3 style="margin:0">${esc(t.title)}</h3></a>
            <div class="small muted">${esc(t.destination)}</div>
            <div class="chips"><span class="tag">${t.days?.length || 0} days</span><span class="tag amber">${money(t.budget?.total, t.currency)}</span>
              ${t.meta?.demo ? '<span class="tag plain">sample</span>' : ''}</div>
            <div class="tiny muted">Saved ${new Date(t.savedAt).toLocaleDateString()}</div>
            <div class="actions">
              <a class="btn btn-sm btn-primary" href="#/trip/${t.id}">Open</a>
              <button class="btn btn-sm btn-ghost" data-dup="${t.id}">Duplicate</button>
              <button class="btn btn-sm btn-danger" data-del="${t.id}">Delete</button>
            </div>
          </div>
        </article>`).join('')}</div>`
      : emptyState('🧳', 'No saved trips yet', 'Generate an itinerary and hit “Save trip”.', '<a class="btn btn-primary" href="#/plan">Plan a trip</a>')}

      <div class="section-head"><h2>Wishlist 🔖</h2><span class="small muted">${saved.length} saved places</span></div>
      ${saved.length ? `<div class="grid grid-4" id="wish">${saved.map(p => destCard(p, { compact: true })).join('')}</div>`
      : '<div class="card small muted">Tap 📑 on any destination card to save it here.</div>'}
    `;

    $$('[data-del]', el).forEach(b => b.onclick = () => {
      if (!confirm('Delete this trip?')) return;
      store.deleteTrip(b.dataset.del);
      toast('Trip deleted');
      paint();
    });
    $$('[data-dup]', el).forEach(b => b.onclick = () => {
      const t = structuredClone(store.getTrip(b.dataset.dup));
      delete t.id;
      t.title += ' (copy)';
      store.saveTrip(t);
      toast('Trip duplicated');
      paint();
    });
    $('#export', el).onclick = () => {
      const blob = new Blob([JSON.stringify(store.exportAll(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `wanderly-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    };
    $('#import', el).onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        store.importAll(JSON.parse(await file.text()));
        toast('Backup imported');
        paint();
      } catch {
        toast('That file is not a valid Wanderly backup', 'err');
      }
    };
    const wish = $('#wish', el);
    if (wish) bindDestCards(wish, saved, { onChange: act => act === 'save' && paint() });
  };
  paint();
}
