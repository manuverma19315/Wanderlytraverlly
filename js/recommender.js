// Client-side content-based recommender.
//  1. Every interaction (quiz answer, like, save, trip planned) nudges a tag-weight profile.
//  2. Places are scored by cosine similarity between the profile and their tags,
//     blended with a popularity prior and a budget-fit term.
//  3. Results are diversified with Maximal Marginal Relevance (MMR) so the list
//     doesn't collapse into ten beach towns.
//  4. Gemma 4 then re-ranks the top-N and explains "why this fits you" (/api/recommend).

import { store } from './store.js';
import { CATALOG, TAGS } from './catalog.js';

const DECAY = 0.97;      // older signals fade a little on every new interaction
const W_SIM = 0.72, W_POP = 0.18, W_BUDGET = 0.10;
const MMR_LAMBDA = 0.75;

const TAG_ALIASES = {
  history: 'heritage', culture: 'heritage', museum: 'art', museums: 'art', temples: 'spiritual', temple: 'spiritual',
  beaches: 'beach', hiking: 'adventure', trekking: 'adventure', party: 'nightlife', street: 'food', 'street food': 'food',
  wellness: 'relaxation', yoga: 'spiritual', photography: 'art', markets: 'shopping', shopping: 'shopping',
  mountain: 'mountains', snow: 'mountains', safari: 'wildlife', animals: 'wildlife', sight: 'heritage', activity: 'adventure',
};

export function normTag(t) {
  const k = String(t || '').toLowerCase().trim();
  return TAGS.includes(k) ? k : TAG_ALIASES[k] || null;
}

function bump(tags, weight) {
  const p = store.profile;
  for (const k of Object.keys(p.tags)) p.tags[k] *= DECAY;
  for (const raw of tags) {
    const t = normTag(raw);
    if (t) p.tags[t] = Math.max(-3, Math.min(10, (p.tags[t] || 0) + weight));
  }
  return p;
}

export const signals = {
  like(place) {
    const p = bump(place.tags || [], 1.5);
    p.liked = [...p.liked.filter(n => n !== place.name), place.name].slice(-30);
    p.disliked = p.disliked.filter(n => n !== place.name);
    store.setProfile(p);
  },
  dislike(place) {
    const p = bump(place.tags || [], -1);
    p.disliked = [...p.disliked.filter(n => n !== place.name), place.name].slice(-30);
    p.liked = p.liked.filter(n => n !== place.name);
    store.setProfile(p);
  },
  save(place) { store.setProfile(bump(place.tags || [], 1)); },
  interests(tags, weight = 2) { store.setProfile(bump(tags, weight)); },
  quiz(answers, tags, budget) {
    const p = bump(tags, 2.5);
    p.quiz = { answers, budget, at: Date.now() };
    store.setProfile(p);
  },
  viewed(name) {
    const p = store.profile;
    p.seen = [...p.seen.filter(n => n !== name), name].slice(-50);
    store.setProfile(p);
  },
};

function vec(tags) {
  const v = {};
  for (const t of tags || []) { const n = normTag(t); if (n) v[n] = 1; }
  return v;
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const k of TAGS) {
    const x = a[k] || 0, y = b[k] || 0;
    dot += x * y; na += x * x; nb += y * y;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

function jaccard(a, b) {
  const A = new Set(a.map(normTag).filter(Boolean)), B = new Set(b.map(normTag).filter(Boolean));
  const inter = [...A].filter(x => B.has(x)).length;
  return inter / (A.size + B.size - inter || 1);
}

export function hasProfile() {
  const p = store.profile;
  return Object.values(p.tags).some(v => v > 0.3) || p.liked.length > 0;
}

/** Top tags of the user profile, for display. */
export function topTags(n = 6) {
  return Object.entries(store.profile.tags).filter(([, v]) => v > 0.2).sort((a, b) => b[1] - a[1]).slice(0, n);
}

/** Score + diversify the catalog. Returns places with .score (0-100) and .reason. */
export function recommend(k = 9, pool = CATALOG) {
  const p = store.profile;
  const profileVec = { ...p.tags };
  const budget = p.quiz?.budget;
  const cold = !hasProfile();

  const scored = pool
    .filter(pl => !p.disliked.includes(pl.name))
    .map(pl => {
      const sim = cold ? 0 : Math.max(0, cosine(profileVec, vec(pl.tags)));
      const budgetFit = budget ? 1 - Math.abs((pl.budget || 2) - budget) / 2 : 0.5;
      let score = cold ? pl.pop : W_SIM * sim + W_POP * pl.pop + W_BUDGET * budgetFit;
      if (p.liked.includes(pl.name)) score *= 0.6; // already liked: show, but make room for new ideas
      const matched = (pl.tags || []).filter(t => (profileVec[t] || 0) > 0.5);
      return {
        ...pl, raw: score, score: Math.round(Math.min(0.99, score) * 100),
        reason: cold ? 'Trending with travellers' : matched.length ? `Matches your love of ${matched.slice(0, 2).join(' & ')}` : 'Something a little different',
      };
    })
    .sort((a, b) => b.raw - a.raw);

  // MMR diversification.
  const picked = [];
  const candidates = scored.slice(0, 30);
  while (picked.length < k && candidates.length) {
    let best = 0, bestVal = -Infinity;
    candidates.forEach((c, i) => {
      const redundancy = picked.length ? Math.max(...picked.map(s => jaccard(c.tags, s.tags))) : 0;
      const val = MMR_LAMBDA * c.raw - (1 - MMR_LAMBDA) * redundancy;
      if (val > bestVal) { bestVal = val; best = i; }
    });
    picked.push(candidates.splice(best, 1)[0]);
  }
  return picked;
}

/** "Because you liked X" — nearest neighbours by tag overlap. */
export function similarTo(name, k = 4) {
  const base = CATALOG.find(c => c.name === name) || store.saved.find(s => s.name === name);
  if (!base?.tags) return [];
  return CATALOG.filter(c => c.name !== name && !store.profile.disliked.includes(c.name))
    .map(c => ({ ...c, sim: jaccard(base.tags, c.tags) + c.pop * 0.1 }))
    .sort((a, b) => b.sim - a.sim).slice(0, k);
}

/** Offline stand-in for the Gemma re-rank step. */
export function demoRerank(candidates) {
  const top = topTags(3).map(([t]) => t);
  return {
    picks: candidates.slice(0, 6).map(c => ({
      name: c.name, score: c.score,
      why: `${c.blurb} A strong fit for your ${(c.tags.filter(t => top.includes(t))[0] || c.tags[0])} streak.`,
    })),
    new_ideas: [
      { name: 'Chand Baori', country: 'India', emoji: '🪜', why: 'A 13-storey stepwell that heritage lovers rarely hear about.', tags: ['heritage', 'art'] },
      { name: 'Ziro Valley', country: 'India', emoji: '🌾', why: 'Pine hills and Apatani villages with a famous music festival.', tags: ['nature', 'relaxation'] },
      { name: 'Luang Prabang', country: 'Laos', emoji: '🛕', why: 'Saffron-robed alms rounds and French bakeries on the Mekong.', tags: ['spiritual', 'food'] },
      { name: 'Gokarna', country: 'India', emoji: '🌊', why: 'Goa’s quieter, cliff-lined cousin.', tags: ['beach', 'relaxation'] },
    ],
  };
}
