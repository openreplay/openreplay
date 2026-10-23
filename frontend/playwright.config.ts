import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */

export default defineConfig({
  testDir: './tests/playwright',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  // html only in CI, where the report is uploaded as a failure artifact
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3333',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /mocked\//,
      dependencies: ['setup'],
    },
    /* API fully mocked with page.route: no backend, no credentials */
    {
      name: 'mocked',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /mocked\/.*\.spec\.ts/,
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3333',
    timeout: 120 * 1000,
    reuseExistingServer: true,
  },
});