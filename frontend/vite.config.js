// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: '.',   // build from this folder
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:3000' }
  }
});

