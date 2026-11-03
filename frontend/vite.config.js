import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the API (port 4000) is proxied so the browser sees a single origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
    },
  },
});
