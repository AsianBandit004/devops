export type HistorySnapshot = {
  savedAt: string;
  topTrack: string | null;
  topTrackImage?: string | null;
  topArtists?: Array<{ title: string; image: string | null }>;
};

export type HistoryMoment = {
  month: string;
  kind: 'month' | 'day';
  artist: string;
  artistImage: string | null;
  strength: number | null;
  topTrack: string | null;
  topTrackImage: string | null;
  snapshots: number;
};

export type HistoryRun = HistoryMoment & { startedAt?: string };
export type HistoryLinePoint = HistoryMoment & { runLength: number; runStart: boolean };

const monthKey = (date: Date) => date.toISOString().slice(0, 7);
const rankStrength = (rank: number) => Math.max(20, 100 - rank * 18);

export function buildHistoryHits(entries: HistorySnapshot[], limit = 12): HistoryMoment[] {
  const months = new Map<string, Array<HistorySnapshot & { date: Date }>>();
  for (const entry of entries) {
    const date = new Date(entry.savedAt);
    if (Number.isNaN(date.valueOf())) continue;
    const key = monthKey(date);
    months.set(key, [...(months.get(key) || []), { ...entry, date }]);
  }
  return [...months.entries()].sort(([left], [right]) => left.localeCompare(right)).slice(-limit).map(([month, snapshots]) => {
    const scores = new Map<string, { score: number; image: string | null }>();
    for (const snapshot of snapshots) snapshot.topArtists?.forEach((artist, rank) => {
      const previous = scores.get(artist.title) || { score: 0, image: artist.image };
      scores.set(artist.title, { score: previous.score + rankStrength(rank), image: previous.image || artist.image });
    });
    const [artist = 'Listening in motion', details = { score: 0, image: null }] = [...scores.entries()].sort(([, left], [, right]) => right.score - left.score)[0] || [];
    const latest = [...snapshots].sort((left, right) => right.date.valueOf() - left.date.valueOf())[0];
    return { month, kind: 'month', artist, artistImage: details.image, strength: Math.round(details.score / Math.max(snapshots.length, 1)), topTrack: latest?.topTrack || null, topTrackImage: latest?.topTrackImage || null, snapshots: snapshots.length };
  });
}

/**
 * Keeps finished months as a single artist era while letting the month in
 * progress breathe: its newest saved snapshot from every day becomes a small
 * cover-art point. The daily trail is chronological, not a fabricated score.
 */
export function buildAdaptiveHistory(entries: HistorySnapshot[], now = new Date(), limit = 12): HistoryMoment[] {
  const activeMonth = monthKey(now);
  const latestByDay = new Map<string, HistorySnapshot & { date: Date }>();

  for (const entry of entries) {
    const date = new Date(entry.savedAt);
    if (Number.isNaN(date.valueOf()) || monthKey(date) !== activeMonth) continue;
    const day = date.toISOString().slice(0, 10);
    const previous = latestByDay.get(day);
    if (!previous || date.valueOf() > previous.date.valueOf()) latestByDay.set(day, { ...entry, date });
  }

  const dailyTrail = [...latestByDay.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([day, snapshot]) => {
    const artist = snapshot.topArtists?.[0];
    return {
      month: day,
      kind: 'day' as const,
      artist: artist?.title || 'Listening in motion',
      artistImage: artist?.image || null,
      strength: null,
      topTrack: snapshot.topTrack || null,
      topTrackImage: snapshot.topTrackImage || null,
      snapshots: 1,
    };
  });

  const completed = buildHistoryHits(entries.filter((entry) => {
    const date = new Date(entry.savedAt);
    return !Number.isNaN(date.valueOf()) && monthKey(date) < activeMonth;
  }), dailyTrail.length ? Math.max(limit - 1, 1) : limit);

  return [...completed, ...dailyTrail];
}

/** Collapses consecutive daily snapshots led by the same artist into one honest timeline run. */
export function collapseDailyArtistRuns(moments: HistoryMoment[]): HistoryRun[] {
  const runs: HistoryRun[] = [];
  for (const moment of moments) {
    const previous = runs.at(-1);
    if (moment.kind === 'day' && previous?.kind === 'day' && previous.artist === moment.artist) {
      previous.month = moment.month;
      previous.topTrack = moment.topTrack;
      previous.topTrackImage = moment.topTrackImage;
      previous.artistImage = previous.artistImage || moment.artistImage;
      previous.snapshots += moment.snapshots;
      continue;
    }
    runs.push({ ...moment, startedAt: moment.kind === 'day' ? moment.month : undefined });
  }
  return runs;
}

/**
 * Produces an honest chart value for active-month snapshots: the number of
 * consecutive saved days that the same top track has held first place.
 */
export function buildTrackMomentum(moments: HistoryMoment[]): HistoryLinePoint[] {
  let previousTrack = ''; let runLength = 0;
  return moments.map((moment) => {
    if (moment.kind !== 'day' || !moment.topTrack) {
      previousTrack = ''; runLength = 0;
      return { ...moment, runLength: 0, runStart: false };
    }
    const runStart = moment.topTrack !== previousTrack;
    runLength = runStart ? 1 : runLength + 1;
    previousTrack = moment.topTrack;
    return { ...moment, runLength, runStart };
  });
}
