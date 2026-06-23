import Session from 'Types/session';
import { TYPES } from 'Types/session/event';
import { FilterKey } from 'Types/filter/filterType';

/* =========================================================================
   Shared mock session pool — the single source of truth for sessions in the
   no-backend prototype (MOCK=1). The SAME entities feed both the Sessions
   page (sessionStore.list) and the Issues surface (issuesStore references
   these by sessionId). A future per-session page will read from here too.

   Only active when seeded by app/dev/mockBootstrap.ts. Never in production.
   ========================================================================= */

/* A pre-Session seed. Carries everything a SessionItem row needs plus a raw
   `events` array used for client-side filtering (the real Session constructor
   drops events that fall outside the duration window, so we keep matching data
   on the seed and build the Session with events:[] — the row only needs
   eventsCount). */
export interface MockEvent {
  type: string;
  value: string;
  timestamp: number;
}

export interface MockSessionSeed {
  sessionId: string;
  userId: string;
  userBrowser: string;
  userOs: string;
  userDeviceType: string;
  platform: 'web' | 'ios' | 'android';
  userCountry: string;
  userCity: string;
  userState: string;
  duration: number; // ms
  eventsCount: number;
  errorsCount: number;
  pagesCount: number;
  viewed: boolean;
  favorite: boolean;
  issueTypes: string[];
  metadata: Record<string, string>;
  startTs: number;
  projectId: number;
  events: MockEvent[];
}

/* Anchor "now" once at module load so "last seen" labels stay stable for the
   session (browser runtime — Date.now is fine here, this is not a workflow). */
const NOW = Date.now();
const MIN = 60 * 1000;

const C = TYPES.CLICK;
const I = TYPES.INPUT;
const L = TYPES.LOCATION;
const U = TYPES.CUSTOM;

/* Compact spec → full seed. `ev` is [type, value] pairs. */
interface Spec {
  id: string;
  user: string;
  browser: string;
  os: string;
  device: 'desktop' | 'mobile' | 'tablet';
  platform: 'web' | 'ios' | 'android';
  country: string;
  city: string;
  state?: string;
  durMs: number;
  events: number;
  errors: number;
  pages: number;
  viewed?: boolean;
  fav?: boolean;
  issues?: string[];
  plan: 'paid' | 'trial' | 'free';
  minAgo: number;
  ev: Array<[string, string]>;
}

