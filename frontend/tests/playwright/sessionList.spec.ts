import { test } from '@playwright/test';
import { testUseAuthState } from './helpers';

testUseAuthState();

test('check session list after change period', async ({ page }) => {
  const LOGIN = process.env.TEST_FOSS_LOGIN || '';
  const PASSWORD = process.env.TEST_FOSS_PASSWORD || '';
  await page.goto('http://localhost:3333/login');
  await page.locator('[data-test-id="login"]').fill(LOGIN);
  await page
    .locator('[data-test-id="password"]')
    .fill(PASSWORD);
  await page.locator('[data-test-id="log-button"]').click();
  await page.getByRole('button', { name: 'Android caret-down' }).click();
  await page
    .getByRole('menuitem', { name: 'OpenReplay Documentation Site' })
    .click();
  await page.getByRole('button', { name: 'Past 24 Hours down' }).click();
  await page.getByRole('menuitem', { name: 'Past 30 Days' }).click();
  await page.locator('#session-item').first().click();
});
