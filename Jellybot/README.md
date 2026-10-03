# Jellybot

Jellybot is a self-hosted conversational frontend for Jellyseerr.

Instead of opening Jellyseerr and searching manually, Jellybot lets you talk to your media request system naturally:

```text
You:
Get me Interstellar.

Jellybot:
I found Interstellar (2014).

Would you like me to request it?

You:
Yes.

Jellybot:
Interstellar (2014) has been requested successfully.
```

The goal is to provide a clean chatbot-style interface on top of an existing Jellyseerr → Radarr/Sonarr → Downloader → Media Server pipeline.

---

## Current Status

The core proof of concept is already working.

Jellybot can currently:

- Connect to Jellyseerr using its API
- Search for movies
- Display matching search results
- Let the user choose a movie
- Ask for confirmation before requesting
- Submit the selected movie to Jellyseerr
- Successfully trigger the existing media pipeline

Example:

```bash
python3 app/app.py "Dune Part Three"
```

Output:

```text
Search results for: Dune Part Three

1. Dune: Part Three (2026)

Choose a movie number: 1

Selected: Dune: Part Three (2026)
TMDB ID: 1170608
Request this movie? (y/n): y

✅ Requested: Dune: Part Three (2026)
```

---

## Architecture

```text
                         ┌─────────────────────┐
                         │       Browser       │
                         │  Chat-style Web UI  │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │      Jellybot       │
                         │ Python / FastAPI    │
                         └──────────┬──────────┘
                                    │
                              Jellyseerr API
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │     Jellyseerr      │
                         └──────────┬──────────┘
                                    │
                         ┌──────────┴──────────┐
                         ▼                     ▼
                     ┌────────┐            ┌────────┐
                     │ Radarr │            │ Sonarr │
                     └───┬────┘            └───┬────┘
                         │                     │
                         └──────────┬──────────┘
                                    ▼
                              Download Client
                                    │
                                    ▼
                               Media Server
```

Jellybot does not download media itself.

It acts as a conversational interface for Jellyseerr and lets the existing media automation stack continue handling the rest.

---

## Planned User Experience

Jellybot should feel like a chatbot rather than another search form.

Example:

```text
You:
Find me The Matrix.

Jellybot:
I found a few matches:

1. The Matrix (1999)
2. The Matrix Reloaded (2003)
3. The Matrix Revolutions (2003)
4. The Matrix Resurrections (2021)

Which one would you like?

You:
The first one.

Jellybot:
The Matrix (1999).

Would you like me to request it?

You:
Yes.

Jellybot:
The Matrix (1999) has been requested through Jellyseerr.
```

The application should eventually understand natural responses such as:

```text
1
the first one
that one
yes
no
the 2024 one
never mind
```

Ambiguous requests should never automatically submit media.

---

## Features

### Working

- Jellyseerr API authentication
- Movie search
- Movie result selection
- Movie request confirmation
- Movie request submission
- URL-safe Jellyseerr searches
- Environment-variable based configuration

### Planned

- Modern web chat interface
- Natural-language commands
- Movie poster cards
- TV show support
- Season selection
- Already-available detection
- Already-requested detection
- Per-browser conversation sessions
- Better error handling
- FastAPI backend
- Docker deployment
- Health endpoint
- Structured logging
- Jenkins testing
- Gitea webhook integration
- pytest unit tests
- Ruff linting
- Authentik support
- Nginx Proxy Manager support

---

## Example Natural-Language Commands

The finished application should understand requests such as:

```text
Find Interstellar
Get me Interstellar
Download Interstellar
Request The Matrix
I want Dune Part Two
Find the new Mission Impossible
Get Breaking Bad
```

Simple requests should use deterministic parsing rather than requiring an external AI model.

The application should be designed so an LLM provider can be added later for more advanced natural-language understanding.

---

## Project Structure

Target structure:

