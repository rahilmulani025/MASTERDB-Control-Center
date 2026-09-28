import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.');
  const backendTarget =
    env.VITE_MASTERDB_BACKEND_TARGET ||
    env.BACKEND_TARGET ||
    'https://bhiv-masterdb-ingestion-certification.onrender.com';


  const proxyConfig = {
    target: backendTarget,
    changeOrigin: true,
    secure: backendTarget.startsWith('https://'),
  };

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/health': proxyConfig,
        '/ready': proxyConfig,
        '/discovery': proxyConfig,
        '/packages': proxyConfig,
        '/validate': proxyConfig,
        '/status': proxyConfig,
        '/report': proxyConfig,
        '/certify': proxyConfig,
        '/mdu': proxyConfig,
        '/tantra': proxyConfig,
        '/runtime': proxyConfig,
        '/shared': proxyConfig,
        '/parikshak': proxyConfig,
        '/niyantran': proxyConfig,
        '/replay-registry': proxyConfig,
        '/admin': proxyConfig,
        '/auth': proxyConfig,
        '/databases': proxyConfig,
        '/ingest': {
          ...proxyConfig,
          bypass(req) {
            if (req.url && (req.url === '/ingestion' || req.url.startsWith('/ingestion/'))) {
              return req.url;
            }
          },
        },
        '/upload': proxyConfig,
      },
    },
  };
});
