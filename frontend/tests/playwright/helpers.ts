import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { expect, type Page } from '@playwright/test';

export const authStateFile = 'tests/playwright/auth-state.json';

mkdirSync(dirname(authStateFile), { recursive: true });

export const projectName = () =>
  process.env.TEST_FOSS_PROJECT || 'OpenReplay Documentation Site';

/* The dropdown's button label is the *current* project, which the account
   carries between runs — matching on it (`Android caret-down`) makes a spec
   depend on whatever the previous spec last selected. The test id does not. */
export async function selectProject(page: Page, name = projectName()) {
  await page.locator('[data-test-id="project-dropdown"]').click();
  await page.getByRole('menuitem', { name }).click();
  await expect(page).toHaveURL(/\/\d+\//);
  return new URL(page.url()).pathname.split('/')[1];
}

export async function fillLogin(page: Page) {
  const LOGIN = process.env.TEST_FOSS_LOGIN || '';
  const PASSWORD = process.env.TEST_FOSS_PASSWORD || '';

  expect(
    Boolean(LOGIN && PASSWORD),
    'TEST_FOSS_LOGIN / TEST_FOSS_PASSWORD are not set',
  ).toBeTruthy();

  await page.locator('[data-test-id="login"]').fill(LOGIN);
  await page.locator('[data-test-id="password"]').fill(PASSWORD);
  await page.locator('[data-test-id="log-button"]').click();
}
