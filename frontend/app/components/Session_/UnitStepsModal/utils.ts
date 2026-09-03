import { Click, Input, Location, TYPES } from 'App/types/session/event';

/** labels are free-form text now, so they have to survive being inlined into a string literal */
function q(value?: string | null): string {
  return (value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

const clickTarget = (event: Click): string =>
  event.selector?.length ? event.selector : event.label;

export const puppeteerEvents = {
  [TYPES.LOCATION]: (event: Location) => `await page.goto('${q(event.url)}')`,
  [TYPES.CLICK]: (event: Click) =>
    `await page.locator('${q(clickTarget(event))}').click()`,
  [TYPES.INPUT]: (event: Input, resolvedValue?: string) =>
    `await page.locator('${q(event.label)}').type('${q(resolvedValue ?? 'Test Input')}')`,
  screen: (width: number, height: number) =>
    `await page.setViewport({width: ${width}, height: ${height})`,
  testIntro: (pageTitle: string, firstUrl: string) =>
    `describe('${q(pageTitle)}', () => {\n  it('Navigates through ${q(firstUrl)}', async () => {`,
  testOutro: () => `  })\n})`,
};
export const cypressEvents = {
  [TYPES.LOCATION]: (event: Location) => `cy.visit('${q(event.url)}')`,
  [TYPES.CLICK]: (event: Click) => `cy.get('${q(clickTarget(event))}').click()`,
  [TYPES.INPUT]: (event: Input, resolvedValue?: string) =>
    `cy.get('${q(event.label)}').type('${q(resolvedValue ?? 'Test Input')}')`,
  screen: (width: number, height: number) => `cy.viewport(${width}, ${height})`,
  testIntro: (pageTitle: string, firstUrl: string) =>
    `describe('${q(pageTitle)}', () => {\n  it('Navigates through ${q(firstUrl)}', () => {`,
  testOutro: () => `  })\n})`,
};
export const playWrightEvents = {
  [TYPES.LOCATION]: (event: Location) => `await page.goto('${q(event.url)}')`,
  [TYPES.CLICK]: (event: Click) =>
    event.selector?.length
      ? `await page.locator('${q(event.selector)}').click()`
      : `await page.getByText('${q(event.label)}').click()`,
  [TYPES.INPUT]: (event: Input, resolvedValue?: string) =>
    `await page.getByLabel('${q(event.label)}').fill('${q(resolvedValue ?? 'Test Input')}')`,
  screen: (width: number, height: number) =>
    `await page.setViewport({width: ${width}, height: ${height})`,
  testIntro: (pageTitle: string, firstUrl: string) =>
    `test.describe('${q(pageTitle)}', () => {\n  test('Navigates through ${q(firstUrl)}', async () => {`,
  testOutro: () => `  })\n})`,
};

export const k6Events = {
  ...playWrightEvents,
  testIntro: () => `import { browser } from 'k6/browser';
import { check } from 'https://jslib.k6.io/k6-utils/1.5.0/index.js';

export const options = {
  scenarios: {
    ui: {
      executor: 'shared-iterations',
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    checks: ['rate==1.0'],
  },
};

export default async function () {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {`,
  testOutro: () => `
  } catch (e) {
    console.log('Error during execution:', e);
    throw e;
  } finally {
    console.log('test successful!')
    await page.close();
  }
}
`,
};
