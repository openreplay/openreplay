import { expect, test } from '@playwright/test';

import { authStateFile, fillLogin } from './helpers';

// the one spec that signs in for real, so it starts from a clean context
test.use({ storageState: { cookies: [], origins: [] } });

test('Sign in flow', async ({ page }) => {
  await page.goto('/login');
  await fillLogin(page);
  await expect(page.getByRole('heading', { name: 'Sessions' })).toBeVisible();

  /* This login invalidated the token in the shared state file; write the new
     one back so specs running after this do not fall out of their session. */
  await page.context().storageState({ path: authStateFile });
});
