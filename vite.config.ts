import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { routeCssSplit } from './build/routeCssSplit';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [routeCssSplit(), react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
