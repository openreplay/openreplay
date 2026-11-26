import { expect, test } from '@playwright/test';

import { authStateFile, pickRange, selectProject } from './helpers';

test.use({ storageState: authStateFile });

test('check session list after change period', async ({ page }) => {
  await page.goto('/');
  await selectProject(page);
  await pickRange(page, 'Past 30 Days');

  const row = page.locator('.m-ss__row').first();
  await expect(row).toBeVisible();
  // the play mark, not the queue button sharing its cell
  await row.locator('.m-ss__play').click();
  await expect(page).toHaveURL(/\/session\/\d+/);
});
