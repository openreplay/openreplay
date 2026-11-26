import { expect, test } from '@playwright/test';

import { authStateFile, openNav } from './helpers';

test.use({ storageState: authStateFile });

test('Spots should display', async ({ page }) => {
  await page.goto('/');
  await openNav(page, 'Spot');
  await expect(page).toHaveURL(/\/spots/);
  await expect(
    page.locator('[data-test-id="spot-list-item"]').first(),
  ).toBeVisible();
});
