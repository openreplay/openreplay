import { expect, test, type Page } from '@playwright/test';

import { authStateFile } from './helpers';

test.use({ storageState: authStateFile });

const PROJECT_NAME =
  process.env.TEST_FOSS_PROJECT || 'OpenReplay Documentation Site';

interface Destination {
  /* accessible name of the antd menu item */
  label: string;
  /* route it resolves to, minus the /:siteId prefix */
  path: string;
  /* routes left out of REQUIRED_SITE_ID_ROUTES in routes.ts, which
     withSiteId() deliberately leaves unprefixed */
  siteScoped?: boolean;
  /* text the destination renders in the content column, when it differs
     from the menu label */
  renders?: string;
}

/* Anything the account cannot see (plan, role or feature flag) is skipped
   rather than failed — the menu is gated in SideMenu/index.tsx and differs
   between FOSS and EE. */
const DESTINATIONS: Destination[] = [
  { label: 'Sessions', path: '/sessions' },
  { label: 'Bookmarks', path: '/bookmarks' },
  { label: 'Vault', path: '/bookmarks' },
  { label: 'Highlights', path: '/highlights' },
  { label: 'Spots', path: '/spots', siteScoped: false },
  { label: 'Co-Browse', path: '/assist' },
  { label: 'Dashboards', path: '/dashboard' },
  { label: 'Cards', path: '/metrics' },
  { label: 'Alerts', path: '/alerts' },
  { label: 'Activity', path: '/data-management/activity' },
];

/* Children of the "Data Management" submenu, which has to be expanded first. */
const DATA_MANAGEMENT: Destination[] = [
  { label: 'People', path: '/data-management/list/users' },
  { label: 'Events', path: '/data-management/list/events' },
  {
    label: 'Properties',
    path: '/data-management/list/properties',
    renders: 'User Properties',
  },
  { label: 'Segments', path: '/data-management/list/segments' },
  { label: 'Features', path: '/data-management/list/tags' },
];

/* The sider assertion is what catches a crash: there is no global error
   boundary, so a render throw unmounts the whole tree rather than swapping in
   a fallback. The content assertion is what catches a route that mounts but
   never paints — a spinner that never resolves would otherwise pass. */
async function expectRendered(page: Page, renders: string) {
  await expect(page.locator('.ant-menu').first()).toBeVisible();
  await expect(page.locator('.ant-layout-content').first()).toContainText(
    renders,
  );
}

test.describe('side menu smoke', () => {
  /* Collected per test rather than asserted inline: a React render throw
     surfaces as a pageerror, not as a failed locator. */
  let pageErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
  });

  test('every side menu destination renders without crashing', async ({
    page,
  }) => {
    await page.goto('/');

    // switch to the reference project, then take the siteId it routed us to
    await page.locator('[data-test-id="project-dropdown"]').click();
    await page.getByRole('menuitem', { name: PROJECT_NAME }).click();
    await expect(page).toHaveURL(/\/\d+\//);
    const siteId = new URL(page.url()).pathname.split('/')[1];

    await expectRendered(page, 'Sessions');
    expect(pageErrors, 'project switch threw').toEqual([]);

    const visited: string[] = [];
    const skipped: string[] = [];

    const walk = async (d: Destination) => {
      const item = page.getByRole('menuitem', { name: d.label, exact: true });
      if ((await item.count()) === 0) {
        skipped.push(d.label);
        return;
      }

      await item.click();
      await expect(page).toHaveURL(
        d.siteScoped === false ? d.path : `/${siteId}${d.path}`,
      );
      await expectRendered(page, d.renders ?? d.label);
      expect(pageErrors, `${d.label} (${d.path}) threw`).toEqual([]);
      visited.push(d.label);
    };

    for (const d of DESTINATIONS) await walk(d);

    const dataMenu = page.getByRole('menuitem', {
      name: 'Data Management',
      exact: true,
    });
    if ((await dataMenu.count()) > 0) {
      await dataMenu.click();
      for (const d of DATA_MANAGEMENT) await walk(d);
    } else {
      skipped.push('Data Management');
    }

    console.log(`visited: ${visited.join(', ')}`);
    if (skipped.length) console.log(`not available: ${skipped.join(', ')}`);

    /* A run where the menu rendered but nothing was clickable would otherwise
       pass with an empty walk. */
    expect(visited, 'no menu destination was reachable').toContain('Sessions');
  });

  test('preferences opens and renders', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('menuitem', { name: 'Preferences', exact: true })
      .click();
    await expect(page).toHaveURL(/\/client\//);
    await expectRendered(page, 'Account');
    expect(pageErrors, 'preferences threw').toEqual([]);
  });
});
