# Operations

Replace example names and paths with values from the private deployment inventory.

## Application health

```bash
systemctl status skyrider.service
curl -fsS http://127.0.0.1:3333/api/health
ss -ltnp | grep ':3333'
```

## Logs

```bash
journalctl -u skyrider.service -n 100 --no-pager
journalctl -u skyrider.service -f
journalctl -u skyrider-refresh.service -n 100 --no-pager
journalctl -u skyrider-listening.service -n 100 --no-pager
```

## Timers

```bash
systemctl list-timers skyrider-refresh.timer skyrider-listening.timer
systemctl status skyrider-refresh.timer skyrider-listening.timer
```

## Controlled restart

```bash
sudo systemctl restart skyrider.service
curl -fsS --retry 20 --retry-delay 1 --retry-connrefused http://127.0.0.1:3333/api/health
```

## Storage

```bash
df -h /var/lib/skyrider
du -sh /var/lib/skyrider
```

Back up SQLite with a SQLite-aware procedure or while writers are stopped. Copying an active database without its WAL state can produce an incomplete backup.