const SPECS: Spec[] = [
  { id: 'sess_1001', user: 'daniel@black-bird.io', browser: 'Chrome', os: 'Mac OS X', device: 'desktop', platform: 'web', country: 'DE', city: 'Frankfurt am Main', durMs: 721000, events: 84, errors: 3, pages: 7, plan: 'paid', minAgo: 3, issues: ['crash', 'js_exception'], ev: [[L, '/checkout'], [C, 'Place order'], [I, 'Card number'], [C, 'Place order'], [U, 'payment_failed']] },
  { id: 'sess_1002', user: 'lucas@finhub.io', browser: 'Chrome', os: 'Windows', device: 'desktop', platform: 'web', country: 'CA', city: 'Toronto', durMs: 552000, events: 61, errors: 1, pages: 5, plan: 'paid', minAgo: 12, issues: ['bad_request'], ev: [[L, '/checkout'], [C, 'Pay now'], [I, 'Email'], [C, 'Pay now']] },
  { id: 'sess_1003', user: 'amara@shopwave.co', browser: 'Safari', os: 'iOS', device: 'mobile', platform: 'ios', country: 'NG', city: 'Lagos', durMs: 363000, events: 33, errors: 0, pages: 3, plan: 'trial', minAgo: 26, ev: [[L, '/cart'], [C, 'Place order'], [L, '/checkout']] },
  { id: 'sess_1004', user: 'main@badmanners.gg', browser: 'Safari', os: 'iOS', device: 'mobile', platform: 'ios', country: 'PK', city: 'Islamabad', durMs: 487000, events: 47, errors: 2, pages: 4, plan: 'trial', minAgo: 41, issues: ['mouse_thrashing'], ev: [[L, '/checkout'], [C, 'Place order'], [C, 'Place order'], [C, 'Place order']] },
  { id: 'sess_1005', user: 'priya@meshcart.in', browser: 'Chrome', os: 'Android', device: 'mobile', platform: 'android', country: 'IN', city: 'Mumbai', durMs: 344000, events: 29, errors: 0, pages: 4, plan: 'free', minAgo: 58, ev: [[L, '/cart'], [C, 'Checkout'], [L, '/cart'], [C, 'Checkout']] },
  { id: 'sess_1006', user: 'sven@northsale.de', browser: 'Firefox', os: 'Windows', device: 'desktop', platform: 'web', country: 'DE', city: 'Berlin', durMs: 905000, events: 142, errors: 5, pages: 11, viewed: true, plan: 'paid', minAgo: 73, issues: ['js_exception'], ev: [[L, '/products'], [C, 'Add to cart'], [I, 'Search'], [U, 'filter_applied'], [L, '/checkout']] },
  { id: 'sess_1007', user: 'yuki@tanso.jp', browser: 'Safari', os: 'Mac OS X', device: 'desktop', platform: 'web', country: 'JP', city: 'Tokyo', durMs: 211000, events: 18, errors: 0, pages: 2, plan: 'paid', minAgo: 95, ev: [[L, '/'], [C, 'Sign in'], [I, 'Password']] },
  { id: 'sess_1008', user: 'george@oakhouse.co.uk', browser: 'Chrome', os: 'Mac OS X', device: 'desktop', platform: 'web', country: 'GB', city: 'London', durMs: 638000, events: 71, errors: 1, pages: 6, plan: 'paid', minAgo: 120, ev: [[L, '/settings'], [I, 'Display name'], [C, 'Save'], [U, 'profile_updated']] },
  { id: 'sess_1009', user: 'bruno@loja.br', browser: 'Chrome', os: 'Windows', device: 'desktop', platform: 'web', country: 'BR', city: 'São Paulo', durMs: 412000, events: 38, errors: 4, pages: 5, plan: 'trial', minAgo: 160, issues: ['bad_request', 'js_exception'], ev: [[L, '/checkout'], [C, 'Finalizar'], [I, 'CPF'], [C, 'Finalizar']] },
  { id: 'sess_1010', user: 'anon · 4f2a9c', browser: 'Edge', os: 'Windows', device: 'desktop', platform: 'web', country: 'US', city: 'Austin', state: 'TX', durMs: 96000, events: 9, errors: 0, pages: 1, plan: 'free', minAgo: 205, ev: [[L, '/pricing'], [C, 'Start trial']] },
  { id: 'sess_1011', user: 'mei@cloudleaf.sg', browser: 'Chrome', os: 'Android', device: 'mobile', platform: 'android', country: 'SG', city: 'Singapore', durMs: 524000, events: 52, errors: 2, pages: 6, plan: 'paid', minAgo: 260, issues: ['mouse_thrashing'], ev: [[L, '/dashboard'], [C, 'Export'], [C, 'Export'], [C, 'Export'], [U, 'export_started']] },
  { id: 'sess_1012', user: 'olivia@brightlabs.io', browser: 'Chrome', os: 'Mac OS X', device: 'desktop', platform: 'web', country: 'US', city: 'San Francisco', state: 'CA', durMs: 1140000, events: 188, errors: 0, pages: 14, viewed: true, fav: true, plan: 'paid', minAgo: 320, ev: [[L, '/dashboard'], [I, 'Search'], [C, 'Open report'], [U, 'report_shared'], [L, '/reports']] },
  { id: 'sess_1013', user: 'tomas@vinitomx.mx', browser: 'Firefox', os: 'Linux', device: 'desktop', platform: 'web', country: 'MX', city: 'Guadalajara', durMs: 287000, events: 24, errors: 1, pages: 3, plan: 'trial', minAgo: 410, ev: [[L, '/login'], [I, 'Email'], [C, 'Continue']] },
  { id: 'sess_1014', user: 'hannah@craftly.com', browser: 'Safari', os: 'iOS', device: 'mobile', platform: 'ios', country: 'US', city: 'Seattle', state: 'WA', durMs: 178000, events: 14, errors: 0, pages: 2, plan: 'free', minAgo: 540, ev: [[L, '/'], [C, 'Get started'], [I, 'Email']] },
  { id: 'sess_1015', user: 'noah@parcelpop.au', browser: 'Chrome', os: 'Windows', device: 'desktop', platform: 'web', country: 'AU', city: 'Sydney', durMs: 766000, events: 97, errors: 6, pages: 9, viewed: true, plan: 'paid', minAgo: 700, issues: ['js_exception', 'crash'], ev: [[L, '/orders'], [C, 'Track'], [U, 'tracking_opened'], [L, '/orders/4821']] },
  { id: 'sess_1016', user: 'ines@modshop.es', browser: 'Chrome', os: 'Android', device: 'tablet', platform: 'android', country: 'ES', city: 'Madrid', durMs: 333000, events: 31, errors: 0, pages: 4, plan: 'trial', minAgo: 920, ev: [[L, '/catalog'], [C, 'Add to cart'], [I, 'Quantity']] },
  { id: 'sess_1017', user: 'kwame@accrahub.gh', browser: 'Opera', os: 'Windows', device: 'desktop', platform: 'web', country: 'GH', city: 'Accra', durMs: 145000, events: 11, errors: 1, pages: 2, plan: 'free', minAgo: 1500, ev: [[L, '/signup'], [I, 'Phone'], [C, 'Verify']] },
  { id: 'sess_1018', user: 'sofia@nordktchn.no', browser: 'Safari', os: 'Mac OS X', device: 'desktop', platform: 'web', country: 'NO', city: 'Oslo', durMs: 489000, events: 44, errors: 0, pages: 5, fav: true, plan: 'paid', minAgo: 2600, ev: [[L, '/recipes'], [I, 'Search'], [C, 'Save recipe'], [U, 'recipe_saved']] },
  { id: 'sess_1019', user: 'arjun@devstack.in', browser: 'Chrome', os: 'Linux', device: 'desktop', platform: 'web', country: 'IN', city: 'Bengaluru', durMs: 1320000, events: 205, errors: 3, pages: 17, viewed: true, plan: 'paid', minAgo: 4300, issues: ['js_exception'], ev: [[L, '/api-keys'], [C, 'Generate key'], [U, 'key_generated'], [C, 'Copy'], [L, '/docs']] },
  { id: 'sess_1020', user: 'maya@petalbox.fr', browser: 'Chrome', os: 'iOS', device: 'mobile', platform: 'ios', country: 'FR', city: 'Paris', durMs: 256000, events: 22, errors: 2, pages: 3, plan: 'trial', minAgo: 8800, issues: ['bad_request'], ev: [[L, '/checkout'], [C, 'Pay'], [I, 'Card number'], [C, 'Pay']] },
  { id: 'sess_1021', user: 'liam@harborline.ie', browser: 'Edge', os: 'Windows', device: 'desktop', platform: 'web', country: 'IE', city: 'Dublin', durMs: 198000, events: 16, errors: 0, pages: 2, plan: 'free', minAgo: 14400, ev: [[L, '/'], [C, 'Book a demo'], [I, 'Company']] },
];

