import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ResonanceStore } from './resonance-store.mjs';
import { collectRecentlyPlayed, refreshAccessToken, spotifyConfigFromEnv, spotifyConfigured } from './spotify.mjs';

const config = spotifyConfigFromEnv();
if (!spotifyConfigured(config)) throw new Error('Spotify is not configured.');
const dataDir = process.env.APP_DATA_DIR || join(process.cwd(), '.local', 'resonance');
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const store = new ResonanceStore(join(dataDir, 'resonance.sqlite'), process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY);
try {
  const token = store.refreshToken();
  if (!token) throw new Error('Spotify has not been connected yet.');
  const refreshed = await refreshAccessToken(config, token);
  if (refreshed.refresh_token) store.saveRefreshToken(refreshed.refresh_token);
  const events = await collectRecentlyPlayed(refreshed.access_token, store.latestListeningEventAt());
  store.saveListeningEvents(events);
  store.setRefreshError(null);
  console.log(`Spotify listening diary refreshed (${events.length} events).`);
} catch (error) {
  store.setRefreshError('The listening diary refresh failed. Reconnect Spotify if this continues.');
  throw error;
} finally { store.close(); }
