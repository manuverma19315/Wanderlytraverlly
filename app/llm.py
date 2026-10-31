"""Gemma 4 provider layer.

Fallback chain per request:
  1. Google AI Studio key sent from the UI (X-Google-Key)
  2. Google AI Studio key from server env (GOOGLE_API_KEY)
  3. OpenRouter key sent from the UI (X-OpenRouter-Key)
  4. OpenRouter key from server env (OPENROUTER_API_KEY)
Each provider tries its primary Gemma 4 model, then a fallback Gemma 4 model.
Keys are only forwarded to the provider; they are never logged or stored.
"""

from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass
from typing import Any, AsyncIterator

import httpx
from fastapi import Request

from . import config

GOOGLE_BASE = "https://generativelanguage.googleapis.com/v1beta"
OPENROUTER_BASE = "https://openrouter.ai/api/v1"


class LLMError(Exception):
    def __init__(self, message: str, attempts: list[str] | None = None):
        super().__init__(message)
        self.attempts = attempts or []


@dataclass
class Attempt:
    provider: str  # "google" | "openrouter"
    key: str
    models: list[str]
    source: str  # "ui" | "server"

    @property
    def label(self) -> str:
        name = "AI Studio" if self.provider == "google" else "OpenRouter"
        return f"{name} ({'your key' if self.source == 'ui' else 'server key'})"


@dataclass
class Image:
    mime: str
    data_b64: str


def _dedupe(items: list[str]) -> list[str]:
    seen, out = set(), []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            out.append(item)
    return out


def build_attempts(request: Request) -> list[Attempt]:
    h = request.headers
    g_models = _dedupe([h.get("x-gemma-model", "").strip(), config.GEMMA_MODEL, config.GEMMA_FALLBACK_MODEL])
    o_models = _dedupe([h.get("x-openrouter-model", "").strip(), config.OPENROUTER_MODEL, config.OPENROUTER_FALLBACK_MODEL])
    attempts: list[Attempt] = []
    ui_google = h.get("x-google-key", "").strip()
    ui_or = h.get("x-openrouter-key", "").strip()
    if ui_google:
        attempts.append(Attempt("google", ui_google, g_models, "ui"))
    if config.GOOGLE_API_KEY and config.GOOGLE_API_KEY != ui_google:
        attempts.append(Attempt("google", config.GOOGLE_API_KEY, g_models, "server"))
    if ui_or:
        attempts.append(Attempt("openrouter", ui_or, o_models, "ui"))
    if config.OPENROUTER_API_KEY and config.OPENROUTER_API_KEY != ui_or:
        attempts.append(Attempt("openrouter", config.OPENROUTER_API_KEY, o_models, "server"))
    return attempts


# ---------------------------------------------------------------- payloads

def _google_payload(system: str, messages: list[dict], images: list[Image] | None, temperature: float) -> dict:
    # Gemma on AI Studio does not accept system_instruction, so the system
    # prompt is folded into the first user turn.
    contents = []
    for i, msg in enumerate(messages):
        text = msg["content"]
        if i == 0 and system:
            text = f"{system}\n\n---\n\n{text}"
        parts: list[dict] = [{"text": text}]
        if images and i == len(messages) - 1:
            parts += [{"inline_data": {"mime_type": im.mime, "data": im.data_b64}} for im in images]
        contents.append({"role": "model" if msg["role"] == "assistant" else "user", "parts": parts})
    return {
        "contents": contents,
        "generationConfig": {"temperature": temperature, "maxOutputTokens": 8192},
    }


def _openrouter_payload(model: str, system: str, messages: list[dict], images: list[Image] | None,
                        temperature: float, stream: bool = False) -> dict:
    out = []
    for i, msg in enumerate(messages):
        text = msg["content"]
        if i == 0 and system:
            text = f"{system}\n\n---\n\n{text}"
        if images and i == len(messages) - 1:
            content: Any = [{"type": "text", "text": text}] + [
                {"type": "image_url", "image_url": {"url": f"data:{im.mime};base64,{im.data_b64}"}} for im in images
            ]
        else:
            content = text
        out.append({"role": msg["role"], "content": content})
    return {"model": model, "messages": out, "temperature": temperature, "max_tokens": 8192, "stream": stream}


def _openrouter_headers(key: str) -> dict:
    return {
        "Authorization": f"Bearer {key}",
        "HTTP-Referer": "https://wanderly.onrender.com",
        "X-Title": config.APP_NAME,
    }


