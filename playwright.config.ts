import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: process.env.E2E_BASE_URL || 'http://app:3000', headless: true },
  reporter: 'list',
});
