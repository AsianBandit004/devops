"""FastAPI browser application for Jellybot."""
from __future__ import annotations

import os
import secrets
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from .chat import IDLE, respond
from .config import JellyseerrSettings
from .jellyseerr import JellyseerrClient, JellyseerrError

ROOT = Path(__file__).parent


def create_app() -> FastAPI:
    app = FastAPI(title="Jellybot")
    app.add_middleware(SessionMiddleware, secret_key=os.getenv("JELLYBOT_SESSION_SECRET", secrets.token_urlsafe(32)), same_site="lax")
    app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")

    @app.get("/", response_class=HTMLResponse)
    async def index() -> HTMLResponse:
        return HTMLResponse((ROOT / "templates" / "index.html").read_text())

    @app.post("/api/chat")
    async def chat(request: Request) -> JSONResponse:
        body: dict[str, Any] = await request.json()
        message = body.get("message")
        if not isinstance(message, str) or len(message) > 300:
            return JSONResponse({"message": "Please send a shorter message.", "results": []}, status_code=400)
        state = request.session.setdefault("conversation", {"status": IDLE})
        try:
            client = JellyseerrClient(JellyseerrSettings.from_environment())
        except ValueError:
            return JSONResponse({"message": "Jellybot is not configured yet.", "results": []}, status_code=503)
        response = respond(message, state, client)
        request.session["conversation"] = state
        return JSONResponse(response)

    @app.get("/health")
    async def health() -> dict[str, str]:
        try:
            JellyseerrClient(JellyseerrSettings.from_environment()).search_movies("health", limit=1)
            status = "reachable"
        except (ValueError, JellyseerrError):
            status = "unreachable"
        return {"status": "ok", "jellyseerr": status}

    return app


app = create_app()
