import { FilterKey } from 'Types/filter/filterType';
import { TFunction } from 'i18next';
import {
  Bug,
  LayoutDashboard,
  LucideIcon,
  Megaphone,
  ShoppingCart,
  Smartphone,
} from 'lucide-react';

import {
  FUNNEL,
  HEATMAP,
  TABLE,
  TIMESERIES,
  USER_PATH,
  WEBVITALS,
} from 'App/constants/card';

/**
 * Dashboard templates: ready-made sets of cards (and optional alerts) for a
 * given kind of project. Everything here is plain data that is sent to the
 * cards / dashboards / alerts APIs as-is; see dashboardStore.createFromTemplate.
 */

export type TemplateGroupKey =
  | 'traffic'
  | 'marketing'
  | 'behavior'
  | 'stability';

export interface TemplateFilter {
  name: string;
  operator: string;
  value: string[];
  isEvent: boolean;
  autoCaptured: boolean;
  dataType: 'string' | 'number';
  propertyOrder: 'and' | 'or';
  filters: TemplateFilter[];
}

export interface TemplateCard {
  /** Unique inside the template. Alerts reference timeseries cards by key. */
  key: string;
  name: string;
  group: TemplateGroupKey;
  metricType: string;
  metricOf: string;
  viewType: string;
  metricFormat?: string;
  metricValue?: string[];
  eventsOrder?: 'then' | 'and' | 'or';
  filters?: TemplateFilter[];
  breakdowns?: string[];
  startPoint?: TemplateFilter[];
  rows?: number;
  stepsBefore?: number;
  stepsAfter?: number;
}

export interface TemplateAlert {
  key: string;
  name: string;
  description: string;
  group: TemplateGroupKey;
  /** Key of a timeseries card of the same template (custom metric alert)… */
  card?: string;
  /** …or a predefined alert column, e.g. `errors.javascript.count`. */
  column?: string;
  detectionMethod: 'threshold' | 'change';
  change?: 'change' | 'percent';
  operator: '>' | '>=' | '<' | '<=';
  right: number;
  /** Minutes: 15 | 30 | 60 | 120 | 240 | 1440 */
  currentPeriod: number;
  previousPeriod: number;
}

export interface TemplateParam {
  key: string;
  label: string;
  placeholder: string;
  defaultValue: string;
}

export interface DashboardTemplate {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Which project types the template is meant for. */
  platforms: Array<'web' | 'mobile'>;
  params: TemplateParam[];
  build: (
    params: Record<string, string>,
    platform: 'web' | 'mobile',
  ) => {
    cards: TemplateCard[];
    alerts: TemplateAlert[];
  };
}

export const TEMPLATE_GROUPS = (
  t: TFunction,
): Array<{ key: TemplateGroupKey; label: string; description: string }> => [
  {
    key: 'traffic',
    label: t('Traffic & audience'),
    description: t('Sessions, users, pages, devices and countries.'),
  },
  {
    key: 'marketing',
    label: t('Marketing & acquisition'),
    description: t('Referrers, UTM campaigns and conversion funnels.'),
  },
  {
    key: 'behavior',
    label: t('Behavior & UX'),
    description: t('Heatmaps, user journeys and frustration signals.'),
  },
  {
    key: 'stability',
    label: t('Errors & performance'),
    description: t('JS errors, failed and slow requests, web vitals.'),
  },
];

// ---------- filter builders ----------

const prop = (
  name: string,
  operator: string,
  value: string[],
  dataType: 'string' | 'number' = 'string',
): TemplateFilter => ({
  name,
  operator,
  value,
  isEvent: false,
  autoCaptured: true,
  dataType,
  propertyOrder: 'and',
  filters: [],
});

const event = (
  name: string,
  props: TemplateFilter[] = [],
  operator = 'is',
): TemplateFilter => ({
  name,
  operator,
  value: [],
  isEvent: true,
  autoCaptured: true,
  dataType: 'string',
  propertyOrder: 'and',
  filters: props,
});

/** Visited URL event; `operator` applies to the path property. */
export const visited = (path: string, operator = 'contains') =>
  event(FilterKey.LOCATION, [prop('urlPath', operator, [path])]);

export const anyPage = () => event(FilterKey.LOCATION, [], 'isAny');

export const clicked = (label: string) =>
  event(FilterKey.CLICK, [prop('label', 'contains', [label])]);

export const failedRequest = () =>
  event(FilterKey.FETCH, [prop('status', '>=', ['400'], 'number')]);

export const slowRequest = (ms = 5000) =>
  event(FilterKey.FETCH, [prop('duration', '>=', [String(ms)], 'number')]);

// ---------- card builders ----------

