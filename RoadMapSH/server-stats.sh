#!/usr/bin/env bash

# ==============================================================================
# Server Performance Statistics
# ==============================================================================
# This script prints a quick overview of a Linux server's health. It reads
# system information from Linux's /proc virtual filesystem and uses common
# commands such as ps, df, uptime, and who.
#
# Run it with: ./server-stats.sh
# ==============================================================================

# Treat the use of an undefined variable as an error. This helps catch typos.
set -u

# The /proc files used below only exist on Linux, so stop with a clear message
# if somebody tries to run the script on macOS, Windows, or another system.
if [[ "$(uname -s)" != "Linux" ]]; then
    printf 'Error: this script must be run on Linux.\n' >&2
    exit 1
fi

# Print a consistent title before each group of statistics.
heading() {
    printf '\n=== %s ===\n' "$1"
}

# Convert a number of bytes into an easier-to-read value. For example,
# 1073741824 bytes becomes 1.00 GiB. The loop divides by 1024 until it finds
# the most suitable unit (bytes, KiB, MiB, GiB, and so on).
human_bytes() {
    awk -v bytes="$1" 'BEGIN {
        split("B KiB MiB GiB TiB PiB", units, " ")
        unit = 1
        while (bytes >= 1024 && unit < 6) {
            bytes /= 1024
            unit++
        }
        if (unit == 1) {
            printf "%.0f %s", bytes, units[unit]
        } else {
            printf "%.2f %s", bytes, units[unit]
        }
    }'
}

# Calculate the percentage of CPU currently in use.
cpu_usage() {
    local cpu user nice system idle iowait irq softirq steal guest guest_nice
    local idle_before total_before idle_after total_after idle_delta total_delta usage

    # /proc/stat records how long the CPU has spent doing different kinds of
    # work since boot. Take the first reading as our starting point.
    read -r cpu user nice system idle iowait irq softirq steal guest guest_nice < /proc/stat

    # Combine normal idle time with time spent waiting for input/output. Then
    # add all useful fields to get the total recorded CPU time.
    idle_before=$((idle + iowait))
    total_before=$((user + nice + system + idle + iowait + irq + softirq + steal))

    # Wait one second so there is a measurable difference between readings.
    sleep 1

    # Take a second reading using the same fields.
    read -r cpu user nice system idle iowait irq softirq steal guest guest_nice < /proc/stat
    idle_after=$((idle + iowait))
    total_after=$((user + nice + system + idle + iowait + irq + softirq + steal))

    # Subtract the first reading from the second. This gives us CPU activity
    # during the one-second sample instead of activity since startup.
    idle_delta=$((idle_after - idle_before))
    total_delta=$((total_after - total_before))

    # CPU usage is the portion of total time that was not idle. awk handles
    # the decimal calculation and rounds the result to one decimal place.
    if (( total_delta > 0 )); then
        usage=$(awk -v idle="$idle_delta" -v total="$total_delta" \
            'BEGIN { printf "%.1f", 100 * (total - idle) / total }')
        printf 'Total CPU usage: %s%%\n' "$usage"
    else
        printf 'Total CPU usage: unavailable\n'
    fi
}

