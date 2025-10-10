import { Click, Input, Location, TYPES } from "App/types/session/event";

export const puppeteerEvents = {
  [TYPES.LOCATION]: (event: Location) => `await page.goto('${event.url}')`,
  [TYPES.CLICK]: (event: Click) =>
    `await page.locator('${
      event.selector.length ? event.selector : event.label
    }').click()`,
  [TYPES.INPUT]: (event: Input) =>
    `await page.locator('${event.label}').type('Test Input')`,
  screen: (width: number, height: number) =>
    `await page.setViewport({width: ${width}, height: ${height})`,
  testIntro: (pageTitle: string, firstUrl: string) => `describe('${pageTitle}', () => {\n  it('Navigates through ${firstUrl}', async () => {`,
  testOutro: () => `  })\n})`,
};
export const cypressEvents = {
  [TYPES.LOCATION]: (event: Location) => `cy.visit('${event.url}')`,
  [TYPES.CLICK]: (event: Click) =>
    `cy.get('${
      event.selector.length ? event.selector : event.label
    }').click()`,
  [TYPES.INPUT]: (event: Input) =>
    `cy.get('${event.label}').type('Test Input')`,
  screen: (width: number, height: number) => `cy.viewport(${width}, ${height})`,
  testIntro: (pageTitle: string, firstUrl: string) => `describe('${pageTitle}', () => {\n  it('Navigates through ${firstUrl}', () => {`,
  testOutro: () => `  })\n})`,
};
export const playWrightEvents = {
  [TYPES.LOCATION]: (event: Location) => `await page.goto('${event.url}')`,
  [TYPES.CLICK]: (event: Click) =>
    event.selector.length
    ? `await page.locator('${event.selector}').click()`
    : `await page.getByText('${event.label}').click()`,
  [TYPES.INPUT]: (event: Input) =>
    `await page.getByLabel('${event.label}').fill('Test Input')`,
  screen: (width: number, height: number) =>
    `await page.setViewport({width: ${width}, height: ${height})`,
  testIntro: (pageTitle: string, firstUrl: string) => `test.describe('${pageTitle}', () => {\n  test('Navigates through ${firstUrl}', async () => {`,
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