type CardOpts = Partial<TemplateCard> & {
  key: string;
  name: string;
  group: TemplateGroupKey;
};

const trend = (
  o: CardOpts & { metricOf?: 'sessionCount' | 'userCount' | 'eventCount' },
): TemplateCard => ({
  metricType: TIMESERIES,
  metricOf: o.metricOf || 'sessionCount',
  viewType: 'lineChart',
  metricFormat: 'sessionCount',
  eventsOrder: 'then',
  ...o,
});

const table = (o: CardOpts & { metricOf: string }): TemplateCard => ({
  metricType: TABLE,
  viewType: 'table',
  metricFormat: 'sessionCount',
  eventsOrder: 'and',
  ...o,
});

/** Card names carry the paths they depend on, so reuse never picks a card built for another path. */
const withPaths = (name: string, ...paths: string[]) =>
  `${name} (${paths.join(' > ')})`;

const funnel = (o: CardOpts & { filters: TemplateFilter[] }): TemplateCard => ({
  metricType: FUNNEL,
  metricOf: 'sessionCount',
  viewType: 'chart',
  metricFormat: 'sessionCount',
  eventsOrder: 'then',
  ...o,
});

const heatmap = (o: CardOpts & { path: string }): TemplateCard => {
  const { path, ...rest } = o;
  return {
    metricType: HEATMAP,
    metricOf: 'heatMapUrl',
    viewType: 'chart',
    metricFormat: 'sessionCount',
    eventsOrder: 'then',
    filters: [visited(path, 'is')],
    ...rest,
  };
};

const journey = (o: CardOpts & { from: string }): TemplateCard => {
  const { from, ...rest } = o;
  return {
    metricType: USER_PATH,
    metricOf: 'sessionCount',
    viewType: 'chart',
    metricFormat: 'sessionCount',
    metricValue: [FilterKey.LOCATION],
    eventsOrder: 'then',
    startPoint: [
      {
        name: FilterKey.LOCATION,
        operator: 'is',
        value: [from],
        isEvent: true,
        autoCaptured: true,
        dataType: 'string',
        propertyOrder: 'and',
        filters: [],
      },
    ],
    rows: 5,
    stepsBefore: 0,
    stepsAfter: 5,
    ...rest,
  };
};

const webVitals = (o: CardOpts): TemplateCard => ({
  metricType: WEBVITALS,
  metricOf: 'webVitalUrl',
  viewType: 'chart',
  metricFormat: 'sessionCount',
  eventsOrder: 'then',
  filters: [anyPage()],
  ...o,
});

// ---------- shared card sets ----------

const audienceCards = (t: TFunction, mobile = false): TemplateCard[] => [
  trend({ key: 'sessions', name: t('Sessions'), group: 'traffic' }),
  trend({
    key: 'users',
    name: t('Users'),
    group: 'traffic',
    metricOf: 'userCount',
  }),
  table({
    key: 'top-pages',
    name: t('Top Pages'),
    group: 'traffic',
    metricOf: FilterKey.LOCATION,
  }),
  table({
    key: 'top-countries',
    name: t('Top Countries'),
    group: 'traffic',
    metricOf: FilterKey.USER_COUNTRY,
  }),
  table({
    key: 'top-devices',
    name: t('Top Devices'),
    group: 'traffic',
    metricOf: FilterKey.USER_DEVICE,
  }),
  ...(mobile
    ? []
    : [
        table({
          key: 'top-browsers',
          name: t('Top Browsers'),
          group: 'traffic',
          metricOf: FilterKey.USER_BROWSER,
        }),
      ]),
];

const acquisitionCards = (t: TFunction): TemplateCard[] => [
  table({
    key: 'top-referrers',
    name: t('Top Referrers'),
    group: 'marketing',
    metricOf: FilterKey.REFERRER,
  }),
  trend({
    key: 'utm-source',
    name: t('Sessions by UTM Source'),
    group: 'marketing',
    breakdowns: ['utmSource'],
  }),
  trend({
    key: 'utm-campaign',
    name: t('Sessions by UTM Campaign'),
    group: 'marketing',
    breakdowns: ['utmCampaign'],
  }),
];

const frustrationCards = (t: TFunction): TemplateCard[] => [
  trend({
    key: 'issues',
    name: t('Sessions by Issue Type'),
    group: 'behavior',
    breakdowns: ['issueType'],
  }),
];