def _google_text(data: dict) -> str:
    candidates = data.get("candidates") or []
    if not candidates:
        reason = (data.get("promptFeedback") or {}).get("blockReason", "no candidates")
        raise LLMError(f"empty response ({reason})")
    parts = (candidates[0].get("content") or {}).get("parts") or []
    # Skip "thought" parts if the model emits reasoning.
    return "".join(p.get("text", "") for p in parts if not p.get("thought"))


def _short_error(resp: httpx.Response) -> str:
    try:
        body = resp.json()
        msg = (body.get("error") or {}).get("message") or str(body)[:200]
    except Exception:
        msg = resp.text[:200]
    return f"HTTP {resp.status_code}: {msg}"


# ---------------------------------------------------------------- generate

async def _call_once(client: httpx.AsyncClient, attempt: Attempt, model: str, system: str,
                     messages: list[dict], images: list[Image] | None, temperature: float) -> str:
    if attempt.provider == "google":
        resp = await client.post(
            f"{GOOGLE_BASE}/models/{model}:generateContent",
            params={"key": attempt.key},
            json=_google_payload(system, messages, images, temperature),
        )
        if resp.status_code != 200:
            raise LLMError(_short_error(resp))
        return _google_text(resp.json())

    resp = await client.post(
        f"{OPENROUTER_BASE}/chat/completions",
        headers=_openrouter_headers(attempt.key),
        json=_openrouter_payload(model, system, messages, images, temperature),
    )
    if resp.status_code != 200:
        raise LLMError(_short_error(resp))
    data = resp.json()
    if data.get("error"):
        raise LLMError(str(data["error"].get("message", data["error"]))[:200])
    choices = data.get("choices") or []
    if not choices:
        raise LLMError("empty response")
    return choices[0]["message"].get("content") or ""


async def generate(request: Request, system: str, messages: list[dict], images: list[Image] | None = None,
                   temperature: float = 0.7) -> dict:
    attempts = build_attempts(request)
    if not attempts:
        raise LLMError("No API key configured. Add a Google AI Studio or OpenRouter key in Settings, or use Demo mode.")
    errors: list[str] = []
    async with httpx.AsyncClient(timeout=config.REQUEST_TIMEOUT) as client:
        for attempt in attempts:
            for model in attempt.models:
                started = time.perf_counter()
                try:
                    text = await _call_once(client, attempt, model, system, messages, images, temperature)
                    if not text.strip():
                        raise LLMError("empty text")
                    return {
                        "text": text,
                        "provider": attempt.label,
                        "model": model,
                        "latency_ms": int((time.perf_counter() - started) * 1000),
                    }
                except (LLMError, httpx.HTTPError) as exc:
                    errors.append(f"{attempt.label} / {model}: {exc}")
                    # Bad key: no point trying other models on this provider.
                    if isinstance(exc, LLMError) and ("HTTP 401" in str(exc) or "HTTP 403" in str(exc)
                                                      or "API key not valid" in str(exc)):
                        break
    raise LLMError("All Gemma providers failed.", errors)


# ---------------------------------------------------------------- JSON helpers

def extract_json(text: str) -> Any:
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    if fence:
        text = fence.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start = min((i for i in (text.find("{"), text.find("[")) if i != -1), default=-1)
    if start == -1:
        raise ValueError("no JSON found")
    opener = text[start]
    closer = "}" if opener == "{" else "]"
    depth, in_str, esc = 0, False, False
    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == opener:
            depth += 1
        elif ch == closer:
            depth -= 1
            if depth == 0:
                candidate = text[start:i + 1]
                candidate = re.sub(r",\s*([}\]])", r"\1", candidate)
                return json.loads(candidate)
    raise ValueError("unbalanced JSON")


async def generate_json(request: Request, system: str, prompt: str, images: list[Image] | None = None,
                        temperature: float = 0.6) -> dict:
    system = system + "\n\nRespond with ONLY valid minified JSON. No markdown, no code fences, no commentary."
    result = await generate(request, system, [{"role": "user", "content": prompt}], images, temperature)
    try:
        result["data"] = extract_json(result["text"])
    except (ValueError, json.JSONDecodeError):
        repair = await generate(
            request,
            "You fix broken JSON. Output ONLY the corrected JSON, nothing else.",
            [{"role": "user", "content": result["text"][:12000]}],
            temperature=0,
        )
        result["data"] = extract_json(repair["text"])
        result["latency_ms"] += repair["latency_ms"]
    result.pop("text", None)
    return result


