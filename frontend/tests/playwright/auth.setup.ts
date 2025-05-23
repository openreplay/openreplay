import { authStateFile, testUseAuthState } from './helpers';
import { expect, test as setup } from '@playwright/test';

testUseAuthState();

setup.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3333');
});

setup('authenticate', async ({ page }) => {
  await page.goto('/login');

  try {
    const url = page.url();
    console.log('Current URL:', url);

    if (url.includes('login')) {
     console.log('Already on login page, skipping authentication');
      await page.locator('[data-test-id="login"]').click();
      await page.locator('.ant-input-affix-wrapper').first().click();
      await page
        .locator('[data-test-id="login"]')
        .fill('andrei@openreplay.com');
      await page.locator('[data-test-id="password"]').click();
      await page.locator('[data-test-id="password"]').fill('Andrey123!');
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
