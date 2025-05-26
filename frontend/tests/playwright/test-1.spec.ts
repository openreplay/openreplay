import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3333/login');
  await page.locator('[data-test-id="login"]').fill('andrei@openreplay.com');
  await page.locator('[data-test-id="password"]').click();
  await page.locator('[data-test-id="password"]').fill('Andrey123!');
  await page.locator('[data-test-id="log-button"]').click();
  await page.getByTitle('Past 24 Hours').click();
  await page.getByText('Past 30 Days').click();
  await page.getByRole('button', { name: 'Android caret-down' }).click();
  await page.getByText('OpenReplay Documentation Site').click();
  await page.locator('.group').first().click();
  await page
    .locator('div')
    .filter({
      hasText: /^Anonymous UserMay 21, 03:48pm··Edge, Mac OS X, Desktop·More$/,
    })
    .first()
    .click({
      button: 'right',
    });
  const iframeElement = await page
    .locator('iframe[class^="screen-module__iframe"]')
    .first();
  const frameHandle = await iframeElement.elementHandle();
  const frame = await frameHandle?.contentFrame();
  const hasBody = await frame?.evaluate(() => !!document.body);
  expect(hasBody).toBeTruthy();
});
