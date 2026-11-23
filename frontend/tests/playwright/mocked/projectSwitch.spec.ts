import { expect, test } from '@playwright/test';

import { login, mockApi } from './mockApi';

/* Two projects, a dashboard in each: the address and the active project must
   agree after one hop, not hand the page back and forth between them. */
const projects = [
  {
    projectId: 1,
    name: 'Alpha',
    projectKey: 'a',
    platform: 'web',
    recorded: true,
  },
  {
    projectId: 2,
    name: 'Beta',
    projectKey: 'b',
    platform: 'web',
    recorded: true,
  },
];
const dashboardOf: Record<string, number> = { 1: 5, 2: 7 };

async function setup(page: any, baseURL: string) {
  const api = await mockApi(page, baseURL);
  const calls: string[] = [];
  api.on('GET', /\/projects$/, () => ({ data: projects }));
  api.on('GET', /\/\d+\/dashboards$/, (req) => {
    const site = new URL(req.url()).pathname.split('/').at(-2)!;
    calls.push(`list ${site}`);
    const id = dashboardOf[site];
    return { data: [{ dashboardId: id, name: `Dash ${id}`, widgets: [] }] };
  });
  // registered after mockApi's catch-all, so it answers first
  await page.route(/\/\d+\/dashboards\/\d+$/, (route: any) => {
    const parts = new URL(route.request().url()).pathname.split('/');
    const [site, id] = [parts.at(-3)!, Number(parts.at(-1))];
    calls.push(`detail ${site}/${id}`);
    if (dashboardOf[site] !== id)
      return route.fulfill({ status: 404, json: { errors: ['not found'] } });
    return route.fulfill({
      json: { data: { dashboardId: id, name: `Dash ${id}`, widgets: [] } },
    });
  });
  await login(page);
  await page.goto('/1/dashboard/5');
  await expect(
    page.getByText('Dash 5').filter({ visible: true }).first(),
  ).toBeVisible();
  calls.length = 0;
  return calls;
}

/** Requests stop coming: the page is done moving. */
async function settled(calls: string[]) {
  let seen = -1;
  await expect
    .poll(
      () => {
        const still = calls.length === seen;
        seen = calls.length;
        return still;
      },
      { intervals: [750] },
    )
    .toBe(true);
}

test.describe('project switch', () => {
  test("on a dashboard, lands on the other project's dashboards", async ({
    page,
    baseURL,
  }) => {
    const calls = await setup(page, baseURL!);
    await page.getByRole('button', { name: /Alpha/ }).first().click();
    await page
      .getByRole('group', { name: 'Projects' })
      .getByText('Beta')
      .click();

    await expect(page).toHaveURL(/\/2\/dashboard$/);
    await settled(calls);
    // dashboard 5 isn't Beta's: asked once or twice, then Beta's list
    expect(calls.length).toBeLessThan(6);
    expect(calls.filter((c) => c.endsWith(' 1'))).toEqual([]);
    await expect(page).toHaveURL(/\/2\/dashboard$/);
    await expect(
      page.getByRole('button', { name: /Beta/ }).first(),
    ).toBeVisible();
  });

  test('an address in another project switches to it', async ({
    page,
    baseURL,
  }) => {
    const calls = await setup(page, baseURL!);
    // back/forward or a link into the other project
    await page.evaluate(() => {
      history.pushState(
        { usr: null, key: 'e2e', idx: (history.state?.idx ?? 0) + 1 },
        '',
        '/2/dashboard/7',
      );
      dispatchEvent(new PopStateEvent('popstate'));
    });

    await expect(
      page.getByText('Dash 7').filter({ visible: true }).first(),
    ).toBeVisible();
    await settled(calls);
    expect(calls.length).toBeLessThan(6);
    await expect(page).toHaveURL(/\/2\/dashboard\/7$/);
    await expect(
      page.getByRole('button', { name: /Beta/ }).first(),
    ).toBeVisible();
  });
});
