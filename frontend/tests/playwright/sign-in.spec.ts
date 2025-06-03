import { test, expect } from '@playwright/test';

test('Sign in flow', async ({ page }) => {
  const LOGIN = process.env.TEST_FOSS_LOGIN || '';
  const PASSWORD = process.env.TEST_FOSS_PASSWORD || '';
  await page.goto('/');
  await page
        .locator('[data-test-id="login"]')
        .fill(LOGIN);
  await page.locator('[data-test-id="password"]').fill(PASSWORD);
  await page.locator('[data-test-id="log-button"]').click();
  await expect(page.getByRole('heading', { name: 'Sessions' })).toBeVisible();
});