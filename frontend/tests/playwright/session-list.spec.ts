import { test, expect } from '@playwright/test';
import { testUseAuthState } from './helpers';

testUseAuthState();

test('test', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'OpenReplay Documentation Site' }).click();
  await page.getByRole('menuitem', { name: 'Android' }).locator('div').click();
  await page.getByRole('button', { name: 'Android caret-down' }).click();
  await page.getByText('OpenReplay Documentation Site').click();
  await page.locator('#session-item').first().click();
  await expect(page.locator('#session-item')).toBeVisible();
});