const stabilityCards = (t: TFunction, mobile = false): TemplateCard[] => [
  table({
    key: 'errors',
    name: t('Table of Errors'),
    group: 'stability',
    metricOf: FilterKey.ERRORS,
  }),
  trend({
    key: 'failed-requests',
    name: t('Sessions with 4xx/5xx Requests'),
    group: 'stability',
    filters: [failedRequest()],
  }),
  trend({
    key: 'slow-requests',
    name: t('Sessions with Slow Network Requests'),
    group: 'stability',
    filters: [slowRequest()],
  }),
  table({
    key: 'top-requests',
    name: t('Top Network Requests'),
    group: 'stability',
    metricOf: FilterKey.FETCH,
  }),
  ...(mobile
    ? []
    : [
        webVitals({
          key: 'web-vitals',
          name: t('Web Vitals'),
          group: 'stability',
        }),
      ]),
];

// ---------- shared alert sets ----------

const stabilityAlerts = (t: TFunction): TemplateAlert[] => [
  {
    key: 'js-errors',
    name: t('JS errors spike'),
    description: t('More than 20 JavaScript errors in the last hour'),
    group: 'stability',
    column: 'errors.javascript.count',
    detectionMethod: 'threshold',
    operator: '>',
    right: 20,
    currentPeriod: 60,
    previousPeriod: 60,
  },
  {
    key: 'failed-requests',
    name: t('Failed requests spike'),
    description: t('More than 10 sessions with 4xx/5xx requests in 30 minutes'),
    group: 'stability',
    card: 'failed-requests',
    detectionMethod: 'threshold',
    operator: '>',
    right: 10,
    currentPeriod: 30,
    previousPeriod: 30,
  },
];

const performanceAlerts = (t: TFunction): TemplateAlert[] => [
  {
    key: 'page-load',
    name: t('Slow page load'),
    description: t('Average page load time above 3 seconds over the last hour'),
    group: 'stability',
    column: 'performance.page_load_time.average',
    detectionMethod: 'threshold',
    operator: '>',
    right: 3000,
    currentPeriod: 60,
    previousPeriod: 60,
  },
];

const trafficDropAlert = (t: TFunction): TemplateAlert => ({
  key: 'traffic-drop',
  name: t('Traffic drop'),
  description: t(
    'Sessions dropped by more than 30% compared to the previous 2 hours',
  ),
  group: 'traffic',
  card: 'sessions',
  detectionMethod: 'change',
  change: 'percent',
  operator: '<',
  right: -30,
  currentPeriod: 120,
  previousPeriod: 120,
});

// ---------- templates ----------