/* Realistic user metadata — these are customer-defined in OpenReplay and there
   can be many (Mehdi: "you can have up to 10/15"). Derived deterministically
   from the spec so the demo stays stable across reloads. */
const META_ROLES = ['Admin', 'Member', 'Owner', 'Viewer', 'Billing'];
const META_TIERS = ['Enterprise', 'Growth', 'Startup', 'Self-serve'];
function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
function buildMetadata(s: Spec): Record<string, string> {
  const h = hashStr(s.id);
  const domain = s.user.includes('@') ? s.user.split('@')[1] : '';
  const company = domain ? domain.split('.')[0] : 'guest';
  return {
    plan: s.plan,
    company,
    role: META_ROLES[h % META_ROLES.length],
    tier: META_TIERS[(h >> 3) % META_TIERS.length],
    accountId: `acc_${1000 + (h % 9000)}`,
    seats: String((h % 48) + 2),
  };
}

function buildSeed(s: Spec): MockSessionSeed {
  const startTs = NOW - s.minAgo * MIN;
  return {
    sessionId: s.id,
    userId: s.user,
    userBrowser: s.browser,
    userOs: s.os,
    userDeviceType: s.device,
    platform: s.platform,
    userCountry: s.country,
    userCity: s.city,
    userState: s.state ?? '',
    duration: s.durMs,
    eventsCount: s.events,
    errorsCount: s.errors,
    pagesCount: s.pages,
    viewed: s.viewed ?? false,
    favorite: s.fav ?? false,
    issueTypes: s.issues ?? [],
    metadata: buildMetadata(s),
    startTs,
    projectId: 1,
    events: s.ev.map(([type, value], i) => ({
      type,
      value,
      timestamp: startTs + (i + 1) * 1000,
    })),
  };
}

