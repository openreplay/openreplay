import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

// another checkout's dev server may hold 3333; PW_PORT keeps a run on its own
const port = process.env.PW_PORT ?? '3333';
const CI = !!process.env.CI;

/* CI uploads only test-results: real-backend runs keep no traces or
   screenshots there, and the login specs write elsewhere. */
const realBackend = CI ? ({ trace: 'off', screenshot: 'off' } as const) : {};
const loginOutput = 'test-results-login';

/**
 * See https://playwright.dev/docs/test-configuration.
 */

export default defineConfig({
  testDir: './tests/playwright',
  fullyParallel: true,
  retries: CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      outputDir: loginOutput,
      use: realBackend,
    },
    {
      name: 'sign-in',
      testMatch: /sign-in\.spec\.ts/,
      outputDir: loginOutput,
      use: { ...devices['Desktop Chrome'], ...realBackend },
      dependencies: ['setup'],
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...realBackend },
      testIgnore: [/mocked\//, /sign-in\.spec\.ts/],
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
