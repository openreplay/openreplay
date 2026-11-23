import { expect, test } from '@playwright/test';

import { login, mockApi } from './mockApi';

const TOTAL = 200;
const NEW = 3;

const sessionAt = (i: number) => ({
  sessionId: `s${i}`,
  projectId: 1,
  userId: `user-${i}`,
  startTs: Date.now() - i * 60_000,
  duration: 30_000,
  eventsCount: 5,
  pagesCount: 1,
  errorsCount: 0,
  issueTypes: [],
  metadata: {},
  userDeviceType: 'desktop',
  userOs: 'Mac OS X',
  userBrowser: 'Chrome',
  userCountry: 'DE',
});

test.use({ viewport: { width: 1440, height: 900 } });

/* Under Fit, the "new sessions" banner used to push the table down, re-fit the
   rows and send the list back to page 1. */
test('new sessions and a re-fit keep the page; one Last viewed', async ({
  page,
  baseURL,
}) => {
  const api = await mockApi(page, baseURL!);
  let arrived = false;
  let probes = 0;
  const pages: number[] = [];
  api.on('POST', /\/sessions\/search$/, (_req, body) => {
    // the "new sessions?" probe asks for one row
    if (body?.limit === 1) {
      probes += 1;
      return { data: { sessions: [], total: TOTAL + (arrived ? NEW : 0) } };
    }
    pages.push(body.page);
    const from = (body.page - 1) * body.limit;
    const rows = Array.from(
      { length: Math.min(body.limit, TOTAL - from) },
      (_, k) => sessionAt(from + k),
    );
    return { data: { sessions: rows, total: TOTAL } };
  });

  await login(page);
  // an earlier build kept the last three
  await page.evaluate(() =>
    localStorage.setItem(
      '__or_last_played',
      JSON.stringify(['s0', 's1', 's2']),
    ),
  );
  await page.goto('/1/sessions');
  await expect(page.locator('.m-ss__row').first()).toBeVisible();
  await expect(page.getByText('Last viewed')).toHaveCount(1);

  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Next page' }).click();
  }
  const onPage5 = page.locator('[aria-current="page"]', { hasText: /^5$/ });
  await expect(onPage5).toBeVisible();
  await page.waitForTimeout(500);
  const range = await page.locator('.m-listfoot__range').textContent();
  const fetched = pages.length;

  arrived = true;
  const before = probes;
  // back on the tab, the list asks again after 5s
  await page.evaluate(() =>
    document.dispatchEvent(new Event('visibilitychange')),
  );
  await expect.poll(() => probes, { timeout: 10_000 }).toBeGreaterThan(before);
  const banner = page.getByRole('button', { name: `Show ${NEW} new sessions` });
  await expect(banner).toBeVisible();
  // past the re-fit's debounce
  await page.waitForTimeout(1000);
  await expect(banner).toBeVisible();
  await expect(onPage5).toBeVisible();
  expect(await page.locator('.m-listfoot__range').textContent()).toBe(range);
  expect(pages.slice(fetched)).toEqual([]);

  await page.setViewportSize({ width: 1440, height: 700 });
  await expect.poll(() => pages.length).toBeGreaterThan(fetched);
  await expect(onPage5).toBeVisible();
  expect(pages.at(-1)).toBe(5);
});
