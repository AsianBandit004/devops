import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const emptyDashboard = () => ({
  connected: false,
  summary: { likedTracks: 0, followedShows: 0, snapshots: 0 },
  topTracks: [{ title: 'Your top tracks', detail: 'Will appear after Spotify is connected.' }],
  topArtists: [{ title: 'Your top artists', detail: 'Your listening story starts here.' }],
  trending: [{ title: 'The signal is quiet', detail: 'Snapshots will reveal what is rising for you.' }],
});

export class ResonanceStore {
  constructor(path, encryptionKey) {
    if (!/^[a-f0-9]{64}$/i.test(encryptionKey || '')) throw new Error('SPOTIFY_TOKEN_ENCRYPTION_KEY must be a 64-character hexadecimal key.');
    this.key = Buffer.from(encryptionKey, 'hex');
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS spotify_token (
        id INTEGER PRIMARY KEY CHECK (id = 1), encrypted_refresh_token TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) STRICT;
      CREATE TABLE IF NOT EXISTS snapshots (
        id INTEGER PRIMARY KEY, payload TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) STRICT;
      CREATE TABLE IF NOT EXISTS refresh_status (
        id INTEGER PRIMARY KEY CHECK (id = 1), last_error TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) STRICT;
      CREATE TABLE IF NOT EXISTS listening_events (
        played_at TEXT PRIMARY KEY, track_id TEXT NOT NULL, title TEXT NOT NULL,
        artist TEXT NOT NULL, image TEXT
      ) STRICT;
    `);
  }

  encrypt(value) {
    const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
  }

  decrypt(value) {
    const [iv, tag, encrypted] = String(value).split('.').map((part) => Buffer.from(part, 'base64url'));
    if (!iv || !tag || !encrypted) throw new Error('Stored Spotify token is invalid.');
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv); decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }

  saveRefreshToken(token) {
    this.db.prepare(`INSERT INTO spotify_token (id, encrypted_refresh_token) VALUES (1, ?)
      ON CONFLICT(id) DO UPDATE SET encrypted_refresh_token = excluded.encrypted_refresh_token, updated_at = CURRENT_TIMESTAMP`).run(this.encrypt(token));
  }

  refreshToken() {
    const row = this.db.prepare('SELECT encrypted_refresh_token FROM spotify_token WHERE id = 1').get();
    return row ? this.decrypt(row.encrypted_refresh_token) : null;
  }

  hasToken() { return Boolean(this.db.prepare('SELECT 1 FROM spotify_token WHERE id = 1').get()); }
  latestSnapshot() { const row = this.db.prepare('SELECT payload FROM snapshots ORDER BY id DESC LIMIT 1').get(); return row ? JSON.parse(row.payload) : null; }
  previousSnapshot() { const row = this.db.prepare('SELECT payload FROM snapshots ORDER BY id DESC LIMIT 1 OFFSET 1').get(); return row ? JSON.parse(row.payload) : null; }
  snapshotCount() { return Number(this.db.prepare('SELECT COUNT(*) AS count FROM snapshots').get().count); }
  saveSnapshot(snapshot) { this.db.prepare('INSERT INTO snapshots (payload) VALUES (?)').run(JSON.stringify(snapshot)); }
  latestListeningEventAt() {
    return this.db.prepare('SELECT played_at FROM listening_events ORDER BY played_at DESC LIMIT 1').get()?.played_at || null;
  }
  saveListeningEvents(events) {
    const insert = this.db.prepare('INSERT OR IGNORE INTO listening_events (played_at, track_id, title, artist, image) VALUES (?, ?, ?, ?, ?)');
    for (const event of events) insert.run(event.playedAt, event.trackId, event.title, event.artist, event.image);
  }
  listeningDiary(days = 7, now = new Date()) {
    const safeDays = Math.max(1, Math.min(Number(days) || 7, 31));
    const cutoff = new Date(now.valueOf() - safeDays * 24 * 60 * 60 * 1000).toISOString();
    const rows = this.db.prepare('SELECT played_at, track_id, title, artist, image FROM listening_events WHERE played_at >= ? ORDER BY played_at DESC').all(cutoff);
    const byDay = new Map(); const tracks = new Map();
    for (const row of rows) {
      const day = row.played_at.slice(0, 10);
      const daily = byDay.get(day) || { date: day, plays: 0, tracks: new Map() };
      daily.plays += 1;
      const dailyTrack = daily.tracks.get(row.track_id) || { title: row.title, artist: row.artist, image: row.image, plays: 0 };
      dailyTrack.plays += 1; daily.tracks.set(row.track_id, dailyTrack); byDay.set(day, daily);
      const track = tracks.get(row.track_id) || { title: row.title, artist: row.artist, image: row.image, plays: 0 };
      track.plays += 1; tracks.set(row.track_id, track);
    }
    const ranking = (items) => [...items].sort((left, right) => right.plays - left.plays || String(left.title || left.date).localeCompare(String(right.title || right.date)));
    return {
      totalPlays: rows.length,
      days: ranking([...byDay.values()].map((day) => ({ ...day, topTrack: ranking(day.tracks.values())[0] || null }))).sort((left, right) => right.date.localeCompare(left.date)).map(({ date, plays, topTrack }) => ({ date, plays, topTrack })),
      topTracks: ranking(tracks.values()).slice(0, 5),
    };
  }
  archive(limit = 90) {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 90, 90));
    return this.db.prepare('SELECT payload, created_at FROM snapshots ORDER BY id DESC LIMIT ?').all(safeLimit).map((row) => {
      const snapshot = JSON.parse(row.payload);
      return {
        savedAt: snapshot.refreshedAt || row.created_at,
        likedTracks: Number(snapshot.summary?.likedTracks || 0),
        followedShows: Number(snapshot.summary?.followedShows || 0),
        topTrack: snapshot.topTracks?.[0]?.title || null,
        topArtist: snapshot.topArtists?.[0]?.title || null,
        topTrackImage: snapshot.topTracks?.[0]?.image || null,
        topArtistImage: snapshot.topArtists?.[0]?.image || null,
        topTracks: (snapshot.topTracks || []).slice(0, 5).map((track) => ({ title: track.title || 'Untitled track', image: track.image || null, spotifyId: track.spotifyId || null })),
        topArtists: (snapshot.topArtists || []).slice(0, 5).map((artist) => ({ title: artist.title || 'Unknown artist', image: artist.image || null })),
      };
    });
  }
  setRefreshError(message) { this.db.prepare(`INSERT INTO refresh_status (id, last_error) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET last_error = excluded.last_error, updated_at = CURRENT_TIMESTAMP`).run(message || null); }
  close() { this.db.close(); }

  dashboard() {
    const snapshot = this.latestSnapshot();
    if (!snapshot) return { ...emptyDashboard(), connected: this.hasToken() };
    return { ...snapshot, connected: true, summary: { ...snapshot.summary, snapshots: this.snapshotCount() } };
  }
}
