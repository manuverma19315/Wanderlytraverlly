import { store } from '../store.js';
import { upload, isDemo, demoResult } from '../api.js';
import { $, $$, esc, errorCard, toast, resizeImage } from '../ui.js';
import { DEMO_LENS } from '../demo-data.js';
import { signals } from '../recommender.js';
import { demoBanner } from '../components.js';

const LANGS = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Japanese', 'Tamil', 'Bengali', 'Arabic'];
const KIND_LABEL = { landmark: '🏛️ Landmark', food: '🍽️ Food', artwork: '🎨 Artwork', sign: '🪧 Sign / text', nature: '🌿 Nature', object: '🔎 Object', other: '🔎 Other' };

export function render(el) {
  let current = null; // { blob, dataUrl, sampleId }

  el.innerHTML = `
    ${demoBanner('Demo mode: pick one of the sample photos to see Gemma 4 vision results.')}
    <div class="split">
      <div class="stack">
        <div class="card pad-lg">
          <h2 style="margin-bottom:4px">Travel Lens 📷</h2>
          <p class="muted small">Snap or upload a monument, dish, sign, menu or artwork. Gemma 4’s vision identifies it, tells its story and translates any text.</p>
          <label class="dropzone" id="drop" style="display:block;margin-top:14px">
            <input type="file" id="file" accept="image/*" capture="environment" hidden>
            <div class="big">📸</div>
            <b>Tap to take a photo or upload</b>
            <div class="small muted">or drag & drop an image here</div>
          </label>
          <div id="preview" class="hidden" style="margin-top:14px"></div>
          <div class="grid grid-2" style="margin-top:14px">
            <div class="field"><label for="lens-q">Ask something specific (optional)</label>
              <input class="input" id="lens-q" placeholder="Is this vegetarian? When was it built?"></div>
            <div class="field"><label for="lens-lang">Answer & translate into</label>
              <select class="input" id="lens-lang">${LANGS.map(l => `<option ${l === store.settings.language ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          </div>
          <button class="btn btn-hero btn-lg btn-block" id="analyse" style="margin-top:14px" disabled>🔍 Identify with Gemma 4</button>
        </div>
        <div class="card">
          <h3>Try a sample</h3>
          <div class="sample-thumbs">
            ${DEMO_LENS.map(s => `<button data-sample="${s.id}" title="${esc(s.label)}"><img src="${s.image}" alt="${esc(s.label)}"></button>`).join('')}
          </div>
          <div class="row tiny muted" style="margin-top:8px;justify-content:space-around">${DEMO_LENS.map(s => `<span>${esc(s.label)}</span>`).join('')}</div>
        </div>
      </div>
      <div id="lens-result" class="stack">
        ${historyHtml()}
      </div>
    </div>`;

  const fileInput = $('#file', el);
  const drop = $('#drop', el);
  const btn = $('#analyse', el);

  const setImage = async (file, sampleId = null) => {
    try {
      current = { ...(await resizeImage(file)), sampleId };
    } catch {
      toast('Could not read that image', 'err');
      return;
    }
    const pv = $('#preview', el);
    pv.classList.remove('hidden');
    pv.innerHTML = `<div class="lens-preview"><img src="${current.dataUrl}" alt="Your photo"></div>`;
    drop.classList.add('hidden');
    btn.disabled = false;
    const reset = document.createElement('button');
    reset.className = 'btn btn-sm btn-ghost';
    reset.style.marginTop = '8px';
    reset.textContent = '↺ Choose another photo';
    reset.onclick = () => { current = null; pv.classList.add('hidden'); drop.classList.remove('hidden'); btn.disabled = true; fileInput.value = ''; };
    pv.appendChild(reset);
  };

  fileInput.onchange = () => fileInput.files[0] && setImage(fileInput.files[0]);
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('over');
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith('image/')) setImage(f);
  });
  $$('[data-sample]', el).forEach(b => b.onclick = async () => {
    const s = DEMO_LENS.find(x => x.id === b.dataset.sample);
    const blob = await (await fetch(s.image)).blob();
    await setImage(new File([blob], `${s.id}.svg`, { type: blob.type || 'image/svg+xml' }), s.id);
    if (isDemo()) analyse();
  });

  btn.onclick = analyse;

  async function analyse() {
    if (!current) return;
    const out = $('#lens-result', el);
    const pv = $('.lens-preview', el);
    pv?.insertAdjacentHTML('beforeend', '<div class="scan"></div>');
    btn.disabled = true;
    btn.textContent = '🔍 Gemma 4 is looking…';
    out.innerHTML = `<div class="card">${['80%', '60%', '90%', '70%'].map(w => `<div class="skeleton" style="height:16px;width:${w};margin:10px 0"></div>`).join('')}</div>`;
    const sample = DEMO_LENS.find(s => s.id === current.sampleId) || DEMO_LENS[0];
    try {
      let res;
      if (isDemo()) {
        res = await demoResult(sample.data);
      } else {
        const form = new FormData();
        form.append('image', current.blob, 'photo.jpg');
        form.append('question', $('#lens-q', el).value);
        form.append('language', $('#lens-lang', el).value);
        res = await upload('/api/vision', form);
      }
      paintResult(res.data, res);
    } catch (err) {
      errorCard(out, err, async () => paintResult(sample.data, await demoResult(sample.data)));
    } finally {
      $('.scan', el)?.remove();
      btn.disabled = false;
      btn.textContent = '🔍 Identify with Gemma 4';
    }
  }

  function paintResult(d, meta) {
    const out = $('#lens-result', el);
    store.addLens({ name: d.name, kind: d.kind, location: d.location, thumb: current?.dataUrl?.length < 60000 ? current.dataUrl : null, at: Date.now() });
    if (d.tags?.length) signals.interests(d.tags, 0.7);
    out.innerHTML = `
      <div class="card pad-lg">
        <div class="row between">
          <span class="tag">${KIND_LABEL[d.kind] || KIND_LABEL.other}</span>
          <span class="tiny muted">${esc(meta.demo ? 'Demo data' : meta.model)}</span>
        </div>
        <h2 style="margin:10px 0 2px">${esc(d.name)}</h2>
        <div class="small muted">📍 ${esc(d.location || 'Unknown location')}</div>
        <div class="row" style="margin:12px 0 4px;gap:8px"><span class="tiny muted" style="width:80px">Confidence</span>
          <div class="confidence" style="flex:1"><i style="width:${+d.confidence || 0}%"></i></div><b class="small">${+d.confidence || 0}%</b></div>
        <p style="margin-top:12px">${esc(d.summary)}</p>
        ${d.text_found ? `
          <div class="card" style="background:var(--bg-soft);border:0;margin:12px 0">
            <div class="grid grid-2">
              <div><div class="tiny muted" style="font-weight:700">TEXT FOUND</div><div style="white-space:pre-line;font-weight:600">${esc(d.text_found)}</div></div>
              <div><div class="tiny muted" style="font-weight:700">TRANSLATION</div><div style="white-space:pre-line">${esc(d.translation)}</div></div>
            </div>
          </div>` : ''}
        <h3 style="margin-top:14px">📖 The story</h3>
        <p class="muted">${esc(d.history)}</p>
        <div class="grid grid-2">
          <div><h3>🤓 Fun facts</h3><ul class="list-clean small">${(d.fun_facts || []).map(f => `<li>${esc(f)}</li>`).join('')}</ul></div>
          <div><h3>🧭 Visitor tips</h3><ul class="list-clean small">${(d.visit_tips || []).map(f => `<li>${esc(f)}</li>`).join('')}</ul></div>
        </div>
        ${d.nearby?.length ? `<h3 style="margin-top:16px">📍 Nearby to explore</h3>
          <div class="stack" style="gap:8px">${d.nearby.map(n => `<div class="row between small"><span><b>${esc(n.name)}</b> <span class="muted">· ${esc(n.why)}</span></span></div>`).join('')}</div>` : ''}
        ${d.follow_up_questions?.length ? `<div class="divider"></div><div class="small muted" style="margin-bottom:6px">Ask the travel buddy:</div>
          <div class="chips">${d.follow_up_questions.map(q => `<a class="chip" href="#/chat?q=${encodeURIComponent(`About ${d.name}: ${q}`)}">${esc(q)}</a>`).join('')}</div>` : ''}
        <div class="row" style="margin-top:16px">
          ${d.kind === 'landmark' && d.location && d.location !== 'unknown' ? `<a class="btn btn-primary" href="#/plan?dest=${encodeURIComponent(d.location)}">🗺️ Plan a trip here</a>` : ''}
          <a class="btn btn-ghost" href="#/nearby">📍 What else is nearby?</a>
        </div>
      </div>`;
  }
}

function historyHtml() {
  const h = store.lensHistory;
  if (!h.length) {
    return `<div class="card empty"><div class="big">🔍</div><h3>Point, shoot, discover</h3>
      <p>Results appear here. Try the Taj Mahal sample, or translate the Hindi sign.</p></div>`;
  }
  return `<div class="card"><h3>Recent discoveries</h3><div class="stack" style="gap:10px">
    ${h.map(x => `<div class="row" style="flex-wrap:nowrap">
      ${x.thumb ? `<img src="${x.thumb}" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:10px">` : '<span style="font-size:1.6rem">📷</span>'}
      <div><b>${esc(x.name)}</b><div class="tiny muted">${esc(KIND_LABEL[x.kind] || '')} · ${esc(x.location || '')}</div></div></div>`).join('')}
  </div></div>`;
}
