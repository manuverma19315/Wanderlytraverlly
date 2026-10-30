// Shared UI helpers: escaping, toasts, loaders, errors, maps, formatting.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2600);
  setTimeout(() => el.remove(), 3000);
}

export function setTitle(t) {
  $('#page-title').textContent = t;
  document.title = `${t} · Wanderly`;
}

export function showProvider(res) {
  const badge = $('#provider-badge');
  if (!badge || !res?.provider) return;
  badge.classList.remove('hidden');
  badge.classList.toggle('demo', !!res.demo);
  const latency = res.latency_ms ? ` · ${(res.latency_ms / 1000).toFixed(1)}s` : '';
  badge.querySelector('span:last-child').textContent = res.demo
    ? 'Demo data · offline'
    : `Gemma 4 · ${res.provider.replace(/ \(.*\)/, '')}${latency}`;
  badge.title = res.model ? `Model: ${res.model}\nProvider: ${res.provider}` : '';
}

/** Animated "Gemma is thinking" card that cycles through step messages. */
export function loader(el, steps, emoji = '✨') {
  el.innerHTML = `
    <div class="card loader-card">
      <div class="loader-orb">${emoji}</div>
      <div class="loader-step">${esc(steps[0])}</div>
      <div class="tiny muted" style="margin-top:6px">Gemma 4 is working on it…</div>
    </div>`;
  const stepEl = $('.loader-step', el);
  let i = 0;
  const timer = setInterval(() => {
    i = (i + 1) % steps.length;
    if (stepEl.isConnected) stepEl.textContent = steps[i]; else clearInterval(timer);
  }, 1800);
  return () => clearInterval(timer);
}

/** Friendly error with a one-click "show demo result" escape hatch. */
export function errorCard(el, err, onDemo) {
  const attempts = err?.attempts || [];
  el.innerHTML = `
    <div class="card error-card">
      <h3>😕 Gemma couldn't answer right now</h3>
      <p class="muted">${esc(err?.message || err)}</p>
      <div class="row">
        ${onDemo ? '<button class="btn btn-primary" data-act="demo">✨ Show demo result</button>' : ''}
        <a class="btn btn-ghost" href="#/settings">Check API keys</a>
      </div>
      ${attempts.length ? `<details><summary>What we tried (${attempts.length})</summary><ul>${attempts.map(a => `<li>${esc(a)}</li>`).join('')}</ul></details>` : ''}
    </div>`;
  if (onDemo) $('[data-act="demo"]', el).onclick = onDemo;
}

export function emptyState(emoji, title, text, action = '') {
  return `<div class="card empty"><div class="big">${emoji}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${action}</div>`;
}

const CURRENCY = { INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥' };
export function money(n, cur = 'INR') {
  const v = Number(n);
  if (!isFinite(v)) return '—';
  const sym = CURRENCY[cur] ?? (cur + ' ');
  return sym + v.toLocaleString(cur === 'INR' ? 'en-IN' : 'en-US', { maximumFractionDigits: 0 });
}

export function weatherIcon(code) {
  if (code == null) return '🌡️';
  if (code === 0) return '☀️';
  if (code <= 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}

export const TYPE_EMOJI = { sight: '🏛️', food: '🍽️', activity: '🎯', transport: '🚕', stay: '🏨', shopping: '🛍️' };
export const CAT_EMOJI = {
  heritage: '🏰', museum: '🏛️', nature: '🌿', viewpoint: '🌄', spiritual: '🛕', beach: '🏖️', fun: '🎡',
  attraction: '📍', food: '🍜', art: '🎨', nightlife: '🌃', adventure: '🧗', shopping: '🛍️',
};

const GRADS = [
  ['#7b61ff', '#ff6a4d'], ['#0ea5e9', '#22c55e'], ['#f59e0b', '#ef4444'], ['#8b5cf6', '#ec4899'],
  ['#14b8a6', '#6366f1'], ['#f97316', '#eab308'], ['#06b6d4', '#3b82f6'], ['#d946ef', '#f43f5e'],
];
export function gradFor(name = '') {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [a, b] = GRADS[h % GRADS.length];
  return `--c1:${a};--c2:${b}`;
}

/** Very small markdown renderer for chat replies (bold, italics, lists, links-free). */
export function md(text) {
  const lines = esc(text).split('\n');
  let out = '', inList = false;
  for (const raw of lines) {
    const line = raw.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|\W)[*_](.+?)[*_](?=\W|$)/g, '$1<i>$2</i>');
    const li = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)/);
    if (li) {
      if (!inList) { out += '<ul>'; inList = true; }
      out += `<li>${li[1]}</li>`;
      continue;
    }
    if (inList) { out += '</ul>'; inList = false; }
    const h = line.match(/^#{1,4}\s+(.*)/);
    if (h) out += `<p><b>${h[1]}</b></p>`;
    else if (line.trim()) out += `<p>${line}</p>`;
  }
  if (inList) out += '</ul>';
  return out;
}