export const DASHBOARD_TEMPLATES = (t: TFunction): DashboardTemplate[] => [
  {
    key: 'landing-page',
    title: t('Landing page & funnel'),
    description: t(
      'Campaign landing pages: where visitors come from, what they click and how many convert.',
    ),
    icon: Megaphone,
    platforms: ['web'],
    params: [
      {
        key: 'landing',
        label: t('Landing page path'),
        placeholder: '/',
        defaultValue: '/',
      },
      {
        key: 'conversion',
        label: t('Conversion page path'),
        placeholder: '/thank-you',
        defaultValue: '/thank-you',
      },
    ],
    build: (p) => ({
      cards: [
        ...audienceCards(t),
        funnel({
          key: 'conversion-funnel',
          name: withPaths(t('Conversion Funnel'), p.landing, p.conversion),
          group: 'marketing',
          filters: [visited(p.landing), visited(p.conversion)],
        }),
        ...acquisitionCards(t),
        heatmap({
          key: 'landing-heatmap',
          name: withPaths(t('Landing Page Heatmap'), p.landing),
          group: 'behavior',
          path: p.landing,
        }),
        journey({
          key: 'landing-journey',
          name: withPaths(t('Journey from Landing Page'), p.landing),
          group: 'behavior',
          from: p.landing,
        }),
        ...frustrationCards(t),
        ...stabilityCards(t),
      ],
      alerts: [
        trafficDropAlert(t),
        ...stabilityAlerts(t),
        ...performanceAlerts(t),
      ],
    }),
  },
  {
    key: 'web-app',
    title: t('Web application'),
    description: t(
      'SaaS and platforms: adoption, journeys after login, errors, failed requests and web vitals.',
    ),
    icon: LayoutDashboard,
    platforms: ['web'],
    params: [
      {
        key: 'entry',
        label: t('Entry page path'),
        placeholder: '/',
        defaultValue: '/',
      },
      {
        key: 'login',
        label: t('Login page path'),
        placeholder: '/login',
        defaultValue: '/login',
      },
    ],
    build: (p) => ({
      cards: [
        ...audienceCards(t),
        journey({
          key: 'entry-journey',
          name: withPaths(t('Journey from Entry Page'), p.entry),
          group: 'behavior',
          from: p.entry,
        }),
        heatmap({
          key: 'entry-heatmap',
          name: withPaths(t('Entry Page Heatmap'), p.entry),
          group: 'behavior',
          path: p.entry,
        }),
        funnel({
          key: 'login-funnel',
          name: withPaths(t('Login Funnel'), p.login, p.entry),
          group: 'behavior',
          filters: [visited(p.login), visited(p.entry)],
        }),
        ...frustrationCards(t),
        ...acquisitionCards(t),
        ...stabilityCards(t),
      ],
      alerts: [
        trafficDropAlert(t),
        ...stabilityAlerts(t),
        ...performanceAlerts(t),
      ],
    }),
  },
  {
    key: 'mobile-app',
    title: t('Mobile application'),
    description: t(
      'iOS and Android apps: sessions, devices, screens, network errors and crashes.',
    ),
    icon: Smartphone,
    platforms: ['mobile'],
    params: [],
    build: () => ({
      cards: [
        ...audienceCards(t, true),
        ...frustrationCards(t),
        ...stabilityCards(t, true),
      ],
      alerts: [
        trafficDropAlert(t),
        ...stabilityAlerts(t),
        {
          key: 'crashes',
          name: t('Crashes'),
          description: t('More than 5 crashes in the last hour'),
          group: 'stability',
          column: 'performance.crashes.count',
          detectionMethod: 'threshold',
          operator: '>',
          right: 5,
          currentPeriod: 60,
          previousPeriod: 60,
        },
      ],
    }),
  },
  {
    key: 'ecommerce',
    title: t('E-commerce'),
    description: t(
      'Online stores: product to checkout funnel, checkout heatmap, acquisition and errors.',
    ),
    icon: ShoppingCart,
    platforms: ['web'],
    params: [
      {
        key: 'product',
        label: t('Product page path'),
        placeholder: '/product',
        defaultValue: '/product',
      },
      {
        key: 'cart',
        label: t('Cart page path'),
        placeholder: '/cart',
        defaultValue: '/cart',
      },
      {
        key: 'checkout',
        label: t('Checkout page path'),
        placeholder: '/checkout',
        defaultValue: '/checkout',
      },
      {
        key: 'success',
        label: t('Order confirmation path'),
        placeholder: '/order',
        defaultValue: '/order',
      },
    ],
    build: (p) => ({
      cards: [
        ...audienceCards(t),
        funnel({
          key: 'purchase-funnel',
          name: withPaths(
            t('Purchase Funnel'),
            p.product,
            p.cart,
            p.checkout,
            p.success,
          ),
          group: 'marketing',
          filters: [
            visited(p.product),
            visited(p.cart),
            visited(p.checkout),
            visited(p.success),
          ],
        }),
        ...acquisitionCards(t),
        heatmap({
          key: 'product-heatmap',
          name: withPaths(t('Product Page Heatmap'), p.product),
          group: 'behavior',
          path: p.product,
        }),
        heatmap({
          key: 'checkout-heatmap',
          name: withPaths(t('Checkout Heatmap'), p.checkout),
          group: 'behavior',
          path: p.checkout,
        }),
        journey({
          key: 'product-journey',
          name: withPaths(t('Journey from Product Page'), p.product),
          group: 'behavior',
          from: p.product,
        }),
        ...frustrationCards(t),
        ...stabilityCards(t),
      ],
      alerts: [
        trafficDropAlert(t),
        ...stabilityAlerts(t),
        ...performanceAlerts(t),
      ],
    }),
  },
  {
    key: 'stability',
    title: t('Debugging & stability'),
    description: t(
      'For engineers: errors, failed and slow requests, frustration signals, web vitals and alerts.',
    ),
    icon: Bug,
    platforms: ['web', 'mobile'],
    params: [],
    build: (_params, platform) => ({
      cards: [
        trend({ key: 'sessions', name: t('Sessions'), group: 'traffic' }),
        ...stabilityCards(t, platform === 'mobile'),
        ...frustrationCards(t),
        table({
          key: 'top-pages',
          name: t('Top Pages'),
          group: 'traffic',
          metricOf: FilterKey.LOCATION,
        }),
      ],
      alerts: [
        ...stabilityAlerts(t),
        ...performanceAlerts(t),
        {
          key: 'backend-errors',
          name: t('Backend errors spike'),
          description: t('More than 20 backend errors in the last hour'),
          group: 'stability',
          column: 'errors.backend.count',
          detectionMethod: 'threshold',
          operator: '>',
          right: 20,
          currentPeriod: 60,
          previousPeriod: 60,
        },
        {
          key: 'ttfb',
          name: t('Slow server response'),
          description: t(
            'Average time to first byte above 1 second over the last hour',
          ),
          group: 'stability',
          column: 'performance.ttfb.average',
          detectionMethod: 'threshold',
          operator: '>',
          right: 1000,
          currentPeriod: 60,
          previousPeriod: 60,
        },
      ],
    }),
  },
];
