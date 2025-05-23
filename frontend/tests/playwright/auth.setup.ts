import { authStateFile, testUseAuthState } from './helpers'; 
import { test } from '@playwright/test';

testUseAuthState();

test('authenticate', async ({ page }) => {
    await page.goto('/');

    try {
        const url = page.url();

        if (url.includes('login')) {
            await page.locator('[data-test-id="login"]').click();
            await page.locator('.ant-input-affix-wrapper').first().click();
            await page.locator('[data-test-id="login"]').fill('andrei@openreplay.com');
            await page.locator('[data-test-id="password"]').click();
            await page.locator('[data-test-id="password"]').fill('Andrey123!');
            await page.locator('[data-test-id="log-button"]').click();
        }
        await page.waitForSelector('h1:has-text("Sessions")', { timeout: 10000 });
    } catch (e) {}

    try {
        await page.context().storageState({ path: authStateFile });
    } catch {}
});