export const MOCK_SESSION_POOL: MockSessionSeed[] = SPECS.map(buildSeed);

const POOL_BY_ID: Record<string, MockSessionSeed> = MOCK_SESSION_POOL.reduce(
  (acc, s) => {
    acc[s.sessionId] = s;
    return acc;
  },
  {} as Record<string, MockSessionSeed>,
);

export function getMockSessionById(
  sessionId: string,
): MockSessionSeed | undefined {
  return POOL_BY_ID[sessionId];
}

/* Build a real Session for the list. Strip `events` so the Session constructor
   doesn't run them through SessionEvent (the row only needs eventsCount, which
   passes through untouched). */
export function buildSession(seed: MockSessionSeed): Session {
  const { events, ...rest } = seed;
  return new Session(rest as any);
}

/* ---- client-side filtering (mirrors what /sessions/search would do) ---- */

// serialized filter `name` → seed attribute field
const ATTR_FIELD: Record<string, keyof MockSessionSeed> = {
  [FilterKey.USER_BROWSER]: 'userBrowser',
  [FilterKey.USER_OS]: 'userOs',
  [FilterKey.USER_COUNTRY]: 'userCountry',
  [FilterKey.USER_CITY]: 'userCity',
  [FilterKey.USER_STATE]: 'userState',
  [FilterKey.USER_DEVICE]: 'userDeviceType',
  [FilterKey.USER_DEVICE_TYPE]: 'userDeviceType',
  [FilterKey.USERID]: 'userId',
  [FilterKey.PLATFORM]: 'platform',
};

// serialized event filter `name` → session event type
const EVENT_TYPE: Record<string, string> = {
  [FilterKey.CLICK]: TYPES.CLICK,
  [FilterKey.INPUT]: TYPES.INPUT,
  [FilterKey.LOCATION]: TYPES.LOCATION,
  [FilterKey.CUSTOM]: TYPES.CUSTOM,
};

function valueOp(sv: string, v: string, operator?: string): boolean {
  const a = sv.toLowerCase();
  const b = v.toLowerCase();
  switch (operator) {
    case 'contains':
      return a.includes(b);
    case 'notContains':
      return !a.includes(b);
    case 'startsWith':
      return a.startsWith(b);
    case 'endsWith':
      return a.endsWith(b);
    case 'isNot':
    case 'not':
    case '!=':
      return a !== b;
    case 'is':
    case '=':
    default:
      return a === b;
  }
}

function cleanValues(value: any): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v) => v !== null && v !== undefined && v !== '')
    .map((v) => String(v));
}

function matchDuration(durMs: number, f: any): boolean {
  const vals: any[] = Array.isArray(f.value) ? f.value : [];
  const min =
    vals[0] !== null && vals[0] !== undefined && vals[0] !== ''
      ? Number(vals[0])
      : null;
  const max =
    vals[1] !== null && vals[1] !== undefined && vals[1] !== ''
      ? Number(vals[1])
      : null;
  if (min !== null && durMs < min) return false;
  if (max !== null && durMs > max) return false;
  return true;
}

