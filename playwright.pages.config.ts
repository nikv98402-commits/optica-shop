import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'github-pages-direct-routes.spec.ts',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'retain-on-failure',
  },
  webServer: {
    command:
      'npm run build && node scripts/add-github-pages-routes.mjs && node scripts/serve-pages-artifact.mjs',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_FEATURE_KNOWLEDGE_ASSISTANT: 'true',
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'public-test-anon-key',
    },
  },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }],
});
