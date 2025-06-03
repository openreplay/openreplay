import { test, expect } from '@playwright/test';

test('Check if dashboards exist', async ({ page }) => {
  const LOGIN = process.env.TEST_FOSS_LOGIN || '';
  const PASSWORD = process.env.TEST_FOSS_PASSWORD || '';
  await page.goto('http://localhost:3333/login');
  await page
        .locator('[data-test-id="login"]')
        .fill(LOGIN);
  await page.locator('[data-test-id="password"]').fill(PASSWORD);
  await page.locator('[data-test-id="log-button"]').click();
  await page.getByText('Dashboards').click();
  await page.getByText('Renamed One').click();
  await expect(page.getByRole('heading', { name: 'Renamed One' })).toBeVisible();
});