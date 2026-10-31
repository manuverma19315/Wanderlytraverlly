import { store } from '../store.js';
import { post } from '../api.js';
import { $, $$, esc, loader, errorCard } from '../ui.js';
import { DEMO_DISCOVER } from '../demo-data.js';
import { signals } from '../recommender.js';
import { destCard, bindDestCards, demoBanner } from '../components.js';

// Each option carries recommendation tags so quiz answers also train the recommender.
const QUESTIONS = [
  { key: 'vibe', q: 'Pick your ideal travel vibe', opts: [
    ['🏖️', 'Sun & sand', 'Beaches, sunsets, slow days', ['beach', 'relaxation']],
    ['🏔️', 'Mountain air', 'Peaks, treks and cosy cafés', ['mountains', 'adventure', 'nature']],
    ['🏰', 'Living history', 'Forts, temples and old towns', ['heritage', 'art']],
    ['🌆', 'City buzz', 'Food streets, nightlife, shopping', ['food', 'nightlife', 'shopping']],
  ] },
  { key: 'activity', q: 'A perfect afternoon looks like…', opts: [
    ['🍜', 'A food crawl', 'Street stalls & local legends', ['food']],
    ['🧗', 'Something thrilling', 'Rafting, paragliding, diving', ['adventure']],
    ['🧘', 'Total calm', 'Spa, yoga, a good book', ['relaxation', 'spiritual']],
    ['🖼️', 'Museums & markets', 'Art, crafts and souvenirs', ['art', 'shopping']],
  ] },
  { key: 'company', q: 'Who’s coming along?', opts: [
    ['🧍', 'Just me', 'Solo adventure', []],
    ['💑', 'My partner', 'Romantic getaway', ['relaxation']],
    ['👨‍👩‍👧', 'Family', 'Kid-friendly please', []],
    ['🎉', 'Friends', 'Group fun', ['nightlife', 'adventure']],
  ] },
  { key: 'budget', q: 'What’s the budget feeling?', opts: [
    ['🎒', 'Backpacker', 'Hostels & street food', [], 1],
    ['🧳', 'Comfortable', 'Nice hotels, some splurges', [], 2],
    ['💎', 'Treat myself', 'Luxury all the way', [], 3],
    ['🤷', 'Flexible', 'Show me the options', [], 2],
  ] },
  { key: 'distance', q: 'How far are you willing to go?', opts: [
    ['🚗', 'Weekend drive', 'Within a few hours', []],
    ['🚆', 'Within my country', 'A domestic flight or train', []],
    ['✈️', 'Short-haul abroad', 'Up to ~6 hours flying', []],
    ['🌍', 'Anywhere!', 'The world is the limit', []],
  ] },
  { key: 'season', q: 'When are you travelling?', opts: [
    ['❄️', 'Winter', 'Dec – Feb', []], ['🌸', 'Spring', 'Mar – May', []],
    ['☀️', 'Summer', 'Jun – Aug', []], ['🍂', 'Autumn', 'Sep – Nov', []],
  ] },
];

export function render(el) {
  const answers = {};
  let step = 0;

  const paintQuestion = () => {
    const Q = QUESTIONS[step];
    el.innerHTML = `
      ${demoBanner()}
      <div class="quiz-wrap">
        <div class="row between small muted"><span>Question ${step + 1} of ${QUESTIONS.length}</span>
          ${step ? '<button class="btn btn-sm btn-ghost" id="back">← Back</button>' : '<span></span>'}</div>
        <div class="progress" style="margin-top:8px"><i style="width:${(step / QUESTIONS.length) * 100}%"></i></div>
        <div class="quiz-q">${esc(Q.q)}</div>
        <div class="options">
          ${Q.opts.map((o, i) => `<button class="option ${answers[Q.key]?.i === i ? 'on' : ''}" data-i="${i}">
            <span class="emo">${o[0]}</span><span>${esc(o[1])}<small>${esc(o[2])}</small></span></button>`).join('')}
        </div>
        <div class="row" style="margin-top:22px;justify-content:center">
          <span class="small muted">Home base:</span>
          <input class="input" id="home" value="${esc(store.settings.home)}" style="max-width:200px;padding:7px 12px">
        </div>
      </div>`;
    $$('.option', el).forEach(b => b.onclick = () => {
      const i = +b.dataset.i;
      answers[Q.key] = { i, label: Q.opts[i][1], tags: Q.opts[i][3], budget: Q.opts[i][4] };
      store.setSettings({ home: $('#home', el).value.trim() || 'India' });
      b.classList.add('on');
      setTimeout(() => { step++; step < QUESTIONS.length ? paintQuestion() : submit(); }, 220);
    });
    const back = $('#back', el);
    if (back) back.onclick = () => { step--; paintQuestion(); };
  };

  const submit = async () => {
    const tags = Object.values(answers).flatMap(a => a.tags);
    const budget = answers.budget?.budget || 2;
    signals.quiz(Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v.label])), tags, budget);
    const stop = loader(el, ['Reading your answers…', 'Figuring out your traveller persona…', 'Matching destinations worldwide…', 'Finding a hidden gem…'], '✨');
    try {
      const res = await post('/api/discover', {
        answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v.label])),
        home: store.settings.home,
      }, DEMO_DISCOVER);
      stop();
      paintResults(res.data);
    } catch (err) {
      stop();
      errorCard(el, err, () => paintResults(DEMO_DISCOVER));
    }
  };

  const paintResults = data => {
    const dests = (data.destinations || []).sort((a, b) => (b.match || 0) - (a.match || 0));
    el.innerHTML = `
      <div class="card persona" style="background:var(--hero);color:#fff;border:0">
        <div class="big">🧭</div>
        <div class="small" style="opacity:.85;font-weight:700;letter-spacing:.08em">YOUR TRAVELLER PERSONA</div>
        <h1 style="color:#fff;margin:6px 0">${esc(data.persona || 'Explorer')}</h1>
        <p style="opacity:.92;max-width:560px;margin:0 auto">${esc(data.persona_desc || '')}</p>
      </div>
      <div class="section-head"><h2>Your top matches</h2>
        <div class="row"><button class="btn btn-ghost btn-sm" id="retake">↻ Retake quiz</button><a class="btn btn-ghost btn-sm" href="#/foryou">More for you →</a></div></div>
      <div class="grid grid-3" id="results">${dests.map(d => destCard(d, { match: d.match })).join('')}</div>`;
    bindDestCards($('#results', el), dests);
    $('#retake', el).onclick = () => { step = 0; paintQuestion(); };
  };

  paintQuestion();
}
