import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = join(process.cwd(), 'dist');
const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.map': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
createServer((request, response) => {
  const path = normalize(join(root, request.url === '/' ? 'index.html' : request.url?.split('?')[0] ?? 'index.html'));
  if (!path.startsWith(root) || !existsSync(path) || statSync(path).isDirectory()) { response.writeHead(404); response.end('Not found'); return; }
  response.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  createReadStream(path).pipe(response);
}).listen(3333, '0.0.0.0', () => console.log('Sky Rider listening on :3333'));
