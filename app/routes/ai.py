"""All /api routes. Each AI endpoint returns {data, provider, model, latency_ms}."""

from __future__ import annotations

import base64
import json
from typing import Any

from fastapi import APIRouter, File, Form, Request, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from .. import geo, llm, prompts

router = APIRouter(prefix="/api")


def ai_error(exc: Exception, status: int = 502) -> JSONResponse:
    attempts = getattr(exc, "attempts", [])
    return JSONResponse(
        status_code=status,
        content={"error": str(exc) or exc.__class__.__name__, "attempts": attempts, "demo_available": True},
    )


async def run_json(request: Request, system: str, prompt: str, images=None, temperature: float = 0.6):
    try:
        return await llm.generate_json(request, system, prompt, images, temperature)
    except llm.LLMError as exc:
        return ai_error(exc, 400 if "No API key" in str(exc) else 502)
    except (ValueError, json.JSONDecodeError) as exc:
        return ai_error(Exception(f"Gemma returned malformed JSON: {exc}"))


# ---------------------------------------------------------------- health & settings

@router.get("/health")
async def health():
    from .. import config
    return {
        "ok": True,
        "server_keys": {"google": bool(config.GOOGLE_API_KEY), "openrouter": bool(config.OPENROUTER_API_KEY)},
        "models": {"google": config.GEMMA_MODEL, "openrouter": config.OPENROUTER_MODEL},
    }


@router.get("/models")
async def models(request: Request):
    return await llm.list_models(request)


@router.post("/ping")
async def ping(request: Request):
    try:
        res = await llm.generate(request, "", [{"role": "user", "content": "Reply with exactly: Gemma ready ✈️"}],
                                 temperature=0)
        return {"reply": res["text"].strip()[:80], "provider": res["provider"], "model": res["model"],
                "latency_ms": res["latency_ms"]}
    except llm.LLMError as exc:
        return ai_error(exc, 400)


# ---------------------------------------------------------------- itinerary

class TripRequest(BaseModel):
    destination: str
    days: int = Field(3, ge=1, le=14)
    start_date: str | None = None
    travelers: int = Field(2, ge=1, le=20)
    budget: float | None = None
    currency: str = "INR"
    interests: list[str] = []
    pace: str = "balanced"
    style: str = "mid-range"
    notes: str = ""
    language: str = "English"


@router.post("/itinerary")
async def itinerary(body: TripRequest, request: Request):
    prompt = (
        f"Destination: {body.destination}\nDays: {body.days}\nStart date: {body.start_date or 'flexible'}\n"
        f"Travellers: {body.travelers}\nTotal budget: {body.budget or 'not specified'} {body.currency}\n"
        f"Interests: {', '.join(body.interests) or 'a bit of everything'}\nPace: {body.pace}\n"
        f"Travel style: {body.style}\nSpecial notes (diet, accessibility, kids...): {body.notes or 'none'}\n"
        f"Write all text in {body.language}. Currency: {body.currency}."
    )
    return await run_json(request, prompts.ITINERARY, prompt, temperature=0.7)


class RegenDayRequest(BaseModel):
    trip: dict[str, Any]
    day: int
    instruction: str = ""


@router.post("/itinerary/day")
async def regen_day(body: RegenDayRequest, request: Request):
    trip = body.trip
    other_places = [
        it.get("title") for d in trip.get("days", []) if d.get("day") != body.day for it in d.get("items", [])
    ]
    prompt = (
        f"Trip: {trip.get('title')} in {trip.get('destination')} ({trip.get('currency', 'INR')}).\n"
        f"Re-plan day {body.day}. Places already used on other days (do not repeat): {', '.join(filter(None, other_places))}.\n"
        f"Extra instruction: {body.instruction or 'make it fresh and fun'}"
    )
    return await run_json(request, prompts.REGEN_DAY, prompt, temperature=0.9)


# ---------------------------------------------------------------- discover quiz

class QuizRequest(BaseModel):
    answers: dict[str, Any]
    home: str = "India"


@router.post("/discover")
async def discover(body: QuizRequest, request: Request):
    lines = "\n".join(f"- {k}: {v}" for k, v in body.answers.items())
    prompt = f"Traveller based in: {body.home}\nQuiz answers:\n{lines}"
    return await run_json(request, prompts.DISCOVER, prompt, temperature=0.8)


# ---------------------------------------------------------------- nearby

class NearbyRequest(BaseModel):
    lat: float | None = None
    lng: float | None = None
    place: str = ""
    radius_km: float = Field(5, ge=0.5, le=30)
    interests: list[str] = []


