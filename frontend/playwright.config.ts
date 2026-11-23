import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

// another checkout's dev server may hold 3333; PW_PORT keeps a run on its own
const port = process.env.PW_PORT ?? '3333';

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
    baseURL: `http://localhost:${port}`,
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
    command: `bun run dev --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    timeout: 120 * 1000,
    reuseExistingServer: true,
  },
});