"""Deterministic conversational movie-request flow."""
from __future__ import annotations

import re
from dataclasses import asdict
from typing import Any

from .jellyseerr import JellyseerrError

IDLE = "IDLE"
AWAITING_SELECTION = "AWAITING_SELECTION"
AWAITING_CONFIRMATION = "AWAITING_CONFIRMATION"


def respond(message: str, state: dict[str, Any], client: Any) -> dict[str, Any]:
    text = message.strip()
    if not text:
        return {"message": "Tell me what movie you would like.", "results": []}
    lower = re.sub(r"[^a-z0-9 ]", "", text.lower()).strip()
    if lower in {"cancel", "never mind", "forget it", "no", "nope", "not now"}:
        state.clear()
        state["status"] = IDLE
        return {"message": "Okay, I cancelled that request.", "results": []}
    if state.get("status") == AWAITING_SELECTION and not lower.startswith(("get ", "find ", "download ", "request ", "i want", "i would like", "can you", "could you", "show me")):
        selected = _select(text, state.get("results", []))
        if selected is None:
            return {"message": "I didn't catch which one. You can say 'the first one', give me a number, or choose a year.", "results": state["results"]}
        state["selected"] = selected
        state["status"] = AWAITING_CONFIRMATION
        return {"message": f"{selected['title']} ({selected['year']}). Would you like me to request it?", "results": [], "actions": ["Yes", "Cancel"]}
    if state.get("status") == AWAITING_CONFIRMATION:
        if lower in {"yes", "y", "yeah", "yep", "confirm", "please do", "go ahead", "do it", "sure", "absolutely"}:
            selected = state["selected"]
            try:
                client.request_movie(selected["media_id"])
            except JellyseerrError:
                return {"message": "I can't reach Jellyseerr right now.", "results": []}
            state.clear()
            state["status"] = IDLE
            return {"message": f"{selected['title']} ({selected['year']}) has been requested successfully.", "results": []}
        return {"message": "Please answer Yes or Cancel.", "results": []}
    query = re.sub(r"^(can you |could you |please )?(get me|find|download|request|i want|i would like|show me)\s+", "", text, flags=re.IGNORECASE).strip()
    query = re.sub(r"\s+(please|for me)$", "", query, flags=re.IGNORECASE).strip()
    if lower in {"help", "what can you do"}:
        return {"message": "Ask me for a movie, for example: Get me The Matrix.", "results": []}
    try:
        results = client.search_movies(query)
    except JellyseerrError:
        return {"message": "I can't reach Jellyseerr right now.", "results": []}
    if not results:
        return {"message": "I couldn't find anything matching that title.", "results": []}
    cards = [asdict(result) for result in results]
    state["status"] = AWAITING_SELECTION
    state["results"] = cards
    return {"message": "I found these movies. Which one would you like?", "results": cards}


def _select(text: str, results: list[dict[str, Any]]) -> dict[str, Any] | None:
    lowered = text.lower()
    match = re.search(r"\b([1-9])\b", lowered)
    positions = {"first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5}
    number = int(match.group(1)) if match else next((value for word, value in positions.items() if word in lowered), 0)
    if 1 <= number <= len(results):
        return results[number - 1]
    year = re.search(r"\b(19|20)\d{2}\b", lowered)
    if year:
        return next((result for result in results if result["year"] == year.group(0)), None)
    normalized = re.sub(r"[^a-z0-9 ]", "", lowered).strip()
    return next((result for result in results if normalized == re.sub(r"[^a-z0-9 ]", "", result["title"].lower())), None)
