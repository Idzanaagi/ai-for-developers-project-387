import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src/__tests__/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 15000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: {
    command: 'npx tsx src/server.ts',
    port: 3000,
    reuseExistingServer: true,
    timeout: 10000,
  },
});
