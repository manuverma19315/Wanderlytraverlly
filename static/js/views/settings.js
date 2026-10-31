import { store } from '../store.js';
import { $, $$, esc, toast } from '../ui.js';

const GOOGLE_MODELS = ['gemma-4-31b-it', 'gemma-4-26b-a4b-it'];
const OR_MODELS = ['google/gemma-4-31b-it:free', 'google/gemma-4-26b-a4b-it:free', 'google/gemma-4-31b-it', 'google/gemma-4-26b-a4b-it'];

export function render(el) {
  const s = store.settings;
  el.innerHTML = `
    <div class="grid grid-2" style="align-items:start">
      <div class="stack">
        <div class="card pad-lg">
          <h2>🔑 Gemma 4 API keys</h2>
          <p class="small muted">Keys are stored only in this browser’s localStorage and sent to the Wanderly server per request, which forwards them to the provider. Nothing is saved on the server.</p>

          <div class="field" style="margin-top:14px">
            <label for="gk">Google AI Studio key <span class="tag green">primary</span></label>
            <div class="input-group">
              <input class="input" id="gk" type="password" placeholder="AIza…" value="${esc(s.googleKey)}" autocomplete="off">
              <button class="btn btn-sm btn-ghost btn-icon" type="button" data-show="gk" title="Show / hide">👁</button>
            </div>
            <span class="tiny muted">Free key: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a></span>
          </div>
          <div class="field" style="margin-top:14px">
            <label for="ok">OpenRouter key <span class="tag amber">fallback</span></label>
            <div class="input-group">
              <input class="input" id="ok" type="password" placeholder="sk-or-…" value="${esc(s.openrouterKey)}" autocomplete="off">
              <button class="btn btn-sm btn-ghost btn-icon" type="button" data-show="ok" title="Show / hide">👁</button>
            </div>
            <span class="tiny muted">Free Gemma 4 models: <a href="https://openrouter.ai/keys" target="_blank" rel="noopener">openrouter.ai/keys</a></span>
          </div>

          <details style="margin-top:14px">
            <summary class="small" style="cursor:pointer;font-weight:650">Advanced: choose models</summary>
            <div class="grid grid-2" style="margin-top:10px">
              <div class="field"><label for="gm">AI Studio model</label>
                <input class="input" id="gm" list="gm-list" placeholder="${GOOGLE_MODELS[0]} (default)" value="${esc(s.gemmaModel)}">
                <datalist id="gm-list">${GOOGLE_MODELS.map(m => `<option value="${m}">`).join('')}</datalist></div>
              <div class="field"><label for="om">OpenRouter model</label>
                <input class="input" id="om" list="om-list" placeholder="${OR_MODELS[0]} (default)" value="${esc(s.openrouterModel)}">
                <datalist id="om-list">${OR_MODELS.map(m => `<option value="${m}">`).join('')}</datalist></div>
            </div>
          </details>

          <div class="row" style="margin-top:18px">
            <button class="btn btn-primary" id="save-keys">💾 Save keys</button>
            <button class="btn btn-ghost" id="test">⚡ Test connection</button>
          </div>
          <div id="test-out" style="margin-top:12px"></div>
        </div>
        <div class="card">
          <h3>How the fallback works</h3>
          <ol class="small muted" style="padding-left:1.2em;margin:0">
            <li>Your AI Studio key → Gemma 4 31B, then 26B MoE</li>
            <li>Server AI Studio key (if the host set one)</li>
            <li>Your OpenRouter key → free Gemma 4 models</li>
            <li>Server OpenRouter key</li>
            <li>Still failing? Every screen offers a one-click demo result.</li>
          </ol>
        </div>
      </div>

      <div class="stack">
        <div class="card pad-lg">
          <h2>🎛️ Preferences</h2>
          <div class="grid grid-2" style="margin-top:10px">
            <div class="field"><label for="cur">Currency</label>
              <select class="input" id="cur">${['INR', 'USD', 'EUR', 'GBP', 'JPY'].map(c => `<option ${c === s.currency ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
            <div class="field"><label for="lang">Language</label>
              <select class="input" id="lang">${['English', 'Hindi', 'Spanish', 'French', 'German', 'Japanese', 'Tamil', 'Bengali', 'Marathi', 'Arabic'].map(c => `<option ${c === s.language ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
            <div class="field"><label for="home">Home base</label><input class="input" id="home" value="${esc(s.home)}"></div>
            <div class="field"><label>Theme</label>
              <div class="segmented" id="theme">${['system', 'light', 'dark'].map(t => `<button type="button" data-v="${t}" class="${s.theme === t ? 'on' : ''}">${t}</button>`).join('')}</div></div>
          </div>
          <div class="divider"></div>
          <div class="row between">
            <div><b>Demo mode</b><div class="small muted">Use built-in data everywhere. Works with no internet.</div></div>
            <label class="switch"><input type="checkbox" id="demo" ${s.demo ? 'checked' : ''}><span></span></label>
          </div>
        </div>
        <div class="card">
          <h3>🗄️ Your data</h3>
          <p class="small muted">Trips: ${store.trips.length} · Saved places: ${store.saved.length} · Chat messages: ${store.chat.length}</p>
          <div class="row">
            <a class="btn btn-ghost btn-sm" href="#/trips">Export / import</a>
            <button class="btn btn-danger btn-sm" id="wipe">Clear all data</button>
            <button class="btn btn-danger btn-sm" id="wipe-keys">Remove keys</button>
          </div>
        </div>
      </div>
    </div>`;

  $$('[data-show]', el).forEach(b => b.onclick = () => {
    const i = $('#' + b.dataset.show, el);
    i.type = i.type === 'password' ? 'text' : 'password';
  });

  const saveKeys = () => store.setSettings({
    googleKey: $('#gk', el).value.trim(), openrouterKey: $('#ok', el).value.trim(),
    gemmaModel: $('#gm', el).value.trim(), openrouterModel: $('#om', el).value.trim(),
  });
  $('#save-keys', el).onclick = () => { saveKeys(); toast('Keys saved in this browser 🔒'); };

  $('#test', el).onclick = async () => {
    saveKeys();
    const out = $('#test-out', el);
    const btn = $('#test', el);
    btn.disabled = true; btn.textContent = '⏳ Testing…';
    out.innerHTML = '<div class="skeleton" style="height:60px"></div>';
    const h = {};
    const st = store.settings;
    if (st.googleKey) h['X-Google-Key'] = st.googleKey;
    if (st.openrouterKey) h['X-OpenRouter-Key'] = st.openrouterKey;
    if (st.gemmaModel) h['X-Gemma-Model'] = st.gemmaModel;
    if (st.openrouterModel) h['X-OpenRouter-Model'] = st.openrouterModel;
    try {
      const [ping, models] = await Promise.all([
        fetch('/api/ping', { method: 'POST', headers: h }).then(r => r.json()),
        fetch('/api/models', { headers: h }).then(r => r.json()).catch(() => ({})),
      ]);
      const provRow = (name, m) => !m ? '' : m.ok
        ? `<div class="small">✅ <b>${name}</b>: key valid · Gemma models: ${m.models.filter(x => x.includes('gemma-4')).map(x => `<span class="kbd">${esc(x)}</span>`).join(' ') || '<i>none listed</i>'}</div>`
        : `<div class="small">❌ <b>${name}</b>: ${esc(m.error)}</div>`;
      out.innerHTML = `<div class="card" style="background:var(--bg-soft);border:0">
        ${ping.reply ? `<div><b>🟢 ${esc(ping.reply)}</b></div><div class="tiny muted">${esc(ping.model)} via ${esc(ping.provider)} · ${(ping.latency_ms / 1000).toFixed(1)}s</div>`
          : `<div><b>🔴 ${esc(ping.error || 'Failed')}</b></div>${(ping.attempts || []).map(a => `<div class="tiny muted">${esc(a)}</div>`).join('')}`}
        <div class="divider" style="margin:10px 0"></div>
        ${provRow('AI Studio', models.google)}${provRow('OpenRouter', models.openrouter)}
      </div>`;
    } catch {
      out.innerHTML = '<div class="card error-card small">Could not reach the Wanderly server. Are you offline? Demo mode still works.</div>';
    }
    btn.disabled = false; btn.textContent = '⚡ Test connection';
  };

  $('#cur', el).onchange = e => store.setSettings({ currency: e.target.value });
  $('#lang', el).onchange = e => store.setSettings({ language: e.target.value });
  $('#home', el).onchange = e => store.setSettings({ home: e.target.value.trim() || 'India' });
  $$('#theme button', el).forEach(b => b.onclick = () => {
    $$('#theme button', el).forEach(x => x.classList.toggle('on', x === b));
    store.setSettings({ theme: b.dataset.v });
    if (b.dataset.v === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = b.dataset.v;
  });
  $('#demo', el).onchange = e => {
    store.setSettings({ demo: e.target.checked });
    toast(e.target.checked ? '🎬 Demo mode on' : '⚡ Live Gemma mode');
  };
  $('#wipe', el).onclick = () => {
    if (!confirm('Delete all trips, saved places, chat and profile from this browser?')) return;
    store.clearAll();
    toast('All data cleared');
    render(el);
  };
  $('#wipe-keys', el).onclick = () => {
    store.setSettings({ googleKey: '', openrouterKey: '' });
    toast('Keys removed');
    render(el);
  };
}
