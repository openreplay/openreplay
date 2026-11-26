import { expect, test } from '@playwright/test';

import { authStateFile, pickRange, selectProject } from './helpers';

test.use({ storageState: authStateFile });

// loading a real session and replaying it runs well past the 30s default
test.setTimeout(180_000);

test('The freshest session from openreplay website doesnt have white screen', async ({
  page,
}) => {
  await page.goto('/');
  await selectProject(page);

  await pickRange(page, 'Past 30 Days');

  const rows = page.locator('.m-ss__row');
  await expect(rows.nth(1)).toBeVisible();
  await rows.nth(1).locator('.m-ss__play').click();
  await expect(page).toHaveURL(/\/session\/\d+/);

  /* The replay paints into Screen's iframe. Match on the css-module local name
     rather than the whole class: vite hashes it per file content
     (`_iframe_t0yw1_10`), so the hash moves every time screen.module.css does. */
  const screen = page.frameLocator('iframe[class*="_iframe_"]');

  /* A white screen is that iframe mounting with nothing in its document, so
     the assertion is on what the replay put inside it, not on the iframe. */
  await expect
    .poll(
      () =>
        screen
          .locator('body')
          .evaluate((b) => b.childElementCount)
          .catch(() => 0),
      { timeout: 120_000, message: 'replay iframe never painted any content' },
    )
    .toBeGreaterThan(0);
});
