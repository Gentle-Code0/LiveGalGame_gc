import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { performance } from 'node:perf_hooks';

// 开发服务器耗时日志
const devPerfPlugin = () => {
  const start = performance.now();
  return {
    name: 'dev-perf-logger',
    apply: 'serve',
    configResolved() {
      const cost = (performance.now() - start).toFixed(1);
      console.log(`[VitePerf] configResolved: ${cost}ms`);
    },
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        const cost = (performance.now() - start).toFixed(1);
        console.log(`[VitePerf] dev server listening: ${cost}ms`);
      });
    }
  };
};

export default defineConfig({
  plugins: [react(), devPerfPlugin()],
  base: '/',
  // The existing renderer is now the sole browser entry point.
  root: path.resolve(__dirname, 'src/renderer'),
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/renderer/index.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash][extname]',
      }
    }
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:7456' },
    strictPort: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer')
    }
  }
});

