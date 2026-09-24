import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, statSync, createReadStream } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { ResonanceStore } from './resonance-store.mjs';
import { authorizationUrl, collectSnapshot, exchangeAuthorizationCode, spotifyConfigFromEnv, spotifyConfigured } from './spotify.mjs';

const root = join(process.cwd(), 'dist');
const port = Number(process.env.PORT || 3333);
const production = process.env.NODE_ENV === 'production';
const config = spotifyConfigFromEnv();
const dataDir = process.env.APP_DATA_DIR || join(process.cwd(), '.local', 'resonance');
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const encryptionKey = process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY || (production ? '' : '0'.repeat(64));
const store = new ResonanceStore(join(dataDir, 'resonance.sqlite'), encryptionKey);
const mime = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; connect-src 'self'; frame-src https://open.spotify.com; img-src 'self' data: https://i.scdn.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com",
  'Cross-Origin-Opener-Policy': 'same-origin', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
};
const cookie = (name, value, maxAge = 600) => `${name}=${value}; Path=/; HttpOnly; SameSite=Lax${production ? '; Secure' : ''}; Max-Age=${maxAge}`;
const cookies = (header = '') => Object.fromEntries(header.split(';').map((part) => part.trim().split(/=(.*)/s)).filter(([key]) => key));
const send = (response, status, body, headers = {}) => { response.writeHead(status, { ...securityHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }); response.end(JSON.stringify(body)); };
const redirect = (response, location, headers = {}) => { response.writeHead(302, { ...securityHeaders, 'Cache-Control': 'no-store', Location: location, ...headers }); response.end(); };
const unavailable = (response) => send(response, 503, { error: 'Spotify connection is not configured.' });

const app = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://localhost'); const { pathname } = url;
    if (pathname === '/api/health') return request.method === 'GET' ? send(response, 200, { ok: true, service: 'resonance' }) : send(response, 405, { error: 'Method not allowed.' });
    if (pathname === '/api/dashboard') return request.method === 'GET' ? send(response, 200, store.dashboard()) : send(response, 405, { error: 'Method not allowed.' });
    if (pathname === '/api/archive') return request.method === 'GET' ? send(response, 200, { archive: store.archive() }) : send(response, 405, { error: 'Method not allowed.' });
    if (pathname === '/api/listening-diary') return request.method === 'GET' ? send(response, 200, store.listeningDiary()) : send(response, 405, { error: 'Method not allowed.' });
    if (pathname === '/auth/spotify') {
      if (request.method !== 'GET') return send(response, 405, { error: 'Method not allowed.' });
      if (!spotifyConfigured(config)) return unavailable(response);
      const state = randomBytes(32).toString('base64url');
      return redirect(response, authorizationUrl(config, state), { 'Set-Cookie': cookie('spotify_oauth_state', state) });
    }
    if (pathname === '/auth/spotify/callback') {
      if (request.method !== 'GET') return send(response, 405, { error: 'Method not allowed.' });
      if (!spotifyConfigured(config)) return unavailable(response);
      const expectedState = cookies(request.headers.cookie).spotify_oauth_state;
      const clearState = { 'Set-Cookie': cookie('spotify_oauth_state', '', 0) };
      if (!expectedState || expectedState !== url.searchParams.get('state')) return redirect(response, '/?spotify=state-error', clearState);
      if (url.searchParams.get('error') || !url.searchParams.get('code')) return redirect(response, '/?spotify=denied', clearState);
      const token = await exchangeAuthorizationCode(config, url.searchParams.get('code'));
      if (!token.refresh_token) throw new Error('Spotify did not return a refresh token.');
      store.saveRefreshToken(token.refresh_token);
      store.saveSnapshot(await collectSnapshot(token.access_token, store.latestSnapshot()));
      store.setRefreshError(null);
      return redirect(response, '/?spotify=connected', clearState);
    }
    if (pathname.startsWith('/api/') || pathname.startsWith('/auth/')) return send(response, 404, { error: 'Not found.' });
    if (!['GET', 'HEAD'].includes(request.method || '')) return send(response, 405, { error: 'Method not allowed.' });
    const candidate = normalize(join(root, pathname === '/' ? 'index.html' : pathname));
    const file = candidate.startsWith(root) && existsSync(candidate) && !statSync(candidate).isDirectory() ? candidate : join(root, 'index.html');
    response.writeHead(200, { ...securityHeaders, 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': file.endsWith('index.html') ? 'no-store' : 'public, max-age=31536000, immutable' });
    if (request.method === 'HEAD') return response.end();
    createReadStream(file).pipe(response);
  } catch {
    store.setRefreshError('The last Spotify refresh failed. Reconnect Spotify if this continues.');
    send(response, 500, { error: 'Spotify connection could not be completed.' });
  }
});

app.listen(port, '127.0.0.1', () => console.log(`Resonance listening on http://127.0.0.1:${port}`));
process.on('SIGTERM', () => { store.close(); app.close(() => process.exit(0)); });
