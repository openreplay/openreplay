import { test, expect } from '@playwright/test';

test('Check if dashboards exist', async ({ page }) => {
  await page.goto('http://localhost:3333/login');
  await page.locator('[data-test-id="login"]').fill('andrei@openreplay.com');
  await page.locator('[data-test-id="password"]').fill('Andrey123!');
  await page.locator('[data-test-id="log-button"]').click();
  await page.getByText('Dashboards').click();
  await page.getByText('Renamed One').click();
  await expect(page.getByRole('heading', { name: 'Renamed One' })).toBeVisible();
});