function matchNumber(n: number, f: any): boolean {
  const v = cleanValues(f.value)[0];
  if (v === undefined) return true;
  const num = Number(v);
  switch (f.operator) {
    case '<':
      return n < num;
    case '<=':
      return n <= num;
    case '>':
      return n > num;
    case '>=':
      return n >= num;
    default:
      return n === num;
  }
}

function matchFilter(seed: MockSessionSeed, f: any): boolean {
  if (!f || !f.name) return true;
  const values = cleanValues(f.value);

  if (f.isEvent) {
    const type = EVENT_TYPE[f.name];
    if (!type) return true; // event type we don't model → don't narrow
    const evs = seed.events.filter((e) => e.type === type);
    if (!evs.length) return false;
    if (!values.length) return true; // "has any" of this event type
    return evs.some((e) =>
      values.some((v) => valueOp(String(e.value), v, f.operator)),
    );
  }

  if (f.name === FilterKey.DURATION) return matchDuration(seed.duration, f);
  if (f.name === FilterKey.EVENTS_COUNT) return matchNumber(seed.eventsCount, f);

  const field = ATTR_FIELD[f.name];
  if (!field) return true; // attribute we don't model → don't narrow
  if (!values.length) return true;
  const sv = String(seed[field] ?? '');
  return values.some((v) => valueOp(sv, v, f.operator));
}

/* Filter + paginate the pool from a toSearch()-shaped params object
   ({ filters, page, limit, ... }). Matching runs over seeds (with events). */
export function filterPool(params: any = {}): {
  sessions: MockSessionSeed[];
  total: number;
} {
  const filters = Array.isArray(params.filters) ? params.filters : [];
  const matched = MOCK_SESSION_POOL.filter((seed) =>
    filters.every((f: any) => matchFilter(seed, f)),
  );
  const page = Number(params.page) > 0 ? Number(params.page) : 1;
  const limit = Number(params.limit) > 0 ? Number(params.limit) : 10;
  const start = (page - 1) * limit;
  return { sessions: matched.slice(start, start + limit), total: matched.length };
}

/* Build the filter catalog the search bar reads from. Routed through the real
   filterStore.processFilters so scope / isEvent / operators / possibleValues
   come out shaped exactly like the backend response would produce. */
export function buildMockFilters(filterStore: any): any[] {
  const events = filterStore.processFilters(
    [
      { name: FilterKey.CLICK, displayName: 'Click', autoCaptured: true },
      { name: FilterKey.INPUT, displayName: 'Input', autoCaptured: true },
      { name: FilterKey.LOCATION, displayName: 'Path', autoCaptured: true },
      { name: FilterKey.CUSTOM, displayName: 'Custom Event', autoCaptured: false },
    ],
    'events',
    ['sessions', 'events'],
  );

  const userAttrs = filterStore.processFilters(
    [
      { name: FilterKey.USER_BROWSER, displayName: 'Browser', dataType: 'string', isPredefined: true, possibleValues: ['Chrome', 'Safari', 'Firefox', 'Edge', 'Opera'] },
      { name: FilterKey.USER_OS, displayName: 'OS', dataType: 'string', isPredefined: true, possibleValues: ['Mac OS X', 'Windows', 'iOS', 'Android', 'Linux'] },
      { name: FilterKey.USER_COUNTRY, displayName: 'Country', dataType: 'string', isPredefined: true, possibleValues: ['US', 'DE', 'CA', 'NG', 'IN', 'JP', 'GB', 'BR', 'FR', 'AU'] },
      { name: FilterKey.USER_DEVICE, displayName: 'Device', dataType: 'string', isPredefined: true, possibleValues: ['desktop', 'mobile', 'tablet'] },
      { name: FilterKey.USER_CITY, displayName: 'City', dataType: 'string' },
      { name: FilterKey.USERID, displayName: 'User Id', dataType: 'string' },
    ],
    'user',
    ['sessions', 'users'],
  );

  const meta = filterStore.processFilters(
    [
      { name: FilterKey.DURATION, displayName: 'Duration', dataType: 'duration' },
      { name: FilterKey.EVENTS_COUNT, displayName: 'Events Count', dataType: 'number' },
    ],
    'metadata',
    ['sessions'],
  );

  return [...events, ...userAttrs, ...meta];
}