# ---------------------------------------------------------------- streaming

async def stream(request: Request, system: str, messages: list[dict], temperature: float = 0.8) -> AsyncIterator[dict]:
    """Yields {"meta": {...}} once, then {"delta": "..."} chunks. Falls through providers
    only if a provider fails before emitting any text."""
    attempts = build_attempts(request)
    if not attempts:
        raise LLMError("No API key configured. Add a key in Settings, or use Demo mode.")
    errors: list[str] = []
    async with httpx.AsyncClient(timeout=config.REQUEST_TIMEOUT) as client:
        for attempt in attempts:
            for model in attempt.models:
                emitted = False
                try:
                    if attempt.provider == "google":
                        req = client.build_request(
                            "POST", f"{GOOGLE_BASE}/models/{model}:streamGenerateContent",
                            params={"key": attempt.key, "alt": "sse"},
                            json=_google_payload(system, messages, None, temperature),
                        )
                    else:
                        req = client.build_request(
                            "POST", f"{OPENROUTER_BASE}/chat/completions",
                            headers=_openrouter_headers(attempt.key),
                            json=_openrouter_payload(model, system, messages, None, temperature, stream=True),
                        )
                    resp = await client.send(req, stream=True)
                    if resp.status_code != 200:
                        await resp.aread()
                        raise LLMError(_short_error(resp))
                    async for line in resp.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        payload = line[5:].strip()
                        if not payload or payload == "[DONE]":
                            continue
                        try:
                            data = json.loads(payload)
                        except json.JSONDecodeError:
                            continue
                        if attempt.provider == "google":
                            parts = ((data.get("candidates") or [{}])[0].get("content") or {}).get("parts") or []
                            delta = "".join(p.get("text", "") for p in parts if not p.get("thought"))
                        else:
                            if data.get("error"):
                                raise LLMError(str(data["error"].get("message", "stream error")))
                            delta = ((data.get("choices") or [{}])[0].get("delta") or {}).get("content") or ""
                        if delta:
                            if not emitted:
                                yield {"meta": {"provider": attempt.label, "model": model}}
                                emitted = True
                            yield {"delta": delta}
                    await resp.aclose()
                    if emitted:
                        return
                    raise LLMError("empty stream")
                except (LLMError, httpx.HTTPError) as exc:
                    if emitted:
                        yield {"delta": "\n\n_(connection interrupted)_"}
                        return
                    errors.append(f"{attempt.label} / {model}: {exc}")
                    if "HTTP 401" in str(exc) or "HTTP 403" in str(exc) or "API key not valid" in str(exc):
                        break
    raise LLMError("All Gemma providers failed.", errors)


# ---------------------------------------------------------------- diagnostics

async def list_models(request: Request) -> dict:
    """Used by Settings → Test connection."""
    h = request.headers
    out: dict[str, Any] = {}
    async with httpx.AsyncClient(timeout=20) as client:
        g_key = h.get("x-google-key", "").strip() or config.GOOGLE_API_KEY
        if g_key:
            try:
                resp = await client.get(f"{GOOGLE_BASE}/models", params={"key": g_key, "pageSize": 1000})
                if resp.status_code == 200:
                    names = [m["name"].split("/", 1)[-1] for m in resp.json().get("models", [])]
                    out["google"] = {"ok": True, "models": [n for n in names if "gemma" in n]}
                else:
                    out["google"] = {"ok": False, "error": _short_error(resp)}
            except httpx.HTTPError as exc:
                out["google"] = {"ok": False, "error": str(exc)}
        o_key = h.get("x-openrouter-key", "").strip() or config.OPENROUTER_API_KEY
        if o_key:
            try:
                resp = await client.get(f"{OPENROUTER_BASE}/key", headers=_openrouter_headers(o_key))
                if resp.status_code == 200:
                    models = await client.get(f"{OPENROUTER_BASE}/models")
                    ids = [m["id"] for m in models.json().get("data", []) if "gemma" in m["id"]]
                    out["openrouter"] = {"ok": True, "models": ids}
                else:
                    out["openrouter"] = {"ok": False, "error": _short_error(resp)}
            except httpx.HTTPError as exc:
                out["openrouter"] = {"ok": False, "error": str(exc)}
    return out
