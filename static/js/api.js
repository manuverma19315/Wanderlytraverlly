import { store } from './store.js';
import { showProvider } from './ui.js';

export class ApiError extends Error {
  constructor(message, attempts = [], status = 0) {
    super(message);
    this.attempts = attempts;
    this.status = status;
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function headers(json = true) {
  const s = store.settings;
  const h = {};
  if (json) h['Content-Type'] = 'application/json';
  if (s.googleKey) h['X-Google-Key'] = s.googleKey;
  if (s.openrouterKey) h['X-OpenRouter-Key'] = s.openrouterKey;
  if (s.gemmaModel) h['X-Gemma-Model'] = s.gemmaModel;
  if (s.openrouterModel) h['X-OpenRouter-Model'] = s.openrouterModel;
  return h;
}

export const isDemo = () => store.settings.demo;

/** Wraps canned data in the same envelope as a real Gemma response. */
export async function demoResult(data, extra = {}) {
  await sleep(650 + Math.random() * 700);
  const res = { data: structuredClone(data), provider: 'Demo data', model: 'offline', latency_ms: 0, demo: true, ...extra };
  showProvider(res);
  return res;
}

async function handle(resp) {
  let body = null;
  try { body = await resp.json(); } catch { /* non-JSON */ }
  if (!resp.ok) {
    throw new ApiError(body?.error || `Request failed (${resp.status})`, body?.attempts || [], resp.status);
  }
  showProvider(body);
  return body;
}

/**
 * POST JSON to the backend. If demo mode is on, `demo` (data or function) is
 * returned instead and no network request is made.
 */
export async function post(path, body, demo) {
  if (isDemo() && demo !== undefined) {
    return demoResult(typeof demo === 'function' ? demo(body) : demo);
  }
  let resp;
  try {
    resp = await fetch(path, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  } catch {
    throw new ApiError('Network unavailable. Switch on Demo mode to keep exploring offline.');
  }
  return handle(resp);
}

export async function get(path) {
  const resp = await fetch(path, { headers: headers(false) });
  return handle(resp);
}

export async function upload(path, form, demo) {
  if (isDemo() && demo !== undefined) return demoResult(typeof demo === 'function' ? demo() : demo);
  let resp;
  try {
    resp = await fetch(path, { method: 'POST', headers: headers(false), body: form });
  } catch {
    throw new ApiError('Network unavailable. Switch on Demo mode to keep exploring offline.');
  }
  return handle(resp);
}

/** Streams the chat endpoint (SSE over POST). */
export async function streamChat(body, { onMeta, onDelta, demoReply }) {
  if (isDemo()) {
    onMeta?.({ provider: 'Demo data', model: 'offline', demo: true });
    showProvider({ provider: 'Demo data', demo: true });
    const words = demoReply.split(/(\s+)/);
    for (const w of words) { await sleep(18 + Math.random() * 30); onDelta(w); }
    return;
  }
  let resp;
  try {
    resp = await fetch('/api/chat', { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  } catch {
    throw new ApiError('Network unavailable. Switch on Demo mode to keep chatting offline.');
  }
  if (!resp.ok || !resp.body) {
    let msg = `Chat failed (${resp.status})`;
    try { msg = (await resp.json()).error || msg; } catch { /* ignore */ }
    throw new ApiError(msg);
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const events = buf.split('\n\n');
    buf = events.pop();
    for (const ev of events) {
      const line = ev.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return;
      let data;
      try { data = JSON.parse(payload); } catch { continue; }
      if (data.error) throw new ApiError(data.error, data.attempts || []);
      if (data.meta) { onMeta?.(data.meta); showProvider(data.meta); }
      if (data.delta) onDelta(data.delta);
    }
  }
}
