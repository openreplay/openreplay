import { test, expect } from '@playwright/test';

test('Spots should display', async ({ page }) => {
  await page.goto('http://localhost:3333/login');
  await page.locator('[data-test-id="login"]').fill('andrei@openreplay.com');
  await page.locator('[data-test-id="password"]').fill('Andrey123!');
  await page.locator('[data-test-id="log-button"]').click();
  await page.getByText('Spots').click();
  await page.waitForTimeout(1000);
  const spotItems = (
    await page.locator('[data-test-id="spot-list-item"]').all()
  ).length;
  expect(spotItems).toBeGreaterThan(0);
});