# Read total, used, and available memory from /proc/meminfo.
memory_usage() {
    local total_kb available_kb used_kb used_pct

    # Linux reports these values in KiB. MemAvailable is more useful than
    # MemFree because it also includes memory that Linux can reclaim from cache.
    total_kb=$(awk '/^MemTotal:/ { print $2 }' /proc/meminfo)
    available_kb=$(awk '/^MemAvailable:/ { print $2 }' /proc/meminfo)

    # Older Linux kernels may not provide MemAvailable. If it is missing,
    # estimate it by adding free memory, buffers, and cached memory.
    if [[ -z "$available_kb" ]]; then
        available_kb=$(awk '
            /^MemFree:/  { free = $2 }
            /^Buffers:/  { buffers = $2 }
            /^Cached:/   { cached = $2 }
            END { print free + buffers + cached }
        ' /proc/meminfo)
    fi

    # Used memory is everything that is not currently available. awk calculates
    # the percentage because Bash only supports whole-number arithmetic.
    used_kb=$((total_kb - available_kb))
    used_pct=$(awk -v used="$used_kb" -v total="$total_kb" \
        'BEGIN { printf "%.1f", 100 * used / total }')

    # Convert KiB to bytes, pass each value to human_bytes(), and print it.
    printf 'Total: %s\n' "$(human_bytes "$((total_kb * 1024))")"
    printf 'Used:  %s (%s%%)\n' "$(human_bytes "$((used_kb * 1024))")" "$used_pct"
    printf 'Free:  %s (%s%%)\n' \
        "$(human_bytes "$((available_kb * 1024))")" \
        "$(awk -v used="$used_pct" 'BEGIN { printf "%.1f", 100 - used }')"
}

# Add together the space reported for persistent mounted filesystems.
disk_usage() {
    local df_output disk_data total_kb used_kb free_kb used_pct

    # df reports filesystem space in KiB. Exclude tmpfs and devtmpfs because
    # they use RAM rather than persistent storage. Some lightweight versions
    # of df do not support -x, so use plain POSIX df as a fallback.
    if ! df_output=$(df -Pk -x tmpfs -x devtmpfs 2>/dev/null); then
        df_output=$(df -Pk 2>/dev/null)
    fi
    # Skip df's heading and add the total, used, and free columns from every
    # remaining filesystem into one server-wide summary.
    disk_data=$(awk '
        NR > 1 { total += $2; used += $3; free += $4 }
        END { print total + 0, used + 0, free + 0 }
    ' <<< "$df_output")

    # Split awk's three results into named variables. If data was found,
    # calculate the percentages and display the sizes in readable units.
    read -r total_kb used_kb free_kb <<< "$disk_data"
    if (( total_kb > 0 )); then
        used_pct=$(awk -v used="$used_kb" -v total="$total_kb" \
            'BEGIN { printf "%.1f", 100 * used / total }')
        printf 'Total: %s\n' "$(human_bytes "$((total_kb * 1024))")"
        printf 'Used:  %s (%s%%)\n' "$(human_bytes "$((used_kb * 1024))")" "$used_pct"
        printf 'Free:  %s (%s%%)\n' \
            "$(human_bytes "$((free_kb * 1024))")" \
            "$(awk -v free="$free_kb" -v total="$total_kb" \
                'BEGIN { printf "%.1f", 100 * free / total }')"
    else
        printf 'Disk usage: unavailable\n'
    fi
}

# Collect useful extra details for the stretch goal.
system_information() {
    local os_name="Unknown Linux"
    local failed_logins="Unavailable"

    # Most Linux distributions describe themselves in /etc/os-release. Loading
    # the file gives us a friendly name such as "Ubuntu 24.04 LTS".
    if [[ -r /etc/os-release ]]; then
        # shellcheck disable=SC1091
        . /etc/os-release
        os_name=${PRETTY_NAME:-${NAME:-Unknown Linux}}
    fi

    # lastb reads failed-login records from /var/log/btmp. Only use it when the
    # command exists and the current user has permission to read that log.
    if command -v lastb >/dev/null 2>&1 && [[ -r /var/log/btmp ]]; then
        failed_logins=$(lastb 2>/dev/null | awk \
            '/^btmp begins/ { next } NF { count++ } END { print count + 0 }')
    fi

    # Print the collected details. /proc/loadavg contains the average number of
    # runnable tasks over 1, 5, and 15 minutes. who lists active login sessions,
    # and wc -l counts how many sessions it returned.
    printf 'Hostname:           %s\n' "$(hostname)"
    printf 'Operating system:   %s\n' "$os_name"
    printf 'Kernel:             %s\n' "$(uname -r)"
    printf 'Uptime:             %s\n' "$(uptime -p 2>/dev/null || uptime)"
    printf 'Load average:       %s\n' "$(awk '{ print $1, $2, $3 }' /proc/loadavg)"
    printf 'Logged-in users:    %s\n' "$(who | wc -l | awk '{ print $1 }')"
    printf 'Failed login count: %s\n' "$failed_logins"
}

# Start the report with a title and the server's local date and time.
printf 'SERVER PERFORMANCE REPORT\n'
printf 'Generated: %s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')"

# Print general operating-system and server information.
heading 'System Information'
system_information

# Measure total CPU use during a one-second sample.
heading 'CPU Usage'
cpu_usage

# Show total, used, and available RAM.
heading 'Memory Usage'
memory_usage

# Show combined persistent filesystem usage.
heading 'Disk Usage'
disk_usage

# ps lists running processes. The blank = after each field removes ps's own
# header, sort orders the fourth column (%CPU) from highest to lowest, and head
# keeps only the first five results.
heading 'Top 5 Processes by CPU Usage'
printf '%-8s %-12s %-24s %6s %6s\n' 'PID' 'USER' 'COMMAND' '%CPU' '%MEM'
ps -eo pid=,user=,comm=,%cpu=,%mem= | sort -k4,4nr | head -n 5

# Use the same process fields, but sort the fifth column (%MEM) this time.
heading 'Top 5 Processes by Memory Usage'
printf '%-8s %-12s %-24s %6s %6s\n' 'PID' 'USER' 'COMMAND' '%CPU' '%MEM'
ps -eo pid=,user=,comm=,%cpu=,%mem= | sort -k5,5nr | head -n 5

printf '\n'
