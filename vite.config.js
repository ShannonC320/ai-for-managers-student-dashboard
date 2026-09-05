import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/ai-for-managers-student-dashboard/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
});
