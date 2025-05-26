import { test, expect } from '@playwright/test';
import { testUseAuthState } from './helpers';

testUseAuthState();

test('check session list after change period', async ({ page }) => {
  await page.goto('http://localhost:3333/login');
  await page.locator('[data-test-id="login"]').click();
  await page.locator('[data-test-id="login"]').fill('andrei@openreplay.com');
  await page.locator('[data-test-id="password"]').click();
  await page.locator('[data-test-id="password"]').fill('Andrey123!');
  await page.locator('[data-test-id="log-button"]').click();
  
  
});