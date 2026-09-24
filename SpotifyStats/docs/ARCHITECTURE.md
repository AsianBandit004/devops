# Architecture

Skyrider separates source control, validation, hosting, data collection, and private storage.

```text
Developer workstation
        |
        | Git push
        v
Source repository -> Jenkins validation -> validated deployment
                                            |
                                            v
Cloud/CDN -> Apache -> Node application on loopback -> SQLite
                              |                    ^
                              v                    |
                         Spotify API <- systemd refresh jobs
```

## Components

| Component | Responsibility |
| --- | --- |
| Browser | Renders the TypeScript/Vite dashboard and Spotify embeds |
| Apache | Terminates HTTPS and proxies requests to loopback |
| Node application | Serves the frontend, read-only APIs, and OAuth callback |
| SQLite | Stores the encrypted refresh token, snapshots, and listening events |
| systemd application service | Starts Node after boot and restarts it after failure |
| systemd timers | Run daily snapshot and two-hour recently-played collection jobs |
| Jenkins | Validates a commit, deploys a successful build, and restarts systemd |
| Spotify | Supplies read-only profile, library, ranking, and recently-played data |

## Request path

The public reverse proxy forwards requests to Node on `127.0.0.1:3333`. Node reads public-safe aggregates from SQLite and responds with JSON or frontend files. SQLite and the environment file are never served as static assets.

## Collection path

The daily refresh stores a new summary snapshot. The two-hour collector stores unique recently played events. Both jobs use the encrypted refresh token from SQLite and obtain short-lived access tokens from Spotify.

## Process ownership

Jenkins deploys application files but does not keep the application alive. systemd owns the long-running Node process. This allows automatic startup after reboot, controlled restarts, and centralized logs.
