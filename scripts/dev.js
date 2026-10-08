import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../worker.js';
import { MAX_CONTACT_SIZE } from '../src/server/contact.js';

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png',
  '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
  '.otf': 'font/otf',
};

export async function startDevServer(port = 8000) {
  const root = path.resolve('dist');
  const env = {
    // Local contact delivery is deliberately disabled; browser tests mock it.
    ASSETS: {
      async fetch(request) {
        if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
        let pathname;
        try { pathname = decodeURIComponent(new URL(request.url).pathname); }
        catch { return new Response('Bad path', { status: 400 }); }
        const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
        if (!target.startsWith(root + path.sep)) return new Response('Forbidden', { status: 403 });
        try {
          const body = await readFile(target);
          return new Response(request.method === 'HEAD' ? null : body, {
            headers: { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' },
          });
        } catch (error) {
          if (['ENOENT', 'EISDIR'].includes(error.code)) return new Response('Not found', { status: 404 });
          throw error;
        }
      },
    },
  };
  const server = http.createServer(async (incoming, outgoing) => {
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of incoming) {
        size += chunk.length;
        if (size > MAX_CONTACT_SIZE) { outgoing.writeHead(413); outgoing.end('Request too large'); return; }
        chunks.push(chunk);
      }
      const request = new Request(`http://127.0.0.1:${server.address().port}${incoming.url}`, {
        method: incoming.method, headers: incoming.headers,
        body: ['GET', 'HEAD'].includes(incoming.method) ? undefined : Buffer.concat(chunks),
      });
      const response = await worker.fetch(request, env, { waitUntil: promise => promise.catch(console.error) });
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      console.error('Local server request failed', error);
      outgoing.writeHead(500); outgoing.end('Local server error');
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return server;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await startDevServer(Number(process.env.PORT || 8000));
  console.log(`PeakMemory dev server: http://127.0.0.1:${server.address().port} (email disabled)`);
}
