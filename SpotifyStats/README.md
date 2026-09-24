# Skyrider

Skyrider is a private-first Spotify listening dashboard for a single listener. It turns read-only Spotify data into an editorial record of weekly favorites, daily listening, replayed tracks, and long-term rank movement.

## Features

- Weekly Top Tracks and Top Artists
- Daily listening-strength visualization
- Seven-day listening diary and most-replayed tracks
- Historical Top 5 rank chart with album artwork
- Liked-track and followed-show totals
- Official Spotify track embeds for visitor-controlled playback
- Encrypted refresh-token storage and SQLite snapshots
- Automated collection through systemd timers
- Jenkins validation and deployment example

## Technology

- TypeScript, HTML, CSS, and Vite
- Node.js using the built-in HTTP and SQLite modules
- Vitest and Playwright
- Apache reverse proxy
- systemd services and timers
- Jenkins CI/CD

## Architecture

```text
Browser -> HTTPS reverse proxy -> Node on 127.0.0.1:3333 -> SQLite
                                  |
                                  +-> Spotify Web API

systemd timers -> refresh scripts -> encrypted token + snapshots in SQLite
```

Detailed documentation:

- [Architecture](docs/ARCHITECTURE.md)
- [API](docs/API.md)
- [Data storage](docs/DATA-STORAGE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Operations](docs/OPERATIONS.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Security policy](SECURITY.md)

## Local development

Node.js 24.5 or newer is required because the server uses `node:sqlite`.

```bash
npm ci
npm run dev
```

Copy `.env.example` to a local environment file outside source control and provide development-only values. Never commit a populated environment file or SQLite database.

## Validation

```bash
npm run lint
npm run test
npm run build
npm run test:e2e
```

## Spotify permissions

Skyrider requests only:

- `user-read-private`
- `user-library-read`
- `user-top-read`
- `user-read-recently-played`

It does not request playlist, library-modification, account-control, or streaming scopes. Playback buttons use Spotify's official public embed and the visitor's own Spotify session.

## Deployment examples

Public-safe Apache and systemd examples are stored under `ops/`. `Jenkinsfile.example` demonstrates the validation and deployment flow without production hostnames, paths, host keys, or credential values.

Production configuration and data intentionally live outside the repository.
