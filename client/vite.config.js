import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const workspace = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, workspace, '');
  return {
    root,
    esbuild: { jsx: 'automatic' },
    server: {
      host: '127.0.0.1',
      fs: { allow: [workspace] },
      proxy: { '/api': `http://127.0.0.1:${env.PORT || 3000}` },
    },
  };
});
