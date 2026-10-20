import { defineConfig, type Plugin } from 'vite';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Stamps the built service worker with a version and the full asset list. */
function serviceWorkerPlugin(): Plugin {
  return {
    name: 'tgm-service-worker',
    apply: 'build',
    closeBundle() {
      const dist = join(process.cwd(), 'dist');
      const assets = new Set<string>();
      const walk = (dir: string, prefix: string): void => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          if (entry.name === 'sw.js') continue;
          const path = join(dir, entry.name);
          if (entry.isDirectory()) walk(path, `${prefix}${entry.name}/`);
          else assets.add(`./${prefix}${entry.name}`);
        }
      };
      try {
        walk(dist, '');
        const swPath = join(dist, 'sw.js');
        const code = readFileSync(swPath, 'utf8')
          .replace('__PRECACHE_ASSETS__', JSON.stringify([...assets].sort(), null, 2))
          .replace('__BUILD_VERSION__', String(Date.now()));
        writeFileSync(swPath, code);
      } catch (error) {
        this.error(`service worker stamping failed: ${String(error)}`);
      }
    },
  };
}

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
  },
  server: {
    host: true,
  },
  plugins: [serviceWorkerPlugin()],
});
