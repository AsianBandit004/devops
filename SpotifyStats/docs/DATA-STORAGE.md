# Data storage

Skyrider uses one SQLite database stored beneath `APP_DATA_DIR`. Production data must remain outside the source repository.

## Stored records

- `spotify_token`: one AES-256-GCM encrypted Spotify refresh token
- `snapshots`: append-only JSON summary snapshots
- `refresh_status`: the latest safe refresh-error message
- `listening_events`: deduplicated recently played events keyed by timestamp

## Snapshot behavior

The daily collector appends a snapshot; it does not overwrite earlier snapshots. The public archive API limits its response to recent entries, while older rows remain in SQLite unless an administrator deliberately applies a retention policy.

## Listening diary behavior

The collector requests events newer than the latest stored timestamp and uses `INSERT OR IGNORE` to avoid duplicates. Public responses contain aggregates, while exact event timestamps remain server-side.

## Backup boundary

A complete private backup requires the SQLite database and the token-encryption key. Store them separately, encrypt backups, restrict permissions, and never commit either item to Git.