@router.post("/nearby")
async def nearby(body: NearbyRequest, request: Request):
    lat, lng, label = body.lat, body.lng, body.place
    if lat is None or lng is None:
        if not body.place:
            return JSONResponse(status_code=400, content={"error": "Give a location or allow GPS."})
        hit = await _safe(geo.geocode(body.place))
        if not hit:
            return JSONResponse(status_code=404, content={"error": f"Couldn't find '{body.place}'."})
        lat, lng, label = hit["lat"], hit["lng"], hit["name"]
    elif not label:
        label = await geo.reverse_geocode(lat, lng)

    pois = await _safe(geo.nearby_pois(lat, lng, int(body.radius_km * 1000))) or []
    interests = ", ".join(body.interests) or "anything interesting"

    if pois:
        compact = [{k: p[k] for k in ("name", "category", "distance_km")} for p in pois]
        prompt = (f"Traveller location: {label}\nInterests: {interests}\n"
                  f"Points of interest (JSON): {json.dumps(compact, ensure_ascii=False)}")
        res = await run_json(request, prompts.NEARBY_RANK, prompt, temperature=0.6)
        if isinstance(res, JSONResponse):
            # AI down: still return the real places so the page is useful.
            return {"data": {"area_summary": "", "places": pois}, "center": {"lat": lat, "lng": lng},
                    "label": label, "source": "places", "provider": None, "model": None}
        by_name = {p["name"].lower(): p for p in pois}
        merged = []
        for place in res["data"].get("places", []):
            base = by_name.get(str(place.get("name", "")).lower())
            if base:
                merged.append({**base, **place})
        res["data"]["places"] = merged or pois
        res.update(center={"lat": lat, "lng": lng}, label=label, source="places+gemma")
        return res

    prompt = f"Location: {label} (lat {lat:.4f}, lng {lng:.4f}), radius {body.radius_km} km.\nInterests: {interests}"
    res = await run_json(request, prompts.NEARBY_FREE, prompt, temperature=0.5)
    if isinstance(res, JSONResponse):
        return res
    res.update(center={"lat": lat, "lng": lng}, label=label, source="gemma")
    return res


async def _safe(coro):
    try:
        return await coro
    except Exception:
        return None


# ---------------------------------------------------------------- vision lens

@router.post("/vision")
async def vision(request: Request, image: UploadFile = File(...), question: str = Form(""),
                 language: str = Form("English")):
    raw = await image.read()
    if len(raw) > 6 * 1024 * 1024:
        return JSONResponse(status_code=413, content={"error": "Image too large (max 6 MB)."})
    mime = image.content_type or "image/jpeg"
    img = llm.Image(mime=mime, data_b64=base64.b64encode(raw).decode())
    prompt = (f"Translate any text into: {language}. Write all fields in {language}.\n"
              f"Traveller's question: {question or 'What is this and what should I know as a visitor?'}")
    return await run_json(request, prompts.VISION, prompt, images=[img], temperature=0.4)


# ---------------------------------------------------------------- recommendations

class RecommendRequest(BaseModel):
    profile: dict[str, float] = {}
    liked: list[str] = []
    disliked: list[str] = []
    candidates: list[dict[str, Any]] = []


@router.post("/recommend")
async def recommend(body: RecommendRequest, request: Request):
    top_tags = sorted(body.profile.items(), key=lambda kv: -kv[1])[:8]
    prompt = (
        f"Interest weights: {json.dumps(dict(top_tags))}\nLiked: {', '.join(body.liked[-10:]) or 'none yet'}\n"
        f"Disliked: {', '.join(body.disliked[-10:]) or 'none'}\n"
        f"Candidates (name, tags, model score): "
        f"{json.dumps([{k: c.get(k) for k in ('name', 'country', 'tags', 'score')} for c in body.candidates[:15]], ensure_ascii=False)}"
    )
    return await run_json(request, prompts.RECOMMEND, prompt, temperature=0.6)


# ---------------------------------------------------------------- toolkit

class ToolkitRequest(BaseModel):
    destination: str
    days: int = 3
    month: str = ""
    activities: list[str] = []
    travelers: int = 2


@router.post("/toolkit")
async def toolkit(body: ToolkitRequest, request: Request):
    prompt = (f"Destination: {body.destination}\nDays: {body.days}\nMonth: {body.month or 'unspecified'}\n"
              f"Travellers: {body.travelers}\nActivities: {', '.join(body.activities) or 'sightseeing'}")
    return await run_json(request, prompts.TOOLKIT, prompt, temperature=0.5)


# ---------------------------------------------------------------- weather / geocode passthrough

@router.get("/weather")
async def weather(lat: float, lng: float):
    return {"days": await _safe(geo.weather(lat, lng)) or []}


@router.get("/geocode")
async def geocode(q: str):
    hit = await _safe(geo.geocode(q))
    if not hit:
        return JSONResponse(status_code=404, content={"error": "not found"})
    return hit


# ---------------------------------------------------------------- chat (SSE)

class ChatRequest(BaseModel):
    messages: list[dict[str, str]]
    trip: dict[str, Any] | None = None
    language: str = "English"


@router.post("/chat")
async def chat(body: ChatRequest, request: Request):
    system = prompts.CHAT + f"\nReply language: {body.language}."
    if body.trip:
        brief = {
            "title": body.trip.get("title"), "destination": body.trip.get("destination"),
            "days": [{"day": d.get("day"), "theme": d.get("theme"),
                      "places": [i.get("title") for i in d.get("items", [])]} for d in body.trip.get("days", [])],
        }
        system += f"\nCurrent trip: {json.dumps(brief, ensure_ascii=False)}"
    messages = [m for m in body.messages if m.get("role") in ("user", "assistant") and m.get("content")][-12:]
    # Providers need the conversation to start with a user turn.
    while messages and messages[0]["role"] != "user":
        messages.pop(0)
    if not messages:
        return JSONResponse(status_code=400, content={"error": "empty conversation"})

    async def events():
        try:
            async for chunk in llm.stream(request, system, messages):
                yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
        except llm.LLMError as exc:
            yield f"data: {json.dumps({'error': str(exc), 'attempts': exc.attempts})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
