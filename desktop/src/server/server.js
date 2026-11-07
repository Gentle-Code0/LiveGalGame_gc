import http from 'node:http';
import fs from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { validateArguments } from './validation.js';

const MAX_BODY_BYTES = 1024 * 1024;
const MAX_ACTIVE_REQUESTS = 16;
const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

/** Serve built assets and a bounded, same-origin RPC stream. No filesystem paths are accepted by RPC. */
export function createWebServer({ registry, publicDirectory }) {
  const assetRoot = path.resolve(publicDirectory);
  const activeOperations = new Set();
  let pendingRequests = 0;
  const server = http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    response.setHeader('Permissions-Policy', 'microphone=(), camera=(), display-capture=()');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'");
    const reject = (status, message) => {
      response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ error: message }));
    };
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      if (pathname === '/api/health' && request.method === 'GET') {
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ status: 'ok' }));
        return;
      }
      if (pathname.startsWith('/api/')) {
        if (request.method !== 'POST') return reject(405, 'POST required');
        const origin = request.headers.origin;
        if ((origin && origin !== `http://${request.headers.host}` && origin !== `https://${request.headers.host}`) || request.headers['sec-fetch-site'] === 'cross-site') {
          return reject(403, 'Cross-origin request rejected');
        }
        if (!request.headers['content-type']?.startsWith('application/json')) return reject(415, 'JSON required');
        let operation;
        try { operation = decodeURIComponent(pathname.slice('/api/rpc/'.length)); }
        catch { return reject(400, 'Invalid operation'); }
        if (!pathname.startsWith('/api/rpc/') || !registry.operations.has(operation)) return reject(404, 'Unknown operation');
        if (Math.max(pendingRequests, activeOperations.size) >= MAX_ACTIVE_REQUESTS) return reject(503, 'Server busy');
        pendingRequests += 1;
        response.once('close', () => { pendingRequests -= 1; });
        const bodyChunks = [];
        let bodyBytes = 0;
        for await (const chunk of request) {
          bodyBytes += chunk.length;
          if (bodyBytes > MAX_BODY_BYTES) { reject(413, 'Payload too large'); return; }
          bodyChunks.push(chunk);
        }
        let argumentsList;
        try {
          argumentsList = JSON.parse(Buffer.concat(bodyChunks).toString('utf8'));
          validateArguments(operation, argumentsList);
        } catch { return reject(400, 'Invalid request arguments'); }
        response.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
        const send = packet => {
          if (!response.destroyed && !response.writableEnded) response.write(JSON.stringify(packet) + '\n');
        };
        // Events stay on this request; one browser never receives another browser's stream.
        const event = { sender: { isDestroyed: () => response.destroyed, send: (channel, data) => send({ type: 'event', channel, data }) } };
        const operationTask = Promise.resolve().then(() => registry.operations.get(operation)(event, ...argumentsList));
        activeOperations.add(operationTask);
        try {
          const result = await operationTask;
          send({ type: 'result', data: result ?? null });
        } catch (error) {
          send({ type: 'error', error: error.message || 'Operation failed' });
        } finally {
          activeOperations.delete(operationTask);
          response.end();
        }
        return;
      }
      if (!['GET', 'HEAD'].includes(request.method)) return reject(405, 'GET required');
      let assetPath;
      try { assetPath = path.resolve(assetRoot, '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname)); }
      catch { return reject(400, 'Invalid path'); }
      if (!assetPath.startsWith(assetRoot + path.sep)) return reject(403, 'Invalid asset path');
      try {
        if (!(await stat(assetPath)).isFile()) return reject(404, 'Not found');
      } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return reject(404, 'Not found');
        throw error;
      }
      response.setHeader('Content-Type', contentTypes[path.extname(assetPath)] || 'application/octet-stream');
      if (request.method === 'HEAD') { response.end(); return; }
      await pipeline(fs.createReadStream(assetPath), response);
    } catch (error) {
      if (!response.headersSent) reject(500, 'Request failed');
      else response.destroy();
      if (error.code !== 'ERR_STREAM_PREMATURE_CLOSE') console.error('[HTTP] Request failed:', error.message);
    }
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  return { server, activeOperations };
}