```text
jellybot/
├── app/
│   ├── main.py
│   ├── jellyseerr.py
│   ├── chat.py
│   ├── models.py
│   ├── config.py
│   ├── static/
│   └── templates/
├── tests/
├── Dockerfile
├── compose.yaml
├── requirements.txt
├── .env
├── .env.example
├── .gitignore
├── Jenkinsfile
└── README.md
```

The exact structure may evolve as the application is built.

---

## Requirements

You need:

- Linux
- Python 3
- A working Jellyseerr instance
- A Jellyseerr API key
- Network connectivity from Jellybot to Jellyseerr
- Docker and Docker Compose for the finished deployment

Optional:

- Gitea
- Jenkins
- Nginx Proxy Manager
- Authentik
- Dozzle

---

## Jellyseerr Configuration

Jellybot connects to Jellyseerr using:

```text
GET /api/v1/search
```

and:

```text
POST /api/v1/request
```

Authentication uses:

```text
X-Api-Key: <JELLYSEERR_API_KEY>
```

Example movie request payload:

```json
{
  "mediaType": "movie",
  "mediaId": 1170608
}
```

The Jellyseerr API key must never be exposed to the browser.

All Jellyseerr communication should happen server-side.

---

## Environment Variables

Create:

```bash
.env
```

Example:

```env
JELLYSEERR_URL=http://192.168.100.6:5055
JELLYSEERR_API_KEY=YOUR_API_KEY
```

Do not commit `.env`.

Create an `.env.example` for source control:

```env
JELLYSEERR_URL=http://jellyseerr:5055
JELLYSEERR_API_KEY=CHANGE_ME
```

Recommended `.gitignore`:

```gitignore
.env
__pycache__/
*.pyc
.pytest_cache/
.ruff_cache/
.venv/
venv/
```

---

## Current Proof-of-Concept Setup

Install the Python dependency:

```bash
pip3 install requests
```

Load the environment:

```bash
set -a
source .env
set +a
```

Search for a movie:

```bash
python3 app/app.py "The Matrix"
```

Example output:

```text
603 movie The Matrix 1999
604 movie The Matrix Reloaded 2003
605 movie The Matrix Revolutions 2003
624860 movie The Matrix Resurrections 2021
14543 movie The Matrix Revisited 2001
```

The interactive version then lets the user select and request a result.

---

## Docker

The final application will run in Docker.

Expected deployment:

```bash
docker compose up -d --build
```

The Jellybot container should:

- Run as a non-root user when practical
- Restart unless stopped
- Expose only the Jellybot web port
- Read Jellyseerr credentials through environment variables
- Include a healthcheck
- Write logs to stdout/stderr
- Avoid unnecessary persistent storage

Jellyseerr, Radarr, Sonarr, and the download client are not part of this stack.

They already exist separately.

---

## Testing

Testing will use:

```bash
pytest
```

Planned coverage includes:

- Search query parsing
- Natural-language intent parsing
- Search result processing
- Movie selection
- Confirmation handling
- Jellyseerr search requests
- Jellyseerr movie requests
- Already-requested handling
- Already-available handling
- Invalid selections
- Jellyseerr API failures
- Jellyseerr connectivity failures

Tests should mock Jellyseerr.

Automated tests must never create real media requests.

---

## Jenkins

Jellybot is intended to integrate with Jenkins and Gitea.

Pipeline:

```text
Gitea Push
    │
    ▼
Webhook
    │
    ▼
Jenkins
    │
    ├── Checkout
    ├── Install Dependencies
    ├── Lint
    ├── Run Tests
    └── Build Docker Image
```

Recommended tools:

```text
pytest
ruff
```

The Jenkins build should fail if linting or tests fail.

Automatic production deployment should remain disabled initially.

---

## Gitea

The repository should contain:

```text
.gitignore
.env.example
README.md
Jenkinsfile
Dockerfile
compose.yaml
requirements.txt
```

Never commit:

```text
.env
API keys
session secrets
credentials
```

Gitea can trigger Jenkins using a webhook whenever code is pushed.

---

## Health Endpoint

The web application should provide:

```text
GET /health
```

Example:

