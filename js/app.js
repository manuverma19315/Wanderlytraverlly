import { store } from './store.js';
import { $, $$, toast } from './ui.js';

// route name -> [module path, page title]
const ROUTES = {
  '': ['./views/home.js', 'Home'],
  plan: ['./views/plan.js', 'Plan a trip'],
  trip: ['./views/trip.js', 'Trip'],
  share: ['./views/trip.js', 'Shared trip'],
  trips: ['./views/trips.js', 'My trips'],
  discover: ['./views/discover.js', 'Find my destination'],
  nearby: ['./views/nearby.js', 'Nearby places'],
  lens: ['./views/lens.js', 'Travel Lens'],
  foryou: ['./views/foryou.js', 'For you'],
  chat: ['./views/chat.js', 'Travel buddy'],
  demo: ['./views/demo.js', 'Demo showcase'],
  settings: ['./views/settings.js', 'Settings'],
  more: ['./views/more.js', 'More'],
};

let cleanup = null;

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const [name = '', ...rest] = path.split('/');
  return { name, arg: rest.join('/'), query: new URLSearchParams(query) };
}

async function route() {
  const { name, arg, query } = parseHash();
  const entry = ROUTES[name] || ROUTES[''];
  const view = $('#view');
  if (typeof cleanup === 'function') { try { cleanup(); } catch { /* ignore */ } }
  cleanup = null;

  $$('[data-route]').forEach(a => a.classList.toggle('active', a.dataset.route === (ROUTES[name] ? name : '')));
  $('#page-title').textContent = entry[1];
  document.title = `${entry[1]} · Wanderly`;

  view.innerHTML = '';
  view.style.animation = 'none';
  void view.offsetWidth; // restart entry animation
  view.style.animation = '';
  try {
    const mod = await import(entry[0]);
    cleanup = await mod.render(view, { arg, query, name });
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="card error-card"><h3>Something broke</h3><p class="muted">${String(err.message || err)}</p></div>`;
  }
  window.scrollTo({ top: 0 });
}

// ---------------------------------------------------------------- demo switch

function syncDemoSwitch() {
  $('#demo-switch').checked = store.settings.demo;
  document.body.classList.toggle('demo-on', store.settings.demo);
}

$('#demo-switch').addEventListener('change', e => {
  store.setSettings({ demo: e.target.checked });
  toast(e.target.checked ? '🎬 Demo mode on: using built-in data, works offline' : '⚡ Live mode: answers come from Gemma 4');
  route();
});
window.addEventListener('store:settings', syncDemoSwitch);

// ---------------------------------------------------------------- AI status

async function checkStatus() {
  const el = $('#ai-status');
  const s = store.settings;
  try {
    const h = await (await fetch('/api/health')).json();
    const sources = [];
    if (s.googleKey) sources.push('your AI Studio key');
    if (h.server_keys.google) sources.push('server AI Studio key');
    if (s.openrouterKey) sources.push('your OpenRouter key');
    if (h.server_keys.openrouter) sources.push('server OpenRouter key');
    el.innerHTML = sources.length
      ? `🟢 Ready via ${sources[0]}${sources.length > 1 ? ` (+${sources.length - 1} fallback)` : ''}`
      : '🟡 No API key yet. <a href="#/settings">Add one</a> or use Demo.';
  } catch {
    el.innerHTML = '🔴 Offline. Demo mode still works.';
  }
}
window.addEventListener('store:settings', checkStatus);

// ---------------------------------------------------------------- boot

window.addEventListener('hashchange', route);
window.addEventListener('online', () => { toast('Back online'); checkStatus(); });
window.addEventListener('offline', () => toast('You are offline. Turn on Demo mode to keep exploring.', 'err'));

syncDemoSwitch();
checkStatus();
route();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => { /* not critical */ });
}
