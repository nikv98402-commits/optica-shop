import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { routeCssSplit } from './build/routeCssSplit';

export default defineConfig({
  plugins: [routeCssSplit(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    css: false,
  },
});