```json
{
  "status": "ok",
  "jellyseerr": "reachable"
}
```

This can later be used by Docker, Checkmk, reverse proxies, or other monitoring tools.

---

## Logging

Jellybot should log useful application events such as:

- Application startup
- Search requests
- Jellyseerr connectivity errors
- Successful media requests
- Failed media requests
- Unexpected application errors

Logs should be written to stdout/stderr so they are easy to inspect through:

```bash
docker logs jellybot
```

or Dozzle.

Never log:

- Jellyseerr API keys
- Authentication cookies
- Session secrets
- Sensitive request headers

---

## Security

Security requirements:

- Store secrets only in environment variables
- Never expose Jellyseerr API keys client-side
- Never commit `.env`
- Validate user input
- Use API request timeouts
- Escape browser-displayed content
- Prevent XSS
- Use secure session handling
- Avoid shell execution
- Avoid arbitrary command execution
- Add CSRF protection where appropriate
- Add lightweight rate limiting if needed

The application may eventually sit behind:

```text
Internet / LAN
      │
      ▼
Nginx Proxy Manager
      │
      ▼
Authentik
      │
      ▼
Jellybot
      │
      ▼
Jellyseerr
```

---

## Conversation State

Each browser session should have its own conversation state.

Example state flow:

```text
IDLE
  │
  ▼
SEARCHING
  │
  ▼
AWAITING_SELECTION
  │
  ▼
AWAITING_CONFIRMATION
  │
  ├──── Cancel ────► IDLE
  │
  ▼
REQUESTED
  │
  ▼
IDLE
```

Do not use a single global conversation variable shared by every user.

---

## TV Support

TV support is planned through Jellyseerr and Sonarr.

Example:

```text
You:
Get Breaking Bad.

Jellybot:
I found Breaking Bad (2008).

Would you like:

1. All seasons
2. Choose seasons
```

The TV implementation should use Jellyseerr's supported request API and should not guess at request payloads.

---

## Error Handling

### Nothing Found

```text
Jellybot:
I couldn't find anything matching that title.
Try another search.
```

### Already Available

```text
Jellybot:
The Matrix (1999) is already available in your library.
```

### Already Requested

```text
Jellybot:
Dune: Part Three has already been requested.
```

### Jellyseerr Unavailable

```text
Jellybot:
I can't reach Jellyseerr right now.
```

Raw Python tracebacks and API responses should not be displayed in the web interface.

---

## Development Roadmap

Suggested implementation order:

```text
1. Working Jellyseerr proof of concept       ✅
2. Refactor Jellyseerr API client
3. Add automated tests
4. Build FastAPI backend
5. Add conversation state
6. Build chat frontend
7. Add movie request workflow
8. Add availability/request status checks
9. Add TV and season support
10. Dockerize application
11. Add healthchecks and logging
12. Add Jenkins pipeline
13. Connect Gitea webhook
14. Polish frontend
15. Add authentication
```

---

## Future Enhancements

Possible future additions:

- External LLM integration
- Smarter media recommendations
- "Find the newest..." queries
- Multiple Jellyseerr users
- Discord integration
- Telegram integration
- Request status tracking
- Download progress
- Media availability notifications
- Recently requested media
- Recently added media
- Watch history integration
- Voice commands
- Mobile-friendly PWA
- Jellyfin/Plex deep links

---

## Development Philosophy

Jellybot started as a small working proof of concept.

The project should stay:

- Simple
- Testable
- Self-hosted
- Easy to troubleshoot
- Docker-friendly
- API-driven
- Secure by default

Avoid unnecessary microservices and dependencies.

Build features incrementally while keeping the Jellyseerr integration working at every stage.

---

## License

Choose a license appropriate for your use before publishing publicly.

For a private homelab Gitea repository, this section may be omitted.

---

## Disclaimer

Jellybot is an independent project and is not affiliated with Jellyseerr, Radarr, Sonarr, Jellyfin, Plex, or their maintainers.

It is intended to provide a conversational interface for a user's existing self-hosted media request infrastructure.

