import { test, expect } from '@playwright/test';

test('Sign in flow', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-test-id="login"]').fill('andrei@openreplay.com');
  await page.locator('[data-test-id="password"]').fill('Andrey123!');
  await page.locator('[data-test-id="log-button"]').click();
  await expect(page.getByRole('heading', { name: 'Sessions' })).toBeVisible();
});