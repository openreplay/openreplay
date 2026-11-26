import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { expect, type Page } from '@playwright/test';

export const authStateFile = 'tests/playwright/auth-state.json';

mkdirSync(dirname(authStateFile), { recursive: true });

export const projectName = () =>
  process.env.TEST_FOSS_PROJECT || 'OpenReplay Documentation Site';

const SITE_ID_STORAGE_KEY = '__$user-siteId$__';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const mainNav = (page: Page) =>
  page.getByRole('navigation', { name: 'Main' });

/* Entries and their subitems live in the nav's group; the footer tools
   (Preferences, Alerts) don't, so a subitem sharing a tool's name stays
   unambiguous. */
export const navItem = (page: Page, label: string) =>
  mainNav(page)
    .getByRole('group')
    .getByRole('button', { name: label, exact: true });

/* ArrowRight unfolds a parent without navigating; a click would also open
   its last-used child, and some of those (Logs) fold the whole nav. */
export async function expandNav(page: Page, parent: string) {
  const p = navItem(page, parent);
  if ((await p.getAttribute('aria-expanded')) === 'true') return;
  await p.press('ArrowRight');
  await expect(p).toHaveAttribute('aria-expanded', 'true');
}

export async function openNav(page: Page, label: string, parent?: string) {
  const item = navItem(page, label);
  if (parent && (await item.count()) === 0) await expandNav(page, parent);
  await item.click();
}

/* The dropdown's label is the *current* project, which the account carries
   between runs; the test id does not depend on it. */
export async function selectProject(page: Page, name = projectName()) {
  const dropdown = page.locator('[data-test-id="project-dropdown"]');
  await dropdown.click();
  await page
    .getByRole('group', { name: 'Projects' })
    .getByRole('button', { name, exact: true })
    .click();
  await expect(dropdown).toHaveAttribute(
    'aria-label',
    new RegExp(`^Switch project: ${escapeRe(name)},`),
  );

  /* The address can still carry the previous project for a tick; the store
     writes the new id synchronously, so wait for the address to agree. */
  const siteId = await page.evaluate(
    (key) => (localStorage.getItem(key) ?? '').split('_$_')[0],
    SITE_ID_STORAGE_KEY,
  );
  expect(siteId, 'no project id after switching').toMatch(/^\d+$/);
  await expect(page).toHaveURL(new RegExp(`^[^?#]*/${siteId}/`));
  return siteId;
}

export async function pickRange(page: Page, label: string) {
  const trigger = page.locator('button[aria-label^="Started:"]').first();
  await trigger.click();
  await page.getByRole('menuitemradio', { name: label, exact: true }).click();
  await expect(trigger).toHaveAttribute('aria-label', `Started: ${label}`);
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
