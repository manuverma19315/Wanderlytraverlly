"""Free, keyless geo helpers: Nominatim geocoding, Wikipedia/Overpass POIs, Open-Meteo weather."""

from __future__ import annotations

import asyncio
import math
import os
import re
from typing import Any

import httpx

UA = {"User-Agent": f"WanderlyTravelPlanner/1.0 ({os.getenv('RENDER_EXTERNAL_URL', 'http://localhost:8000')}; Gemma 4 hackathon travel app)"}
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]


async def geocode(query: str) -> dict | None:
    async with httpx.AsyncClient(timeout=15, headers=UA) as client:
        resp = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "json", "limit": 1},
        )
        if resp.status_code != 200 or not resp.json():
            return None
        hit = resp.json()[0]
        return {"lat": float(hit["lat"]), "lng": float(hit["lon"]), "name": hit.get("display_name", query)}


async def reverse_geocode(lat: float, lng: float) -> str:
    try:
        async with httpx.AsyncClient(timeout=10, headers=UA) as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": lat, "lon": lng, "format": "json", "zoom": 12},
            )
            if resp.status_code == 200:
                addr = resp.json().get("address", {})
                parts = [addr.get(k) for k in ("suburb", "city", "town", "village", "state", "country")]
                return ", ".join(p for p in parts if p)[:120] or f"{lat:.3f}, {lng:.3f}"
    except httpx.HTTPError:
        pass
    return f"{lat:.3f}, {lng:.3f}"


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _category(tags: dict) -> str:
    t = tags.get("tourism", "")
    if t in ("museum", "gallery"):
        return "museum"
    if t in ("viewpoint",):
        return "viewpoint"
    if t in ("theme_park", "zoo", "aquarium"):
        return "fun"
    if tags.get("historic"):
        return "heritage"
    if tags.get("leisure") in ("park", "garden", "nature_reserve") or tags.get("natural"):
        return "nature"
    if tags.get("amenity") == "place_of_worship":
        return "spiritual"
    if tags.get("natural") == "beach":
        return "beach"
    return "attraction"


async def _overpass_first(query: str) -> dict[str, Any] | None:
    """Query all Overpass mirrors at once and return the first good answer."""
    async with httpx.AsyncClient(timeout=40, headers=UA) as client:
        async def one(url: str) -> dict[str, Any]:
            resp = await client.post(url, data={"data": query})
            resp.raise_for_status()
            return resp.json()

        tasks = [asyncio.create_task(one(u)) for u in OVERPASS_URLS]
        try:
            for fut in asyncio.as_completed(tasks):
                try:
                    data = await fut
                    if data.get("elements") is not None:
                        return data
                except (httpx.HTTPError, ValueError):
                    continue
        finally:
            for t in tasks:
                t.cancel()
    return None


async def _overpass_pois(lat: float, lng: float, radius_m: int, limit: int) -> list[dict]:
    query = f"""
    [out:json][timeout:20];
    (
      nwr["tourism"~"^(attraction|museum|viewpoint|gallery|zoo|theme_park|aquarium)$"]["name"](around:{radius_m},{lat},{lng});
      nwr["historic"]["name"]["wikidata"](around:{radius_m},{lat},{lng});
    );
    out center 80;
    """
    data = await _overpass_first(query)
    if not data:
        return []
    seen: set[str] = set()
    pois = []
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        name = tags.get("name:en") or tags.get("name")
        if not name or name.lower() in seen:
            continue
        plat = el.get("lat") or (el.get("center") or {}).get("lat")
        plng = el.get("lon") or (el.get("center") or {}).get("lon")
        if plat is None or plng is None:
            continue
        seen.add(name.lower())
        # Places with wiki links tend to be the notable ones.
        notability = (2 if tags.get("wikipedia") else 0) + (1 if tags.get("wikidata") else 0)
        pois.append({
            "name": name,
            "lat": plat,
            "lng": plng,
            "category": _category(tags),
            "distance_km": round(haversine_km(lat, lng, plat, plng), 2),
            "notability": notability,
            "opening_hours": tags.get("opening_hours"),
        })
    pois.sort(key=lambda p: (-p["notability"], p["distance_km"]))
    return pois[:limit]


