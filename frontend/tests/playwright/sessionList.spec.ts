import { expect, test } from '@playwright/test';

import { authStateFile, selectProject } from './helpers';

test.use({ storageState: authStateFile });

test('check session list after change period', async ({ page }) => {
  await page.goto('/');
  await selectProject(page);

  await page.locator('[data-test-id="widget-select-date-range"]').first().click();
  await page.getByRole('menuitem', { name: 'Past 30 Days' }).click();

  await expect(page.locator('#session-item').first()).toBeVisible();
  await page.locator('#session-item').first().click();
});
