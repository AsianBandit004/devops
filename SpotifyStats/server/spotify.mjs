const scopes = ['user-read-private', 'user-library-read', 'user-top-read', 'user-read-recently-played'];
const tokenUrl = 'https://accounts.spotify.com/api/token';
const apiRoot = 'https://api.spotify.com/v1';

const basicAuth = (config) => `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`;
const image = (images = []) => images.find((entry) => entry.url)?.url;
const artists = (items = []) => items.map((artist) => artist.name).filter(Boolean).join(', ');

async function spotifyFetch(url, options) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try { return await fetch(url, options); } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw lastError;
}

async function tokenRequest(config, values) {
  const response = await spotifyFetch(tokenUrl, { method: 'POST', headers: { Authorization: basicAuth(config), 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(values) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) throw new Error(`Spotify token request failed (${response.status}).`);
  return payload;
}

async function spotifyGetUrl(accessToken, url) {
  const response = await spotifyFetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Spotify data request failed (${response.status}).`);
  return payload;
}

async function spotifyGet(accessToken, path) { return spotifyGetUrl(accessToken, `${apiRoot}${path}`); }

export const spotifyConfigFromEnv = (env = process.env) => ({ clientId: env.SPOTIFY_CLIENT_ID || '', clientSecret: env.SPOTIFY_CLIENT_SECRET || '', redirectUri: env.SPOTIFY_REDIRECT_URI || '' });
export const spotifyConfigured = (config) => Boolean(config.clientId && config.clientSecret && config.redirectUri);

export const authorizationUrl = (config, state) => {
  const url = new URL('https://accounts.spotify.com/authorize');
  url.search = new URLSearchParams({ client_id: config.clientId, response_type: 'code', redirect_uri: config.redirectUri, state, scope: scopes.join(' ') }).toString();
  return url.toString();
};

export const exchangeAuthorizationCode = (config, code) => tokenRequest(config, { grant_type: 'authorization_code', code, redirect_uri: config.redirectUri });
export const refreshAccessToken = (config, refreshToken) => tokenRequest(config, { grant_type: 'refresh_token', refresh_token: refreshToken });

export async function collectRecentlyPlayed(accessToken, after) {
  const url = new URL(`${apiRoot}/me/player/recently-played`);
  url.searchParams.set('limit', '50');
  if (after) url.searchParams.set('after', String(Math.max(0, new Date(after).valueOf() - 1)));
  const events = [];
  let pageUrl = url.toString();

  for (let page = 0; page < 10 && pageUrl; page += 1) {
    const payload = await spotifyGetUrl(accessToken, pageUrl);
    for (const item of payload.items || []) {
      if (!item.played_at || !item.track?.id || !item.track?.name) continue;
      events.push({
        playedAt: item.played_at,
        trackId: item.track.id,
        title: item.track.name,
        artist: artists(item.track.artists) || 'Unknown artist',
        image: image(item.track.album?.images) || null,
      });
    }
    pageUrl = payload.next || '';
  }
  return events.sort((left, right) => left.playedAt.localeCompare(right.playedAt));
}

export async function collectSnapshot(accessToken, previousSnapshot) {
  const [profile, tracks, topArtists, likedTracks, shows] = await Promise.all([
    spotifyGet(accessToken, '/me'),
    spotifyGet(accessToken, '/me/top/tracks?time_range=short_term&limit=5'),
    spotifyGet(accessToken, '/me/top/artists?time_range=short_term&limit=5'),
    spotifyGet(accessToken, '/me/tracks?limit=1'),
    spotifyGet(accessToken, '/me/shows?limit=1'),
  ]);
  const topTracks = (tracks.items || []).map((track) => ({ title: track.name, detail: `${artists(track.artists)}${track.album?.name ? ` · ${track.album.name}` : ''}`, image: image(track.album?.images), spotifyId: track.id || undefined }));
  const topArtistItems = (topArtists.items || []).map((artist) => ({ title: artist.name, detail: (artist.genres || []).slice(0, 2).join(' · ') || 'Spotify artist', image: image(artist.images) }));
  const oldRanks = new Map((previousSnapshot?.topTracks || []).map((track, index) => [track.title, index]));
  const biggestMover = topTracks.map((track, index) => ({ track, index, oldRank: oldRanks.get(track.title) })).sort((a, b) => (b.oldRank ?? 99) - (a.oldRank ?? 99))[0];
  const trend = biggestMover ? (biggestMover.oldRank === undefined
    ? { title: `${biggestMover.track.title} is new to the list.`, detail: 'A fresh arrival in your recent listening.' }
    : { title: `${biggestMover.track.title} is moving up.`, detail: `Now #${biggestMover.index + 1}, up from #${biggestMover.oldRank + 1} in your last snapshot.` })
    : { title: 'The signal is quiet', detail: 'Spotify has not returned enough listening data yet.' };
  return {
    profile: { name: profile.display_name || profile.id || 'Listener', image: image(profile.images) },
    summary: { likedTracks: Number(likedTracks.total || 0), followedShows: Number(shows.total || 0), snapshots: 0 },
    topTracks,
    topArtists: topArtistItems,
    trending: [trend],
    refreshedAt: new Date().toISOString(),
  };
}
