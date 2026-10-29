import type { Page, Request, Route } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

/* The API base comes from the developer's .env (often a remote host) or falls
   back to <origin>/api, so everything that isn't the dev server's own bundle
   is treated as API and answered here — nothing leaves the machine. */

export const PROJECT_ID = 1;
export const MOBS_HOST = 'https://mobs.e2e.local';
const MOCKS_DIR = join(__dirname, '../../mocks');

type Handler = (req: Request, body: any) => any;
interface Rule {
  method: string;
  path: RegExp;
  handler: Handler;
}

const FAKE_JWT =
  'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDAsInVzZXJJZCI6MX0.e2e';

const baseRules: Rule[] = [
  {
    method: 'GET',
    path: /\/account$/,
    handler: () => ({
      data: {
        id: 1,
        email: 'e2e@openreplay.com',
        name: 'E2E',
        tenantId: 1,
        superAdmin: true,
        admin: true,
        permissions: ['SESSION_REPLAY', 'METRICS', 'DATA_MANAGEMENT'],
      },
    }),
  },
  {
    method: 'GET',
    path: /\/projects$/,
    handler: () => ({
      data: [
        {
          projectId: PROJECT_ID,
          name: 'E2E',
          projectKey: 'e2e',
          platform: 'web',
          recorded: true,
        },
      ],
    }),
  },
  {
    method: 'GET',
    path: /\/\d+\/filters$/,
    handler: () => ({
      data: {
        events: {
          list: [
            { name: 'CLICK', displayName: 'Click', autoCaptured: true },
            { name: 'LOCATION', displayName: 'Page View', autoCaptured: true },
          ],
        },
        session: {
          list: [{ name: 'userDeviceType', autoCaptured: true }],
        },
        properties: {
          list: [
            { name: 'normalizedX', autoCaptured: true, dataType: 'number' },
            { name: 'normalizedY', autoCaptured: true, dataType: 'number' },
          ],
        },
      },
    }),
  },
  {
    method: 'POST',
    path: /\/sessions\/search$/,
    handler: () => ({ data: { sessions: [], total: 0 } }),
  },
  {
    method: 'GET',
    path: /\/sessions\/search\/saved$/,
    handler: () => ({ data: [] }),
  },
  { method: 'GET', path: /\/dashboards$/, handler: () => ({ data: [] }) },
];

export interface MockApi {
  /** API calls nothing matched, for debugging a spec */
  unmatched: string[];
  /** every mob file download, by file name */
  mobRequests: string[];
  on(method: string, path: RegExp, handler: Handler): void;
}

export async function mockApi(page: Page, baseURL: string): Promise<MockApi> {
  const origin = new URL(baseURL).origin;
  const rules: Rule[] = [];
  const api: MockApi = {
    unmatched: [],
    mobRequests: [],
    on(method, path, handler) {
      // later registrations win over the defaults
      rules.unshift({ method, path, handler });
    },
  };

  await page.route('**/*', async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === origin && !/^\/(v2\/)?api\//.test(url.pathname)) {
      return route.continue();
    }
    if (url.origin === MOBS_HOST) {
      const file = url.pathname.slice(1);
      api.mobRequests.push(file);
      return route.fulfill({
        body: readFileSync(join(MOCKS_DIR, file)),
        contentType: 'application/octet-stream',
        headers: { 'access-control-allow-origin': '*' },
      });
    }
    const rule = [...rules, ...baseRules].find(
      (r) => r.method === req.method() && r.path.test(url.pathname),
    );
    if (!rule) {
      api.unmatched.push(`${req.method()} ${url.pathname}`);
      return route.fulfill({ json: { data: {} } });
    }
    let body: any;
    try {
      body = req.postDataJSON();
    } catch {
      body = undefined;
    }
    // a handler may return a promise to hold its response
    return route.fulfill({ json: await rule.handler(req, body) });
  });

  return api;
}

export async function login(page: Page) {
  await page.goto('/');
  await page.evaluate((jwt) => (window as any).setJWT(jwt), FAKE_JWT);
  // a navigation before the persisted store has the token lands on /login
  await page.waitForFunction(() =>
    (localStorage.getItem('UserStore') ?? '').includes('"jwt":"eyJ'),
  );
}
