import { expect, test, type Page } from '@playwright/test';

import {
  authStateFile,
  expandNav,
  mainNav,
  navItem,
  selectProject,
} from './helpers';

test.use({ storageState: authStateFile });

interface Destination {
  /* accessible name of the nav item */
  label: string;
  /* the entry it sits under, expanded first when collapsed */
  parent?: string;
  /* route it resolves to, minus the /:siteId prefix */
  path: string;
  /* routes left out of REQUIRED_SITE_ID_ROUTES in routes.ts, which
     withSiteId() deliberately leaves unprefixed */
  siteScoped?: boolean;
  /* the page's h1, when it differs from the nav label */
  renders?: string;
}

/* Anything the account cannot see (plan, role, module or feature flag) is
   skipped rather than failed: the tree is gated in layout/nav/tree.ts and
   differs between FOSS and EE. */
const DESTINATIONS: Destination[] = [
  { label: 'Sessions', parent: 'Recordings', path: '/sessions' },
  { label: 'Bookmarks', parent: 'Recordings', path: '/bookmarks' },
  { label: 'Vault', parent: 'Recordings', path: '/bookmarks' },
  {
    label: 'Segments',
    parent: 'Recordings',
    path: '/data-management/list/segments',
  },
  { label: 'CoBrowse', path: '/assist' },
  { label: 'Spot', path: '/spots', siteScoped: false },
  { label: 'Dashboards', parent: 'Product Analytics', path: '/dashboard' },
  { label: 'Cards', parent: 'Product Analytics', path: '/metrics' },
  { label: 'Alerts', parent: 'Product Analytics', path: '/alerts' },
  {
    label: 'Activity',
    parent: 'Data Management',
    path: '/data-management/activity',
  },
  {
    label: 'People',
    parent: 'Data Management',
    path: '/data-management/list/users',
  },
  {
    label: 'Events',
    parent: 'Data Management',
    path: '/data-management/list/events',
  },
  {
    label: 'Properties',
    parent: 'Data Management',
    path: '/data-management/list/properties',
  },
  {
    label: 'Features',
    parent: 'Data Management',
    path: '/data-management/list/tags',
  },
  /* last: the page needs room and folds the nav, hiding the subitems */
  { label: 'Logs', parent: 'Observability', path: '/logs' },
];

/* The nav assertion is what catches a crash: a render throw unmounts the
   whole tree. The heading is what catches a route that mounts but never
   paints — a spinner that never resolves would otherwise pass. */
async function expectRendered(page: Page, heading: string) {
  await expect(mainNav(page)).toBeVisible();
  await expect(
    page.getByRole('main').getByRole('heading', { level: 1, name: heading }),
  ).toBeVisible();
}

const urlOf = (siteId: string, d: Destination) =>
  new RegExp(
    `^[^?#]*${d.siteScoped === false ? '' : `/${siteId}`}${d.path}(?:[?#/]|$)`,
  );

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
    // fifteen real pages against a remote backend
    test.setTimeout(120_000);
    await page.goto('/');
    const siteId = await selectProject(page);

    await expectRendered(page, 'Sessions');
    expect(pageErrors, 'project switch threw').toEqual([]);

    const visited: string[] = [];
    const skipped: string[] = [];

    for (const d of DESTINATIONS) {
      const item = navItem(page, d.label);
      const parent = d.parent ? navItem(page, d.parent) : null;
      if (!(await item.count()) && parent && (await parent.count())) {
        await expandNav(page, d.parent!);
      }
      if (!(await item.count())) {
        skipped.push(d.label);
        continue;
      }
      await item.click();
      await expect(page).toHaveURL(urlOf(siteId, d));
      await expectRendered(page, d.renders ?? d.label);
      expect(pageErrors, `${d.label} (${d.path}) threw`).toEqual([]);
      visited.push(d.label);
    }

    console.log(`visited: ${visited.join(', ')}`);
    if (skipped.length) console.log(`not available: ${skipped.join(', ')}`);

    /* A run where the menu rendered but nothing was clickable would otherwise
       pass with an empty walk. */
    expect(visited, 'no menu destination was reachable').toContain('Sessions');
  });

  test('preferences opens and renders', async ({ page }) => {
    await page.goto('/');
    await mainNav(page)
      .getByRole('button', { name: 'Preferences', exact: true })
      .click();
    await expect(page).toHaveURL(/\/client\//);
    await expectRendered(page, 'Preferences');
    // the default section
    await expect(
      page.getByRole('main').getByRole('heading', { level: 2, name: 'Account' }),
    ).toBeVisible();
    expect(pageErrors, 'preferences threw').toEqual([]);
  });
});
