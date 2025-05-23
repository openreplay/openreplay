import { mkdirSync } from "fs";
import { exists } from "i18next";
import { dirname } from "path";
import { test } from "@playwright/test";

export const authStateFile =  'tests/playwright/auth-state.json';

mkdirSync(dirname(authStateFile), { recursive: true });

export function testUseAuthState() {
    if (exists(authStateFile)) {
        test.use({ storageState: authStateFile });
    }

    test.afterEach(async ({ page }) => {
        await page.context().storageState({ path: authStateFile });
    })
}