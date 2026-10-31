// Mobile "More" menu for pages that don't fit in the bottom nav.
const LINKS = [
  ['✨', 'Find my destination', 'Quiz-based matching', '#/discover'],
  ['💜', 'For you', 'Personal recommendations', '#/foryou'],
  ['🧳', 'My trips', 'Saved itineraries & wishlist', '#/trips'],
  ['🎬', 'Demo showcase', 'Offline guided demo', '#/demo'],
  ['⚙️', 'Settings', 'API keys, language, theme', '#/settings'],
];

export function render(el) {
  el.innerHTML = `<div class="stack">${LINKS.map(([ic, t, d, href]) => `
    <a class="card card-hover row" href="${href}" style="flex-wrap:nowrap">
      <div class="feature-ic">${ic}</div>
      <div><b>${t}</b><div class="small muted">${d}</div></div>
    </a>`).join('')}</div>`;
}
