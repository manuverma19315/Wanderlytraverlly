# 🧭 Wanderly: AI Travel Planner powered by Gemma 4

Plan trips, discover nearby gems, identify landmarks from a photo and get personal recommendations.
Everything runs in **one FastAPI app** (frontend + backend), uses **browser localStorage instead of a database**,
and deploys to **Render as a single web service**.

## ✨ Features

| Feature | What it does | Gemma 4 capability |
|---|---|---|
| 🗺️ **AI itinerary** | Day-by-day plan with real places, timings, costs, lat/lng → interactive map, budget donut, 7-day weather. Drag to reorder, regenerate any day, save, share link, print to PDF. | Structured JSON output, long-context planning |
| 📷 **Travel Lens** | Snap/upload a monument, dish, sign or artwork → name, story, fun facts, visitor tips, nearby places, **OCR + translation** of any text. | **Multimodal vision** |
| 📍 **Nearby places** | GPS or typed place → real POIs from Wikipedia/OpenStreetMap → Gemma ranks for your interests and writes hooks. Filters, sort, directions. | Grounded ranking |
| ✨ **Find my destination** | 6-question quiz → traveller persona + matched destinations with match %. | Reasoning over preferences |
| 💜 **Recommendation engine** | Hybrid recommender (see below) with "Because you liked X" rows and 💜/👎 feedback. | Re-ranking + explanations |
| 💬 **Travel buddy** | Streaming chat grounded in your current trip, replies in 10+ languages. | Multilingual chat, streaming |
| 🎒 **Trip toolkit** | Packing checklist (persisted), phrasebook with pronunciation, etiquette, safety, emergency numbers. | Multilingual generation |
| 🎬 **Demo mode** | One switch → every feature uses rich built-in data. **Works with zero internet.** | n/a |
| 🧳 **My trips** | Saved trips + wishlist in localStorage, duplicate, export/import JSON backup. | n/a |

### Recommendation system
1. **Signals**: quiz answers, likes/dislikes, saves, trip interests and Lens scans update a tag-weight profile (older signals decay ×0.97 on each new signal).
2. **Content-based scoring** (on device): cosine similarity (profile ↔ place tags) × 0.72 + popularity × 0.18 + budget fit × 0.10.
3. **Diversity**: Maximal Marginal Relevance (λ = 0.75) so results don't collapse into one category.
4. **Gemma 4 re-rank**: top candidates go to `/api/recommend`; Gemma picks the best, explains *why it fits you*, and proposes new ideas outside the catalog.

### AI provider fallback chain
Each request tries, in order:
1. Google AI Studio key entered in **Settings** (stored only in your browser) → `gemma-4-31b-it`, then `gemma-4-26b-a4b-it`
2. Server `GOOGLE_API_KEY`
3. OpenRouter key from Settings → `google/gemma-4-31b-it:free`, then `google/gemma-4-26b-a4b-it:free`
4. Server `OPENROUTER_API_KEY`
5. All failed → every screen offers **"✨ Show demo result"**

The header badge shows which provider/model answered and how long it took.

## 🚀 Run locally

**Requirements:** Python 3.10+

### First-time setup (once)
```powershell
cd TravelPlanner
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
```
macOS/Linux: use `.venv/bin/python` instead of `.venv\Scripts\python`.

### Start the app
```powershell
cd TravelPlanner
.venv\Scripts\python -m uvicorn app.main:app --port 8000
```
Open **http://localhost:8000**. Press `Ctrl + C` to stop.
If port 8000 is busy, use `--port 8001` and open http://localhost:8001.

### Add your Gemma 4 key
- **In the app:** ⚙️ Settings → paste a [Google AI Studio key](https://aistudio.google.com/apikey) and/or an [OpenRouter key](https://openrouter.ai/keys) → **⚡ Test connection**. Keys stay in your browser only.
- **Or in a file:** create `.env` in the project folder (see `.env.example`):
  ```
  GOOGLE_API_KEY=your_key_here
  OPENROUTER_API_KEY=your_key_here
  ```
  Restart the server after editing it.

No key or no internet? Turn on the **Demo** switch in the top bar and every feature uses built-in sample data.

## ☁️ Deploy on Render (single service)

1. Push this folder to a GitHub repo.
2. Render → **New → Blueprint** → select the repo (uses `render.yaml`), *or* **New → Web Service** with:
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Optional env vars: `GOOGLE_API_KEY`, `OPENROUTER_API_KEY`. Without them, users add their own keys in Settings.

Health check: `/api/health` · API docs: `/api/docs`

## 🎬 Hackathon demo tips

- **No Wi-Fi?** Run locally (`uvicorn app.main:app`) and flip **Demo** in the top bar. All JS, CSS, Leaflet and sample images are bundled, so no CDN is needed. The service worker also caches the app shell, so a previously opened deployed URL still loads offline.
- Open **🎬 Demo showcase** → *Seed sample profile & trips* to fill My trips and the recommender before presenting.
- Suggested 2-minute flow: Demo page → Jaipur itinerary (map, budget, packing) → Travel Lens (Hindi sign translation) → Nearby → For you → Chat.

## 🗂️ Structure

```
app/
  main.py        FastAPI app, serves SPA + static files
  config.py      env + model ids
  llm.py         Gemma 4 provider chain (AI Studio → OpenRouter), JSON repair, SSE streaming
  prompts.py     system prompts + JSON shapes per feature
  geo.py         Nominatim geocoding, Wikipedia/Overpass POIs, Open-Meteo weather (no keys needed)
  routes/ai.py   /api/* endpoints
static/
  index.html, css/styles.css, sw.js, manifest.json
  js/app.js (router) · api.js · store.js (localStorage) · recommender.js · catalog.js · demo-data.js · ui.js · components.js
  js/views/*.js  one module per page
  vendor/leaflet  bundled map library
```

## 🔌 API

| Method | Path | Body |
|---|---|---|
| POST | `/api/itinerary` | `{destination, days, start_date, travelers, budget, currency, interests[], pace, style, notes, language}` |
| POST | `/api/itinerary/day` | `{trip, day, instruction}` |
| POST | `/api/discover` | `{answers{}, home}` |
| POST | `/api/nearby` | `{lat, lng}` or `{place}`, `radius_km`, `interests[]` |
| POST | `/api/vision` | multipart: `image`, `question`, `language` |
| POST | `/api/recommend` | `{profile{}, liked[], disliked[], candidates[]}` |
| POST | `/api/toolkit` | `{destination, days, month, activities[], travelers}` |
| POST | `/api/chat` | `{messages[], trip?, language}` → Server-Sent Events |
| GET | `/api/weather?lat&lng`, `/api/geocode?q`, `/api/models`, `/api/health` | |
| POST | `/api/ping` | quick key test |

Optional headers: `X-Google-Key`, `X-OpenRouter-Key`, `X-Gemma-Model`, `X-OpenRouter-Model`.

---
Map data © OpenStreetMap contributors, © CARTO · Places from Wikipedia · Weather by Open-Meteo.
