import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3333/login');
  await page.locator('[data-test-id="login"]').fill('andrei@openreplay.com');
  await page.locator('[data-test-id="password"]').click();
  await page.locator('[data-test-id="password"]').fill('Andrey123!');
  await page.locator('[data-test-id="log-button"]').click();
  await page.getByRole('button', { name: 'Android caret-down' }).click();
  await page.getByRole('menuitem', { name: 'OpenReplay Documentation Site' }).click();
  await page.getByTitle('Past 24 Hours').click();
  await page.getByTitle('Past 30 Days').click();
  await page.getByRole('button', { name: 'Refresh' }).click();
  await page.locator('#session-item').first().click();
});