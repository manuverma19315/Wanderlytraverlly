from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .routes import ai

STATIC = Path(__file__).resolve().parent.parent / "static"

app = FastAPI(title="Wanderly – Gemma 4 Travel Planner", docs_url="/api/docs", openapi_url="/api/openapi.json")
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.include_router(ai.router)
app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.get("/sw.js", include_in_schema=False)
async def service_worker():
    # Served from root so its scope covers the whole app.
    return FileResponse(STATIC / "sw.js", media_type="application/javascript",
                        headers={"Cache-Control": "no-cache"})


@app.get("/manifest.json", include_in_schema=False)
async def manifest():
    return FileResponse(STATIC / "manifest.json", media_type="application/manifest+json")


@app.get("/", include_in_schema=False)
@app.get("/demo", include_in_schema=False)
async def index():
    return FileResponse(STATIC / "index.html", headers={"Cache-Control": "no-cache"})
