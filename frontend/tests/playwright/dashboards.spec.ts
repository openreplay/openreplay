import { expect, test } from '@playwright/test';

import { authStateFile } from './helpers';

test.use({ storageState: authStateFile });

test('Check if dashboards exist', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('menuitem', { name: 'Dashboards', exact: true }).click();
  await page.getByText('Renamed One').click();
  await expect(page.getByRole('heading', { name: 'Renamed One' })).toBeVisible();
});
