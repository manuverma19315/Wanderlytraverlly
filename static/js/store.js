// Thin localStorage layer. Every read/write is guarded so the app still works
// in private windows or when storage is blocked.

const NS = 'wanderly.';
const memory = {};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw == null ? (memory[key] ?? fallback) : JSON.parse(raw);
  } catch {
    return memory[key] ?? fallback;
  }
}

function write(key, value) {
  memory[key] = value;
  try { localStorage.setItem(NS + key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
  window.dispatchEvent(new CustomEvent('store:' + key, { detail: value }));
}

const DEFAULT_SETTINGS = {
  googleKey: '', openrouterKey: '', gemmaModel: '', openrouterModel: '',
  currency: 'INR', language: 'English', theme: 'system', demo: false, home: 'India',
};

export const store = {
  get settings() { return { ...DEFAULT_SETTINGS, ...read('settings', {}) }; },
  setSettings(patch) { write('settings', { ...this.settings, ...patch }); },

  get trips() { return read('trips', []); },
  saveTrip(trip) {
    const trips = this.trips.filter(t => t.id !== trip.id);
    trip.id = trip.id || 't' + Date.now().toString(36);
    trip.savedAt = Date.now();
    write('trips', [trip, ...trips]);
    return trip;
  },
  deleteTrip(id) { write('trips', this.trips.filter(t => t.id !== id)); },
  getTrip(id) { return this.trips.find(t => t.id === id); },

  // Last generated (possibly unsaved) trip, so refreshing the page doesn't lose it.
  get draft() { return read('draft', null); },
  set draft(trip) { write('draft', trip); },

  // Recommendation signals.
  get profile() { return read('profile', { tags: {}, liked: [], disliked: [], seen: [], quiz: null, updated: 0 }); },
  setProfile(p) { write('profile', { ...p, updated: Date.now() }); },

  get saved() { return read('saved', []); },
  toggleSaved(place) {
    const list = this.saved;
    const i = list.findIndex(p => p.name === place.name);
    if (i >= 0) list.splice(i, 1); else list.unshift({ ...place, savedAt: Date.now() });
    write('saved', list);
    return i < 0;
  },
  isSaved(name) { return this.saved.some(p => p.name === name); },

  get chat() { return read('chat', []); },
  set chat(msgs) { write('chat', msgs.slice(-40)); },

  get checks() { return read('checks', {}); },
  setCheck(key, val) { const c = this.checks; c[key] = val; write('checks', c); },

  get lensHistory() { return read('lens', []); },
  addLens(item) { write('lens', [item, ...this.lensHistory].slice(0, 12)); },

  exportAll() {
    const out = {};
    for (const k of ['trips', 'profile', 'saved', 'chat', 'checks', 'lens']) out[k] = read(k, null);
    return out;
  },
  importAll(data) {
    for (const [k, v] of Object.entries(data || {})) if (v != null && k !== 'settings') write(k, v);
  },
  clearAll() {
    const keep = this.settings;
    try {
      Object.keys(localStorage).filter(k => k.startsWith(NS)).forEach(k => localStorage.removeItem(k));
    } catch { /* ignore */ }
    Object.keys(memory).forEach(k => delete memory[k]);
    write('settings', keep);
  },
};
