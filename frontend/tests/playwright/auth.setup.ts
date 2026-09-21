import { expect, test as setup } from '@playwright/test';

import { authStateFile, fillLogin } from './helpers';

/* The only login in the suite. The API keeps one active session per user, so a
   second login anywhere invalidates the token every other spec is holding —
   specs read this state instead of signing in themselves. sign-in.spec.ts is
   the deliberate exception and refreshes the file afterwards. */
setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await fillLogin(page);

  /* Failing here rather than saving a logged-out state: every other spec
     depends on this file, and an empty one turns one bad credential into a
     suite-wide cascade of unrelated locator timeouts. */
  await expect(page.getByRole('heading', { name: 'Sessions' })).toBeVisible();

  await page.context().storageState({ path: authStateFile });
});
