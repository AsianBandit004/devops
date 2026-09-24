import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ResonanceStore } from '../server/resonance-store.mjs';

const stores: ResonanceStore[] = [];
afterEach(() => stores.splice(0).forEach((store) => store.close()));
const freshStore = () => {
  const store = new ResonanceStore(join(mkdtempSync(join(tmpdir(), 'resonance-')), 'resonance.sqlite'), 'a'.repeat(64));
  stores.push(store); return store;
};

describe('Resonance store', () => {
  it('encrypts the refresh token and exposes only dashboard data', () => {
    const store = freshStore(); store.saveRefreshToken('do-not-store-this-in-plain-text');
    expect(store.refreshToken()).toBe('do-not-store-this-in-plain-text');
    expect(store.dashboard().connected).toBe(true);
  });
  it('keeps snapshot history for week-over-week comparisons', () => {
    const store = freshStore();
    store.saveSnapshot({ summary: { likedTracks: 4, followedShows: 2, snapshots: 0 }, topTracks: [], topArtists: [], trending: [] });
    store.saveSnapshot({ summary: { likedTracks: 5, followedShows: 2, snapshots: 0 }, topTracks: [], topArtists: [], trending: [] });
    expect(store.previousSnapshot()!.summary.likedTracks).toBe(4);
    expect(store.dashboard().summary).toMatchObject({ likedTracks: 5, snapshots: 2 });
  });
  it('returns a bounded, read-only archive in newest-first order', () => {
    const store = freshStore();
    store.saveSnapshot({ refreshedAt: '2026-08-22T03:15:00.000Z', summary: { likedTracks: 4, followedShows: 2, snapshots: 0 }, topTracks: [{ title: 'First track', detail: '', image: 'https://example.test/first-track.jpg', spotifyId: 'first-id' }], topArtists: [{ title: 'First artist', detail: '', image: 'https://example.test/first-artist.jpg' }], trending: [] });
    store.saveSnapshot({ refreshedAt: '2026-08-23T03:15:00.000Z', summary: { likedTracks: 5, followedShows: 3, snapshots: 0 }, topTracks: [{ title: 'Second track', detail: '', image: 'https://example.test/second-track.jpg', spotifyId: 'second-id' }], topArtists: [{ title: 'Second artist', detail: '', image: 'https://example.test/second-artist.jpg' }], trending: [] });
    expect(store.archive(1)).toEqual([{ savedAt: '2026-08-23T03:15:00.000Z', likedTracks: 5, followedShows: 3, topTrack: 'Second track', topArtist: 'Second artist', topTrackImage: 'https://example.test/second-track.jpg', topArtistImage: 'https://example.test/second-artist.jpg', topTracks: [{ title: 'Second track', image: 'https://example.test/second-track.jpg', spotifyId: 'second-id' }], topArtists: [{ title: 'Second artist', image: 'https://example.test/second-artist.jpg' }] }]);
  });
  it('keeps raw play events private while returning seven-day aggregates', () => {
    const store = freshStore();
    store.saveListeningEvents([
      { playedAt: '2026-08-26T12:00:00.000Z', trackId: 'a', title: 'Track A', artist: 'Artist A', image: 'a.jpg' },
      { playedAt: '2026-08-26T13:00:00.000Z', trackId: 'a', title: 'Track A', artist: 'Artist A', image: 'a.jpg' },
      { playedAt: '2026-08-27T12:00:00.000Z', trackId: 'b', title: 'Track B', artist: 'Artist B', image: 'b.jpg' },
      { playedAt: '2026-08-10T12:00:00.000Z', trackId: 'old', title: 'Old track', artist: 'Old artist', image: null },
    ]);
    expect(store.listeningDiary(7, new Date('2026-08-29T12:00:00.000Z'))).toEqual({
      totalPlays: 3,
      days: [
        { date: '2026-08-27', plays: 1, topTrack: { title: 'Track B', artist: 'Artist B', image: 'b.jpg', plays: 1 } },
        { date: '2026-08-26', plays: 2, topTrack: { title: 'Track A', artist: 'Artist A', image: 'a.jpg', plays: 2 } },
      ],
      topTracks: [
        { title: 'Track A', artist: 'Artist A', image: 'a.jpg', plays: 2 },
        { title: 'Track B', artist: 'Artist B', image: 'b.jpg', plays: 1 },
      ],
    });
  });
});
