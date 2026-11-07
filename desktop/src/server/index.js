import { fileURLToPath } from 'node:url';
import { IPCManager } from '../core/modules/ipc-handlers.js';
import { OperationRegistry } from './registry.js';
import { createWebServer } from './server.js';

const port = Number(process.env.PORT ?? 7456);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const registry = new OperationRegistry();
const services = new IPCManager();
services.registerHandlers(registry);
const publicDirectory = fileURLToPath(new URL('../../dist/renderer/', import.meta.url));
const { server, activeOperations } = createWebServer({ registry, publicDirectory });
let stopping = false;

async function shutdown() {
  if (stopping) return;
  stopping = true;
  // Upstream LLM calls have service timeouts. Give them time to settle before closing SQLite.
  const deadline = setTimeout(() => { server.closeAllConnections(); process.exit(1); }, 90_000);
  deadline.unref();
  await new Promise(resolve => server.close(resolve));
  await Promise.allSettled([...activeOperations]);
  services.db.close();
  clearTimeout(deadline);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
server.on('error', error => {
  console.error('[HTTP] Unable to listen:', error.message);
  services.db.close();
  process.exitCode = 1;
});
server.listen(port, process.env.HOST || '0.0.0.0', () => {
  console.log(`LiveGalGame Web listening on http://0.0.0.0:${port}`);
});
