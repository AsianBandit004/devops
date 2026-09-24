import { describe, expect, it } from 'vitest';
import { buildTrackRankHistory } from '../src/track-history';

describe('buildTrackRankHistory', () => {
  it('keeps the newest snapshot per day and maps real Top 5 ranks into lines', () => {
    const history = buildTrackRankHistory([
      { savedAt: '2026-08-01T03:15:00.000Z', topTracks: [{ title: 'A', image: 'a.jpg', spotifyId: 'a' }, { title: 'B', image: 'b.jpg', spotifyId: 'b' }] },
      { savedAt: '2026-08-02T03:15:00.000Z', topTracks: [{ title: 'B', image: 'b.jpg', spotifyId: 'b' }, { title: 'A', image: 'a.jpg', spotifyId: 'a' }] },
      { savedAt: '2026-08-02T20:15:00.000Z', topTracks: [{ title: 'A', image: 'a.jpg', spotifyId: 'a' }, { title: 'B', image: 'b.jpg', spotifyId: 'b' }] },
    ]);
    expect(history.dates).toEqual(['2026-08-01', '2026-08-02']);
    expect(history.series[0]).toMatchObject({ title: 'A', points: [{ date: '2026-08-01', rank: 1 }, { date: '2026-08-02', rank: 1 }] });
    expect(history.series[1]).toMatchObject({ title: 'B', points: [{ date: '2026-08-01', rank: 2 }, { date: '2026-08-02', rank: 2 }] });
  });
});
