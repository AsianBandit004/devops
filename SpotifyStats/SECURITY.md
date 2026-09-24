# Security policy

Skyrider is a single-listener Spotify dashboard. Its public interface is intentionally read-only; Spotify credentials, refresh tokens, encryption keys, raw listening events, and the SQLite database must remain on the application host.

## Reporting a vulnerability

Please report suspected vulnerabilities privately to the repository owner rather than opening a public issue. Include the affected component, reproduction steps, and potential impact. Do not include real credentials or private listening data in a report.

## Repository safety

The repository must never contain:

- `.env` files or production configuration values
- Spotify access or refresh tokens
- Spotify client secrets or token-encryption keys
- SQLite databases, WAL files, backups, or production logs
- SSH private keys, certificates, passwords, or Jenkins secret values
- Raw exports of private listening history

Use `.env.example`, the sanitized files under `ops/`, and `Jenkinsfile.example` as documentation. Supply real values through protected server and CI credential stores.

## Security boundaries

- Node binds to loopback and is exposed through a TLS reverse proxy.
- The Spotify refresh token is encrypted with AES-256-GCM before storage.
- Spotify access is read-only; playback uses Spotify's official visitor-controlled embed.
- The browser receives dashboard aggregates and public Spotify artwork, never OAuth credentials.
- Connection-management routes should be protected by an authenticated administrative boundary before broad public exposure.
