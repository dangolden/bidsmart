import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'configure-response-headers',
      configureServer: (server) => {
        server.middlewares.use((_req, res, next) => {
          // Development CSP: Allow embedding in all authorized domains
          // Includes localhost, HomeDoc domains, client domains, and test environments
          res.setHeader(
            'Content-Security-Policy',
            "frame-ancestors 'self' http://localhost:* https://localhost:* " +
            "https://switchison.org https://*.switchison.org " +
            "https://homedoc.us https://*.homedoc.us " +
            "https://bolt.new https://*.bolt.new " +
            "https://stackblitz.com https://*.stackblitz.com"
          );
          res.setHeader('X-Frame-Options', 'ALLOWALL');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
