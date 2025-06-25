import { test, expect } from '@playwright/test';

test('The freshest session from openreplay website doesnt have white screen', async ({
  page,
}) => {
  const LOGIN = process.env.TEST_FOSS_LOGIN || '';
  const PASSWORD = process.env.TEST_FOSS_PASSWORD || '';
  await page.goto('http://localhost:3333/login');
  await page.locator('[data-test-id="login"]').fill(LOGIN);
  await page.locator('[data-test-id="password"]').fill(PASSWORD);
  await page.locator('[data-test-id="log-button"]').click();
  await page.waitForTimeout(1000);
  await page.goto('http://localhost:3333/65/sessions?f[0].k=location&f[0].op=isAny&f[0].v[0]=&rv=LAST_30_DAYS&s=startTs&o=desc&eo=then')
  await page.waitForTimeout(1000);
  const borderBlocks = await page.locator('.border-b').elementHandles();
  if (borderBlocks.length >= 2) {
    const secondBlock = borderBlocks[1];
    const playButton = await secondBlock.$('#play-button');

    if (playButton) {
      const link = await playButton.$('a');
      if (link) {
        await link.click();
      }
    }
  }

  await page.waitForTimeout(1000);
  const iframeElement = await page
    .locator('iframe[class^="screen-module__iframe"]')
    .first();
  const frameHandle = await iframeElement.elementHandle();
  const frame = await frameHandle?.contentFrame();
  const hasBody = await frame?.evaluate(() => !!document.body);
  expect(hasBody).toBeTruthy();
});
