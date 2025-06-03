import { authStateFile, testUseAuthState } from './helpers';
import { expect, test as setup } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

testUseAuthState();

setup.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3333');
});

setup('authenticate', async ({ page }) => {
  const LOGIN = process.env.TEST_FOSS_LOGIN || '';
  const PASSWORD = process.env.TEST_FOSS_PASSWORD || '';

  await page.goto('/login');

  try {
    const url = page.url();
    console.log('Current URL:', url);

    if (url.includes('login')) {
      console.log('On login page, authenticating...');
      await page.locator('[data-test-id="login"]').fill(LOGIN);
      await page.locator('[data-test-id="password"]').fill(PASSWORD);
      await page.locator('[data-test-id="log-button"]').click();
    }
    await expect(page.getByRole('heading', { name: 'Sessions' })).toBeVisible();
  } catch (e) {
    console.error('Error during authentication:', e);
  }

  try {
    await page.context().storageState({ path: authStateFile });
  } catch (e) {
    console.error('Error saving authentication state:', e);
  }
});
