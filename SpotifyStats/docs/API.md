# API

The dashboard APIs are read-only. Examples below use fictional data.

## `GET /api/health`

Confirms that the Node process is accepting requests.

```json
{"ok":true,"service":"resonance"}
```

## `GET /api/dashboard`

Returns the latest public dashboard snapshot: connection state, public profile presentation, collection totals, Top Tracks, Top Artists, and trend text.

## `GET /api/archive`

Returns up to 90 saved public-safe snapshots in newest-first order. Entries contain dates, totals, Top 5 titles, public Spotify IDs, and artwork URLs. OAuth credentials and raw database rows are never returned.

## `GET /api/listening-diary`

Returns seven-day play totals and the five most replayed tracks derived from collected recently-played events. Exact private event timestamps remain in SQLite.

## `GET /auth/spotify`

Begins the server-side Spotify authorization flow. Production deployments should restrict this route to the owner through an authenticated access boundary.

## `GET /auth/spotify/callback`

Validates OAuth state, exchanges the temporary authorization code server-side, encrypts the refresh token, and saves the first snapshot.

Unknown `/api/` and `/auth/` routes return `404`; unsupported methods return `405`.
