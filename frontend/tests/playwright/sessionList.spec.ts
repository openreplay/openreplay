import { test, expect } from '@playwright/test';

test('check session list after change period', async ({ page }) => {
  await page.goto('http://localhost:3333/login');
  await page.locator('[data-test-id="login"]').click();
  await page.locator('[data-test-id="login"]').fill('andrei@openreplay.com');
  await page.locator('[data-test-id="password"]').click();
  await page.locator('[data-test-id="password"]').fill('Andrey123!');
  await page.locator('[data-test-id="log-button"]').click();
  await page.getByRole('button', { name: 'Android caret-down' }).click();
  await page.getByRole('menuitem', { name: 'OpenReplay Documentation Site' }).click();
  await page.getByRole('button', { name: 'Past 24 Hours down' }).click();
  await page.getByRole('menuitem', { name: 'Past 30 Days' }).click();
  await page.locator('#session-item').first().click();
});