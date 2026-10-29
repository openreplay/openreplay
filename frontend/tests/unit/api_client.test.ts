import APIClient from '../../app/api_client';
import ENV from '../../env';

jest.mock('../../env', () => ({
  __esModule: true,
  default: {
    API_EDP: '',
    NODE_ENV: 'test',
  },
}));

interface UrlTestCase {
  description: string;
  edp: string;
  path: string;
  expectedUrl: string;
}

describe('APIClient URL Replacer Logic', () => {
  let client: APIClient;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    client = new APIClient();

    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);
    global.fetch = fetchMock as any;
    (window as any).fetch = fetchMock;

    client.getJwt = jest.fn(() => null);
    client.setOnUpdateJwt(jest.fn());
    // Use setSiteIdCheck instead of forceSiteId to properly mock site ID
    client.setSiteIdCheck(() => ({ siteId: '2' }));

    const localStorageMock = {
      getItem: jest.fn(() => null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      length: 0,
      key: jest.fn(),
    };
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    Object.defineProperty(window, 'location', {
      value: { origin: 'https://example.com' },
      writable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const testCases: UrlTestCase[] = [
    // Standard non-SaaS deployment
    {
      description: 'Non-SaaS: sessions/search with v2',
      edp: 'https://example.com/api',
      path: '/sessions/search',
      expectedUrl: 'https://example.com/v2/api/2/sessions/search',
    },
    // Standard SaaS (api.openreplay.com is obvious edge case)
    {
      description: 'SaaS: sessions/search with .com/v2',
      edp: 'https://api.openreplay.com',
      path: '/sessions/search',
      expectedUrl: 'https://api.openreplay.com/v2/2/sessions/search',
    },
    // Custom domain with "api" in hostname (regression test for URL corruption bug)
    {
      description: 'Custom domain with api in hostname',
      edp: 'https://api-custom-subdomain.example.com/api',
      path: '/sessions/search',
      expectedUrl: 'https://api-custom-subdomain.example.com/v2/api/2/sessions/search',
    },
    // Cards endpoint
    {
      description: 'Cards endpoint with site ID',
      edp: 'https://example.com/api',
      path: '/cards',
      expectedUrl: 'https://example.com/v2/api/2/cards',
    },
    // Dashboards endpoint on SaaS
    {
      description: 'SaaS: dashboards endpoint',
      edp: 'https://api.openreplay.com',
      path: '/dashboards',
      expectedUrl: 'https://api.openreplay.com/v2/2/dashboards',
    },
    {
      description: 'Alerts endpoint with site ID',
      edp: 'https://example.com/api',
      path: '/alerts/triggers',
      expectedUrl: 'https://example.com/v2/api/2/alerts/triggers',
    },
    {
      description: 'SaaS: alerts endpoint',
      edp: 'https://api.openreplay.com',
      path: '/alerts/5',
      expectedUrl: 'https://api.openreplay.com/v2/2/alerts/5',
    },
    {
      description: 'Notifications endpoint without site ID',
      edp: 'https://example.com/api',
      path: '/notifications/count',
      expectedUrl: 'https://example.com/v2/api/notifications/count',
    },
    {
      description: 'SaaS: notifications view',
      edp: 'https://api.openreplay.com',
      path: '/notifications/view',
      expectedUrl: 'https://api.openreplay.com/v2/notifications/view',
    },
    {
      description: 'Agent notifications with explicit project ID',
      edp: 'https://example.com/api',
      path: '/2/notifications',
      expectedUrl: 'https://example.com/v2/api/2/notifications',
    },
  ];

  describe.each(testCases)('URL Construction', (testCase) => {
    test(testCase.description, async () => {
      ENV.API_EDP = testCase.edp;

      await client.fetch(testCase.path, {}, 'POST');

      expect(fetchMock).toHaveBeenCalledWith(
        testCase.expectedUrl,
        expect.any(Object)
      );
    });
  });
});
