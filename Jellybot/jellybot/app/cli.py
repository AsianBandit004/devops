"""Compatibility CLI for the original Jellybot movie request flow."""

from __future__ import annotations

import sys
from collections.abc import Callable

if __package__:
    from .config import JellyseerrSettings
    from .jellyseerr import JellyseerrClient, JellyseerrError, MediaResult
else:  # Supports the existing `python3 app/app.py` invocation.
    from config import JellyseerrSettings
    from jellyseerr import JellyseerrClient, JellyseerrError, MediaResult


def run_movie_request(
    query: str,
    client: JellyseerrClient,
    input_fn: Callable[[str], str] = input,
    output_fn: Callable[[str], None] = print,
) -> int:
    """Run the established search, selection, confirmation, request flow."""
    try:
        results = client.search_movies(query)
    except JellyseerrError:
        output_fn("Jellyseerr is unavailable right now.")
        return 1

    if not results:
        output_fn("No movie results found.")
        return 0

    output_fn(f"\nSearch results for: {query}\n")
    for number, result in enumerate(results, start=1):
        output_fn(f"{number}. {result.title} ({result.year})")

    try:
        choice = int(input_fn("Choose a movie number: "))
    except ValueError:
        output_fn("Please enter a number.")
        return 1

    if choice < 1 or choice > len(results):
        output_fn("Invalid selection.")
        return 1

    selected: MediaResult = results[choice - 1]
    output_fn(f"\nSelected: {selected.title} ({selected.year})")
    output_fn(f"TMDB ID: {selected.media_id}")

    if input_fn("Request this movie? (y/n): ").strip().lower() != "y":
        output_fn("Request cancelled.")
        return 0

    try:
        client.request_movie(selected.media_id)
    except JellyseerrError:
        output_fn("Jellyseerr could not complete the request.")
        return 1

    output_fn(f"\nRequested: {selected.title} ({selected.year})")
    return 0


def main(argv: list[str] | None = None) -> int:
    arguments = argv if argv is not None else sys.argv[1:]
    if not arguments:
        print('Usage: python3 app/app.py "Movie Name"')
        return 1
    try:
        client = JellyseerrClient(JellyseerrSettings.from_environment())
    except ValueError as exc:
        print(str(exc))
        return 1
    return run_movie_request(" ".join(arguments), client)
