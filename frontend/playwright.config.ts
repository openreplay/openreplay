import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

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
    baseURL: 'http://localhost:3333',
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
      testIgnore: /sign-in\.spec\.ts/,
      dependencies: ['setup'],
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'yarn dev',
    url: 'http://localhost:3333',
    timeout: 120 * 1000,
    reuseExistingServer: true,
  },
});