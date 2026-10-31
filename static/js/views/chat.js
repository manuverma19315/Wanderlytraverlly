import { store } from '../store.js';
import { streamChat } from '../api.js';
import { $, $$, esc, md, toast } from '../ui.js';
import { demoChatReply } from '../demo-data.js';

const LANGS = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Japanese', 'Tamil', 'Bengali', 'Arabic'];
const QUICK = [
  'Plan a 2-day weekend near Delhi under ₹10k',
  'What should I eat in Jaipur?',
  'Is it safe to travel solo in Goa?',
  'Best hidden gems in Kerala?',
  'What to pack for Manali in December?',
];

export function render(el, { query }) {
  const tripRef = query.get('trip');
  const trip = tripRef === 'draft' ? store.draft : tripRef ? store.getTrip(tripRef) : null;
  let messages = store.chat;
  let busy = false;

  el.innerHTML = `
    <div class="chat">
      <div class="row between" style="margin-bottom:10px">
        <div class="row">
          ${trip ? `<span class="tag">🧳 Talking about: ${esc(trip.title)}</span>` : '<span class="small muted">Ask anything travel. Tip: open a trip and tap “Ask” to chat about it.</span>'}
        </div>
        <div class="row">
          <select class="input" id="chat-lang" style="width:auto;padding:6px 10px" title="Reply language">
            ${LANGS.map(l => `<option ${l === store.settings.language ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <button class="btn btn-sm btn-ghost" id="clear">🧹 Clear</button>
        </div>
      </div>
      <div class="chat-log" id="log" aria-live="polite"></div>
      <div class="chips" id="quick" style="margin-bottom:10px"></div>
      <form class="chat-input" id="chat-form">
        <textarea id="msg" rows="1" placeholder="Ask your travel buddy…" aria-label="Message"></textarea>
        <button class="btn btn-primary" type="submit" id="send">Send ➤</button>
      </form>
    </div>`;

  const log = $('#log', el);
  const input = $('#msg', el);

  const paintLog = () => {
    log.innerHTML = messages.length ? messages.map(m => bubble(m)).join('') : `
      <div class="empty" style="margin:auto">
        <div class="big">💬</div><h3>Hi! I’m your Gemma 4 travel buddy.</h3>
        <p>Ask about food, budgets, weather, visas, packing, hidden gems, in any language.</p>
      </div>`;
    log.scrollTop = log.scrollHeight;
    $('#quick', el).innerHTML = (trip ? [`Make day 1 of my ${trip.destination} trip more relaxed`, 'What should I book in advance?', 'Rainy day backup plan?'] : QUICK)
      .map(q => `<span class="chip">${esc(q)}</span>`).join('');
    $$('#quick .chip', el).forEach(c => c.onclick = () => send(c.textContent));
  };

  const bubble = m => `<div class="msg ${m.role === 'user' ? 'user' : 'bot'}">${m.role === 'user' ? esc(m.content) : md(m.content)}
    ${m.meta ? `<div class="meta">${esc(m.meta)}</div>` : ''}</div>`;

  async function send(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true;
    $('#send', el).disabled = true;
    input.value = '';
    input.style.height = '';
    messages = [...messages, { role: 'user', content: text }];
    paintLog();
    const bot = document.createElement('div');
    bot.className = 'msg bot';
    bot.innerHTML = '<span class="typing"><span></span><span></span><span></span></span>';
    log.appendChild(bot);
    log.scrollTop = log.scrollHeight;

    let reply = '', meta = '';
    try {
      await streamChat(
        { messages: messages.map(({ role, content }) => ({ role, content })), trip, language: $('#chat-lang', el).value },
        {
          demoReply: demoChatReply(text),
          onMeta: m => { meta = m.demo ? 'Demo data · offline' : `Gemma 4 · ${m.model}`; },
          onDelta: d => {
            reply += d;
            bot.innerHTML = md(reply);
            log.scrollTop = log.scrollHeight;
          },
        },
      );
      if (!reply) throw new Error('No reply received.');
      messages = [...messages, { role: 'assistant', content: reply, meta }];
    } catch (err) {
      bot.remove();
      toast(err.message, 'err');
      const fallback = demoChatReply(text);
      messages = [...messages, { role: 'assistant', content: `⚠️ Gemma is unreachable right now (${err.message}). Here’s an offline answer:\n\n${fallback}`, meta: 'Offline fallback' }];
    }
    store.chat = messages;
    busy = false;
    $('#send', el).disabled = false;
    paintLog();
    input.focus();
  }

  $('#chat-form', el).onsubmit = e => { e.preventDefault(); send(input.value); };
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); }
  });
  input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px'; });
  $('#chat-lang', el).onchange = e => store.setSettings({ language: e.target.value });
  $('#clear', el).onclick = () => { messages = []; store.chat = []; paintLog(); };

  paintLog();
  const q = query.get('q');
  if (q) { history.replaceState(null, '', '#/chat'); send(q); } else input.focus();
}
