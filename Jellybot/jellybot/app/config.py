"""Application configuration loaded from the environment."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class JellyseerrSettings:
    """Connection settings for a Jellyseerr instance."""

    url: str
    api_key: str
    timeout_seconds: float = 10.0

    @classmethod
    def from_environment(cls) -> JellyseerrSettings:
        url = os.getenv("JELLYSEERR_URL", "").strip().rstrip("/")
        api_key = os.getenv("JELLYSEERR_API_KEY", "").strip()
        if not url or not api_key:
            raise ValueError(
                "JELLYSEERR_URL and JELLYSEERR_API_KEY must both be configured."
            )
        return cls(url=url, api_key=api_key)
