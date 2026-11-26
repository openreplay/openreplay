import { expect, test } from '@playwright/test';

import { authStateFile, openNav, selectProject } from './helpers';

test.use({ storageState: authStateFile });

test('Check if dashboards exist', async ({ page }) => {
  await page.goto('/');
  const siteId = await selectProject(page);
  await openNav(page, 'Dashboards', 'Product Analytics');
  await expect(page).toHaveURL(new RegExp(`/${siteId}/dashboard$`));

  const row = page
    .getByRole('table', { name: 'Dashboards' })
    .locator('tbody tr')
    .first();
  await expect(row).toBeVisible();
  const name = (await row.locator('.m-truncate').first().innerText()).trim();
  await row.getByText(name, { exact: true }).click();

  await expect(page).toHaveURL(new RegExp(`/${siteId}/dashboard/\\d+`));
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
});
