import { expect, test } from '@playwright/test';

import { login, mockApi } from './mockApi';

test.use({ viewport: { width: 1440, height: 900 } });

const now = new Date();
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// both in the month the calendar opens on
const first = new Date(now.getFullYear(), now.getMonth(), 1);
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const endOf = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const day = (page: any, d: Date) =>
  page.locator(`[data-day="${iso(d)}"] button`);

test('a custom range applies once both days are picked', async ({
  page,
  baseURL,
}) => {
  const api = await mockApi(page, baseURL!);
  const searches: any[] = [];
  api.on('POST', /\/sessions\/search$/, (_req, body) => {
    if (body?.limit !== 1) searches.push(body);
    return { data: { sessions: [], total: 0 } };
  });

  await login(page);
  await page.goto('/1/sessions');
  const trigger = page.locator('button[aria-label^="Started:"]');
  await expect(trigger).toBeVisible();
  await expect.poll(() => searches.length).toBeGreaterThan(0);
  await page.waitForTimeout(500);
  const before = searches.length;

  await trigger.click();
  await page.getByRole('menuitemradio', { name: 'Custom range' }).click();
  await day(page, first).click();
  await expect(page.getByLabel('Start date')).toHaveValue(iso(first));
  await expect(page.getByLabel('End date')).toHaveValue('');
  await expect(trigger).toContainText('…');
  await page.waitForTimeout(500);
  expect(searches.length).toBe(before);

  await day(page, today).click();
  await expect(page.getByLabel('Start date')).toBeHidden();
  await expect.poll(() => searches.length).toBe(before + 1);
  expect(searches.at(-1)).toMatchObject({
    startTimestamp: first.getTime(),
    endTimestamp: endOf(today).getTime(),
  });

  // the same day twice is that whole day
  await trigger.click();
  await day(page, today).click();
  await page.waitForTimeout(300);
  expect(searches.length).toBe(before + 1);
  await day(page, today).click();
  await expect.poll(() => searches.length).toBe(before + 2);
  expect(searches.at(-1)).toMatchObject({
    startTimestamp: today.getTime(),
    endTimestamp: endOf(today).getTime(),
  });
});

test('logs: date and time are separate fields, nothing loads on half a range', async ({
  page,
  baseURL,
}) => {
  const api = await mockApi(page, baseURL!);
  const histograms: any[] = [];
  api.on('POST', /\/logs\/search$/, () => ({
    data: { logs: [], nextCursor: null },
  }));
  api.on('POST', /\/logs\/histogram$/, (_req, body) => {
    histograms.push(body);
    return { data: { step: 60, buckets: [] } };
  });
  api.on('POST', /\/logs\/facets$/, () => ({
    data: {
      services: [],
      severities: [],
      attributeKeys: { log: [], resource: [] },
      sampled: false,
    },
  }));

  await login(page);
  await page.goto('/1/logs');
  const trigger = page.locator('button[aria-label^="Time:"]');
  await expect(trigger).toBeVisible();
  await expect.poll(() => histograms.length).toBeGreaterThan(0);
  await page.waitForTimeout(500);
  const before = histograms.length;

  await trigger.click();
  await page.getByRole('menuitemradio', { name: 'Custom range' }).click();
  await expect(page.getByLabel('Start time')).toHaveValue('00:00');
  await expect(page.getByLabel('End time')).toHaveValue('23:59');
  await day(page, first).click();
  await page.waitForTimeout(500);
  expect(histograms.length).toBe(before);

  await day(page, today).click();
  await expect.poll(() => histograms.length).toBe(before + 1);
  expect(histograms.at(-1)).toMatchObject({ startTime: first.getTime() });
  // the panel stays for the hours
  await expect(page.getByLabel('Start time')).toBeVisible();
  await page.getByLabel('Start time').fill('10:30');
  await expect.poll(() => histograms.length).toBe(before + 2);
  expect(histograms.at(-1)).toMatchObject({
    startTime: first.getTime() + (10 * 60 + 30) * 60_000,
  });
  await expect(trigger).toContainText('10:30');
});
