# Server Performance Stats 

# https://roadmap.sh/projects/server-stats

A simple Bash script that displays basic performance statistics for a Linux
server.

## Statistics Included

- Total CPU usage
- Total, used, and available memory
- Total, used, and free disk space
- Top five processes by CPU usage
- Top five processes by memory usage
- Operating system and kernel version
- Hostname and uptime
- Load average
- Logged-in users
- Failed login attempts, when available

## Requirements

- A Linux operating system
- Bash
- Standard Linux commands such as `awk`, `df`, `ps`, `sort`, and `who`

## Usage

Give the script permission to run:

```bash
chmod +x server-stats.sh
```

Run it:

```bash
./server-stats.sh
```

No command-line arguments or additional packages are required.

## Example Output

```text
SERVER PERFORMANCE REPORT
Generated: 2026-10-10 08:00:00 EDT

=== CPU Usage ===
Total CPU usage: 12.5%

=== Memory Usage ===
Total: 15.62 GiB
Used:  6.40 GiB (41.0%)
Free:  9.22 GiB (59.0%)
```

The exact values and available system information will depend on the server.

## Notes

- CPU usage is measured over one second.
- Memory usage includes memory that Linux can reclaim from cache.
- RAM-backed filesystems are excluded from disk totals when supported.
- Failed login information may require permission to read `/var/log/btmp`.
