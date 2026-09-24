# Troubleshooting

## `502` or `503` from the reverse proxy

The proxy is reachable but Node is not accepting requests.

```bash
systemctl status skyrider.service
ss -ltnp | grep ':3333'
journalctl -u skyrider.service -n 100 --no-pager
```

## Port 3333 is already in use

Do not start a second copy. Identify the current owner, transition it deliberately to systemd, and verify the health endpoint afterward.

## Dashboard loads without data

Compare local API responses with the public route, then inspect both collector services. A healthy application service does not prove the collection timers succeeded.

## Listening diary remains empty

Confirm the Spotify authorization includes `user-read-recently-played`, the listening timer is enabled, and its service logs show successful event collection.

## Daily snapshot did not change

Check the daily timer's next-run time, latest service result, and Spotify API errors. Top Tracks use Spotify's rolling ranking window and may remain unchanged after new listening.

## OAuth reconnect fails

Verify the callback URL exactly matches the Spotify developer configuration. Do not print the environment file or token values while troubleshooting.

## Jenkins succeeds but old server behavior remains

Confirm Jenkins deployed both the server files and `dist/`, restarted systemd, and checked the health endpoint after restart.
