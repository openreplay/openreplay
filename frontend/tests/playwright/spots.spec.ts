import { expect, test } from '@playwright/test';

import { authStateFile } from './helpers';

test.use({ storageState: authStateFile });

test('Spots should display', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('menuitem', { name: 'Spots', exact: true }).click();
  await expect(
    page.locator('[data-test-id="spot-list-item"]').first(),
  ).toBeVisible();
});
