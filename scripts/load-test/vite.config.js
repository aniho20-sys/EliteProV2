// Load test build (scripts/load-test/README.md): the real app, with src/firebase.js swapped
// for the emulator version and onSnapshot counted. Built into scripts/load-test/dist — never
// deployed (CI builds with the root vite.config.js).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const SRC_FIREBASE = path.join(root, 'src/firebase.js');
const EMU_FIREBASE = path.join(here, 'firebase.emulator.js');
const COUNTING = path.join(here, 'firestore.counting.js');

const swap = {
  name: 'load-test-swap',
  enforce: 'pre',
  async resolveId(source, importer, options) {
    if (source === 'firebase/firestore' && importer !== COUNTING) return COUNTING;
    const r = await this.resolve(source, importer, { ...options, skipSelf: true });
    if (r && r.id === SRC_FIREBASE) return EMU_FIREBASE;
    return null;
  },
};

export default defineConfig({
  root,
  define: { __APP_BUILD__: JSON.stringify('load-test') },
  plugins: [swap, react()],
  build: { outDir: path.join(here, 'dist'), emptyOutDir: true, target: 'esnext' },
});
