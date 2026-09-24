export type TrackHistorySnapshot = {
  savedAt: string;
  topTracks?: Array<{ title: string; image: string | null; spotifyId?: string | null }>;
};

export type TrackHistorySeries = {
  key: string;
  title: string;
  image: string | null;
  points: Array<{ date: string; rank: number | null }>;
};

export function buildTrackRankHistory(entries: TrackHistorySnapshot[], limit = 14): { dates: string[]; series: TrackHistorySeries[] } {
  const daily = new Map<string, TrackHistorySnapshot & { date: Date }>();
  for (const entry of entries) {
    const date = new Date(entry.savedAt);
    if (Number.isNaN(date.valueOf()) || !entry.topTracks?.length) continue;
    const key = date.toISOString().slice(0, 10);
    const previous = daily.get(key);
    if (!previous || date.valueOf() > previous.date.valueOf()) daily.set(key, { ...entry, date });
  }
  const snapshots = [...daily.entries()].sort(([left], [right]) => left.localeCompare(right)).slice(-limit);
  const scores = new Map<string, { title: string; image: string | null; score: number }>();
  for (const [, snapshot] of snapshots) snapshot.topTracks?.slice(0, 5).forEach((track, index) => {
    const key = track.spotifyId || track.title;
    const current = scores.get(key) || { title: track.title, image: track.image || null, score: 0 };
    current.score += 6 - index;
    current.image = current.image || track.image || null;
    scores.set(key, current);
  });
  const selected = [...scores.entries()].sort(([, left], [, right]) => right.score - left.score || left.title.localeCompare(right.title)).slice(0, 5);
  return {
    dates: snapshots.map(([date]) => date),
    series: selected.map(([key, track]) => ({
      key, title: track.title, image: track.image,
      points: snapshots.map(([date, snapshot]) => ({ date, rank: (snapshot.topTracks || []).slice(0, 5).findIndex((item) => (item.spotifyId || item.title) === key) + 1 || null })),
    })),
  };
}