# Wikipedia articles near a point are a fast, notability-filtered POI source
# (~1s vs 20s+ for Overpass). Obvious non-tourist articles are filtered out.
_WIKI_EXCLUDE = re.compile(
    r"constituency|district|police|court|school|college|university|metro station|railway station|bombing|attack|"
    r"hospital|ministry|commission|department|office|road$|marg$|lane$|ward|assembly|election|company|bank|"
    r"embassy|high commission|bhavan$|^\d", re.I)
_WIKI_CATEGORY = [
    (r"temple|(?<!raj )mandir|mosque|masjid|church|cathedral|gurudwara|dargah|basilica|shrine|monastery|gompa|stupa", "spiritual"),
    (r"museum|gallery|kendra|library", "museum"),
    (r"fort|qila|palace|mahal|tomb|maqbara|gate|darwaza|haveli|ruins|memorial|monument|baoli|stepwell|minar|observatory", "heritage"),
    (r"garden|park|bagh|lake|sanctuary|reserve|hill|falls|waterfall|forest|nursery", "nature"),
    (r"beach", "beach"),
    (r"market|bazaar|mall|chowk", "shopping"),
    (r"zoo|aquarium|amusement|water park", "fun"),
]


def _wiki_category(title: str) -> str:
    for pattern, cat in _WIKI_CATEGORY:
        if re.search(pattern, title, re.I):
            return cat
    return "attraction"


async def _wiki_pois(lat: float, lng: float, radius_m: int, limit: int) -> list[dict]:
    async with httpx.AsyncClient(timeout=12, headers=UA) as client:
        resp = await client.get("https://en.wikipedia.org/w/api.php", params={
            "action": "query", "list": "geosearch", "gscoord": f"{lat}|{lng}",
            "gsradius": min(radius_m, 10000), "gslimit": 100, "format": "json",
        })
        resp.raise_for_status()
        hits = resp.json().get("query", {}).get("geosearch", [])
    pois = []
    for h in hits:
        title = h["title"]
        if _WIKI_EXCLUDE.search(title) or title.split(",")[0].strip() in ("Delhi", "New Delhi", "India"):
            continue
        cat = _wiki_category(title)
        pois.append({
            "name": re.sub(r"\s*\(.*?\)$", "", title), "lat": h["lat"], "lng": h["lon"], "category": cat,
            "distance_km": round(h["dist"] / 1000, 2), "notability": 2 if cat != "attraction" else 1,
            "opening_hours": None,
        })
    pois.sort(key=lambda p: (-p["notability"], p["distance_km"]))
    return pois[:limit]


async def nearby_pois(lat: float, lng: float, radius_m: int = 5000, limit: int = 40) -> list[dict]:
    """Wikipedia geosearch first (fast); fall back to Overpass, capped at 20s."""
    try:
        pois = await _wiki_pois(lat, lng, radius_m, limit)
    except (httpx.HTTPError, ValueError):
        pois = []
    if len(pois) >= 6:
        return pois
    try:
        osm = await asyncio.wait_for(_overpass_pois(lat, lng, radius_m, limit), timeout=20)
    except (asyncio.TimeoutError, httpx.HTTPError, ValueError):
        osm = []
    names = {p["name"].lower() for p in pois}
    return (pois + [p for p in osm if p["name"].lower() not in names])[:limit]


async def weather(lat: float, lng: float) -> list[dict]:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat, "longitude": lng, "timezone": "auto", "forecast_days": 7,
                "daily": "weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
            },
        )
        if resp.status_code != 200:
            return []
        d = resp.json().get("daily", {})
        return [
            {
                "date": d["time"][i],
                "code": d["weathercode"][i],
                "max": d["temperature_2m_max"][i],
                "min": d["temperature_2m_min"][i],
                "rain": (d.get("precipitation_probability_max") or [None] * 7)[i],
            }
            for i in range(len(d.get("time", [])))
        ]
