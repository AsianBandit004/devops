"""Server-side client for the Jellyseerr API."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from urllib.parse import quote

import requests

from .config import JellyseerrSettings


class JellyseerrError(Exception):
    """Base error for a Jellyseerr operation."""


class JellyseerrUnavailableError(JellyseerrError):
    """Jellyseerr could not be reached before the configured timeout."""


class JellyseerrApiError(JellyseerrError):
    """Jellyseerr returned an unsuccessful or malformed API response."""


@dataclass(frozen=True)
class MediaResult:
    """The subset of a Jellyseerr search result needed by Jellybot."""

    media_id: int
    title: str
    media_type: str
    year: str
    overview: str
    poster_path: str | None

    @classmethod
    def from_api(cls, result: dict[str, Any]) -> MediaResult:
        release_date = result.get("releaseDate") or result.get("firstAirDate") or ""
        return cls(
            media_id=int(result["id"]),
            title=result.get("title") or result.get("name") or "Unknown",
            media_type=result.get("mediaType") or "unknown",
            year=release_date[:4] or "Unknown",
            overview=result.get("overview") or "",
            poster_path=result.get("posterPath"),
        )


class JellyseerrClient:
    """Minimal, testable Jellyseerr API client. It never exposes secrets to a browser."""

    def __init__(self, settings: JellyseerrSettings, session: requests.Session | None = None):
        self._settings = settings
        self._session = session or requests.Session()
        self._headers = {"X-Api-Key": settings.api_key, "Content-Type": "application/json"}

    def search(self, query: str) -> list[MediaResult]:
        query = query.strip()
        if not query:
            return []
        data = self._get_json(f"/api/v1/search?query={quote(query, safe='')}")
        results = data.get("results")
        if not isinstance(results, list):
            raise JellyseerrApiError("Jellyseerr returned an invalid search response.")
        return [MediaResult.from_api(result) for result in results if isinstance(result, dict)]

    def search_movies(self, query: str, limit: int = 5) -> list[MediaResult]:
        return [result for result in self.search(query) if result.media_type == "movie"][:limit]

    def request_movie(self, media_id: int) -> None:
        self._post_json("/api/v1/request", {"mediaType": "movie", "mediaId": media_id})

    def _get_json(self, path: str) -> dict[str, Any]:
        try:
            response = self._session.get(
                f"{self._settings.url}{path}",
                headers=self._headers,
                timeout=self._settings.timeout_seconds,
            )
            response.raise_for_status()
            data = response.json()
        except (requests.Timeout, requests.ConnectionError) as exc:
            raise JellyseerrUnavailableError("Jellyseerr is unavailable.") from exc
        except (requests.RequestException, ValueError) as exc:
            raise JellyseerrApiError("Jellyseerr search failed.") from exc
        if not isinstance(data, dict):
            raise JellyseerrApiError("Jellyseerr returned an invalid response.")
        return data

    def _post_json(self, path: str, payload: dict[str, Any]) -> None:
        try:
            response = self._session.post(
                f"{self._settings.url}{path}",
                headers=self._headers,
                json=payload,
                timeout=self._settings.timeout_seconds,
            )
            response.raise_for_status()
        except (requests.Timeout, requests.ConnectionError) as exc:
            raise JellyseerrUnavailableError("Jellyseerr is unavailable.") from exc
        except requests.RequestException as exc:
            raise JellyseerrApiError("Jellyseerr request failed.") from exc