// ------------------------------------------------------------------ maps

/**
 * Renders a Leaflet map with numbered pins. Falls back to a placeholder when
 * Leaflet or map tiles are unavailable (offline demo).
 */
export function renderMap(el, points, { center, me, route = true } = {}) {
  if (!el) return null;
  const valid = points.filter(p => isFinite(p.lat) && isFinite(p.lng) && (p.lat || p.lng));
  if (!window.L) {
    el.innerHTML = `<div class="map-offline">🗺️<br>Map unavailable offline<br><span class="tiny">${valid.length} places plotted</span></div>`;
    return null;
  }
  if (el._map) { el._map.remove(); el._map = null; }
  el.innerHTML = '';
  const map = L.map(el, { scrollWheelZoom: false, zoomControl: true });
  el._map = map;
  const tiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19,
  }).addTo(map);
  let tileErrors = 0;
  tiles.on('tileerror', () => {
    if (++tileErrors === 4 && !el.querySelector('.map-note')) {
      const note = document.createElement('div');
      note.className = 'map-note tiny';
      note.style.cssText = 'position:absolute;z-index:500;bottom:8px;left:8px;background:var(--bg-elev);padding:4px 8px;border-radius:8px';
      note.textContent = 'Offline: map tiles unavailable, pins still shown';
      el.appendChild(note);
    }
  });
  const latlngs = [];
  valid.forEach((p, i) => {
    const icon = L.divIcon({
      className: '', iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28],
      html: `<div class="pin ${p.type === 'food' ? 'food' : ''}"><span>${p.label ?? i + 1}</span></div>`,
    });
    L.marker([p.lat, p.lng], { icon }).addTo(map)
      .bindPopup(`<b>${esc(p.title)}</b>${p.sub ? `<br><span style="color:#777">${esc(p.sub)}</span>` : ''}`);
    latlngs.push([p.lat, p.lng]);
  });
  if (me) {
    L.marker([me.lat, me.lng], {
      icon: L.divIcon({ className: '', iconSize: [22, 22], html: '<div class="pin me" style="width:22px;height:22px"></div>' }),
    }).addTo(map).bindPopup('You are here');
    latlngs.push([me.lat, me.lng]);
  }
  if (route && latlngs.length > 1 && !me) {
    L.polyline(latlngs, { color: '#7b61ff', weight: 3, opacity: .7, dashArray: '6 8' }).addTo(map);
  }
  if (latlngs.length) map.fitBounds(latlngs, { padding: [36, 36], maxZoom: 15 });
  else if (center) map.setView([center.lat, center.lng], 12);
  else map.setView([20.59, 78.96], 4);
  setTimeout(() => map.invalidateSize(), 150);
  return map;
}

export function confirmDialog(msg) { return window.confirm(msg); }

/** Client-side image downscale so uploads stay small and fast. */
export async function resizeImage(file, max = 1024) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.85));
    return { blob, dataUrl: canvas.toDataURL('image/jpeg', 0.7) };
  } finally {
    URL.revokeObjectURL(url);
  }
}
