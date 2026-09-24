import { describe, expect, it } from 'vitest';
import { buildAdaptiveHistory, buildHistoryHits, buildTrackMomentum, collapseDailyArtistRuns } from '../src/history-hits';

describe('buildHistoryHits', () => {
  it('aggregates daily artist ranks into a monthly listening era', () => {
    const history = buildHistoryHits([
      { savedAt: '2026-07-02T03:15:00.000Z', topTrack: 'July track', topTrackImage: 'july.jpg', topArtists: [{ title: 'Artist A', image: 'a.jpg' }, { title: 'Artist B', image: 'b.jpg' }] },
      { savedAt: '2026-07-10T03:15:00.000Z', topTrack: 'July return', topTrackImage: 'july-return.jpg', topArtists: [{ title: 'Artist B', image: 'b.jpg' }, { title: 'Artist A', image: 'a.jpg' }] },
      { savedAt: '2026-08-03T03:15:00.000Z', topTrack: 'August track', topTrackImage: 'august.jpg', topArtists: [{ title: 'Artist C', image: 'c.jpg' }] },
    ]);
    expect(history).toEqual([
      { month: '2026-07', kind: 'month', artist: 'Artist A', artistImage: 'a.jpg', strength: 91, topTrack: 'July return', topTrackImage: 'july-return.jpg', snapshots: 2 },
      { month: '2026-08', kind: 'month', artist: 'Artist C', artistImage: 'c.jpg', strength: 100, topTrack: 'August track', topTrackImage: 'august.jpg', snapshots: 1 },
    ]);
  });

  it('keeps only the newest requested monthly moments', () => {
    const entries = Array.from({ length: 14 }, (_, index) => ({ savedAt: new Date(Date.UTC(2025, index, 1)).toISOString(), topTrack: null, topArtists: [] }));
    expect(buildHistoryHits(entries, 12)).toHaveLength(12);
  });

  it('keeps the active month as one newest snapshot per day and collapses earlier months', () => {
    const history = buildAdaptiveHistory([
      { savedAt: '2026-07-02T03:15:00.000Z', topTrack: 'July track', topTrackImage: 'july.jpg', topArtists: [{ title: 'Artist A', image: 'a.jpg' }] },
      { savedAt: '2026-08-03T03:15:00.000Z', topTrack: 'Morning track', topTrackImage: 'morning.jpg', topArtists: [{ title: 'Artist B', image: 'b.jpg' }] },
      { savedAt: '2026-08-03T20:15:00.000Z', topTrack: 'Evening track', topTrackImage: 'evening.jpg', topArtists: [{ title: 'Artist C', image: 'c.jpg' }] },
      { savedAt: '2026-08-05T03:15:00.000Z', topTrack: 'Next track', topTrackImage: 'next.jpg', topArtists: [{ title: 'Artist D', image: 'd.jpg' }] },
    ], new Date('2026-08-20T12:00:00.000Z'));
    expect(history).toEqual([
      { month: '2026-07', kind: 'month', artist: 'Artist A', artistImage: 'a.jpg', strength: 100, topTrack: 'July track', topTrackImage: 'july.jpg', snapshots: 1 },
      { month: '2026-08-03', kind: 'day', artist: 'Artist C', artistImage: 'c.jpg', strength: null, topTrack: 'Evening track', topTrackImage: 'evening.jpg', snapshots: 1 },
      { month: '2026-08-05', kind: 'day', artist: 'Artist D', artistImage: 'd.jpg', strength: null, topTrack: 'Next track', topTrackImage: 'next.jpg', snapshots: 1 },
    ]);
  });

  it('collapses consecutive daily artist leaders into one timeline run', () => {
    const runs = collapseDailyArtistRuns([
      { month: '2026-08-23', kind: 'day', artist: 'Artist A', artistImage: 'a.jpg', strength: null, topTrack: 'First', topTrackImage: 'first.jpg', snapshots: 1 },
      { month: '2026-08-24', kind: 'day', artist: 'Artist A', artistImage: 'a.jpg', strength: null, topTrack: 'Second', topTrackImage: 'second.jpg', snapshots: 1 },
      { month: '2026-08-25', kind: 'day', artist: 'Artist B', artistImage: 'b.jpg', strength: null, topTrack: 'Third', topTrackImage: 'third.jpg', snapshots: 1 },
    ]);
    expect(runs).toEqual([
      { month: '2026-08-24', startedAt: '2026-08-23', kind: 'day', artist: 'Artist A', artistImage: 'a.jpg', strength: null, topTrack: 'Second', topTrackImage: 'second.jpg', snapshots: 2 },
      { month: '2026-08-25', startedAt: '2026-08-25', kind: 'day', artist: 'Artist B', artistImage: 'b.jpg', strength: null, topTrack: 'Third', topTrackImage: 'third.jpg', snapshots: 1 },
    ]);
  });

  it('builds a top-track momentum line that resets only when the top track changes', () => {
    const line = buildTrackMomentum([
      { month: '2026-08-23', kind: 'day', artist: 'Artist A', artistImage: null, strength: null, topTrack: 'Track A', topTrackImage: 'a.jpg', snapshots: 1 },
      { month: '2026-08-24', kind: 'day', artist: 'Artist B', artistImage: null, strength: null, topTrack: 'Track A', topTrackImage: 'a.jpg', snapshots: 1 },
      { month: '2026-08-25', kind: 'day', artist: 'Artist B', artistImage: null, strength: null, topTrack: 'Track B', topTrackImage: 'b.jpg', snapshots: 1 },
    ]);
    expect(line.map(({ runLength, runStart }) => ({ runLength, runStart }))).toEqual([
      { runLength: 1, runStart: true }, { runLength: 2, runStart: false }, { runLength: 1, runStart: true },
    ]);
  });
});
