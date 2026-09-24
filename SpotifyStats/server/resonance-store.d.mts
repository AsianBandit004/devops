export type DashboardItem = { title: string; detail: string; image?: string; change?: string; spotifyId?: string };
export type Snapshot = {
  profile?: { name: string; image?: string };
  summary: { likedTracks: number; followedShows: number; snapshots: number };
  topTracks: DashboardItem[];
  topArtists: DashboardItem[];
  trending: DashboardItem[];
  refreshedAt?: string;
};

export type ArchiveEntry = {
  savedAt: string;
  likedTracks: number;
  followedShows: number;
  topTrack: string | null;
  topArtist: string | null;
  topTrackImage: string | null;
  topArtistImage: string | null;
  topTracks: Array<{ title: string; image: string | null; spotifyId: string | null }>;
  topArtists: Array<{ title: string; image: string | null }>;
};

export type ListeningTrack = { title: string; artist: string; image: string | null; plays: number };
export type ListeningDiary = { totalPlays: number; days: Array<{ date: string; plays: number; topTrack: ListeningTrack | null }>; topTracks: ListeningTrack[] };

export declare class ResonanceStore {
  constructor(path: string, encryptionKey: string);
  saveRefreshToken(token: string): void;
  refreshToken(): string | null;
  hasToken(): boolean;
  latestSnapshot(): Snapshot | null;
  previousSnapshot(): Snapshot | null;
  snapshotCount(): number;
  saveSnapshot(snapshot: Snapshot): void;
  latestListeningEventAt(): string | null;
  saveListeningEvents(events: Array<{ playedAt: string; trackId: string; title: string; artist: string; image: string | null }>): void;
  listeningDiary(days?: number, now?: Date): ListeningDiary;
  archive(limit?: number): ArchiveEntry[];
  setRefreshError(message: string | null): void;
  dashboard(): Snapshot & { connected: boolean };
  close(): void;
}
