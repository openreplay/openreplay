import { makeAutoObservable } from 'mobx';

/* =========================================================================
   Issues — the new AI issue-detection surface. Mock, in-memory data only
   (no API). An ISSUE is the primary object: one binary flag (Critical), one
   of three categories (Errors / UI/UX / Slowness), and a set of tags.
   ========================================================================= */

export type CategoryName = 'Errors' | 'UI/UX' | 'Slowness';
export type MatchMode = 'all' | 'any';
export type SortMode = 'impact' | 'newest';

export interface IssueSession {
  email: string;
  plan: 'paid' | 'trial' | 'free';
  browser: string;
  os: string;
  loc: string;
  dur: string;
  tags: string[];
  journey: string;
}

export interface Issue {
  id: number;
  head: string;
  critical: boolean;
  cat: CategoryName;
  real: string;
  journey: string;
  impact: number;
  /** minutes since this issue was last seen (drives "Last seen" + newest sort) */
  seenAgoMin: number;
  tags: string[];
  sessions: IssueSession[];
}

export const CAT_ORDER: CategoryName[] = ['Errors', 'UI/UX', 'Slowness'];
export const CAT_COLOR: Record<CategoryName, string> = {
  Errors: '#CC0000',
  'UI/UX': '#615FFF',
  Slowness: '#E28940',
};

/* Impact as three levels (no number). Thresholds match the sort order. */
export type ImpactLevel = 'High' | 'Medium' | 'Low';

export function impactLevel(v: number): ImpactLevel {
  if (v >= 45) return 'High';
  if (v >= 25) return 'Medium';
  return 'Low';
}

/** filled-segment count per level (out of 3) */
export const IMPACT_FILLED: Record<ImpactLevel, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

/** the three impact colors */
export const IMPACT_COLOR: Record<ImpactLevel, string> = {
  High: 'var(--color-red)',
  Medium: 'var(--color-orange)',
  Low: 'var(--color-gray-medium)',
};

const MIN_PER_DAY = 1440;

/** Compact "last seen" label: relative for up to 7 days, an absolute date beyond. */
export function lastSeenLabel(minAgo: number): string {
  if (minAgo < 1) return 'just now';
  if (minAgo < 60) return `${Math.round(minAgo)}m ago`;
  if (minAgo < MIN_PER_DAY) return `${Math.round(minAgo / 60)}h ago`;
  if (minAgo < 7 * MIN_PER_DAY) return `${Math.round(minAgo / MIN_PER_DAY)}d ago`;
  return new Date(Date.now() - minAgo * 60000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function lastSeenExact(minAgo: number): string {
  return new Date(Date.now() - minAgo * 60000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const RAW: Omit<Issue, 'tags'>[] = [
  {
    id: 1,
    head: 'Card declined with no error message at checkout',
    critical: true,
    cat: 'Errors',
    impact: 71,
    seenAgoMin: 3,
    real: 'The payment request returns a declined status but the UI shows no error — the "Place order" button just resets to its default state, leaving the user unsure whether the order went through.',
    journey: 'User filled in card details, hit "Place order", saw the spinner end with nothing, retried the same card twice, then abandoned the cart.',
    sessions: [
      { email: 'daniel@black-bird.io', plan: 'paid', browser: 'Chrome', os: 'Mac OS X', loc: 'Frankfurt am Main', dur: '12m1s', tags: ['Payment', 'Checkout', 'Error'], journey: 'Filled in card details, hit "Place order", watched the spinner end with nothing, re-entered the same card twice, then left the cart.' },
      { email: 'lucas@finhub.io', plan: 'paid', browser: 'Chrome', os: 'Windows', loc: 'Toronto', dur: '9m12s', tags: ['Checkout', 'Frustration', 'Drop-off'], journey: 'Reached checkout, submitted payment, got silently bounced back to the form, grew visibly frustrated and abandoned.' },
      { email: 'amara@shopwave.co', plan: 'trial', browser: 'Safari', os: 'iOS', loc: 'Lagos', dur: '6m03s', tags: ['Payment', 'Drop-off'], journey: 'Tried to pay on her phone, saw the button reset with no message, and gave up after a single attempt.' },
    ],
  },
  {
    id: 2,
    head: '"Place order" button unresponsive on mobile',
    critical: true,
    cat: 'UI/UX',
    impact: 66,
    seenAgoMin: 24,
    real: 'On mobile viewports the primary checkout button receives the tap but never fires its handler, so nothing happens. Users tap it repeatedly (rage clicks) with no response.',
    journey: 'User reached the checkout step on a phone, tapped "Place order" seven times in a row, scrolled up and back down looking for an error, then left.',
    sessions: [
      { email: 'main@badmanners.gg', plan: 'trial', browser: 'Safari', os: 'iOS', loc: 'Islamabad', dur: '8m7s', tags: ['Checkout', 'Rage Clicks', 'Frustration'], journey: 'Tapped "Place order" seven times in a row on a phone, nothing fired, scrolled up and down hunting for an error, then quit.' },
      { email: 'priya@meshcart.in', plan: 'free', browser: 'Chrome', os: 'Android', loc: 'Mumbai', dur: '5m44s', tags: ['Checkout', 'Back-and-Forth'], journey: 'Tapped the order button, looped back to the cart and forward again twice, and never got a response.' },
    ],
  },
  {
    id: 3,
    head: 'Card form rejects a valid expiry date',
    critical: true,
    cat: 'Errors',
    impact: 58,
    seenAgoMin: 52,
    real: 'The expiry-date field throws a form validation error on correctly formatted future dates (MM/YY), blocking the user from submitting payment.',
    journey: 'User entered a valid expiry three different ways, each rejected with "invalid date", re-typed slowly, then gave up on the payment step.',
    sessions: [
      { email: 'dev@dosetech.co', plan: 'paid', browser: 'Firefox', os: 'Linux', loc: 'Lahore (Sher Kot)', dur: '9m1s', tags: ['Payment', 'Form Completion', 'Error'], journey: 'Entered a valid expiry three different ways, each rejected as "invalid date", re-typed it slowly, then abandoned payment.' },
      { email: 'sofia@oakmont.eu', plan: 'paid', browser: 'Chrome', os: 'Windows', loc: 'Madrid', dur: '7m20s', tags: ['Form Completion', 'Data Entry'], journey: 'Corrected the expiry field over and over against a false validation error before giving up on the order.' },
    ],
  },
  {
    id: 4,
    head: 'Checkout page takes 8s to load',
    critical: true,
    cat: 'Slowness',
    impact: 52,
    seenAgoMin: 180,
    real: 'The checkout page takes around eight seconds to become interactive, with the order summary and payment fields rendering well after the rest of the page.',
    journey: 'User clicked through to checkout, stared at a half-loaded page for several seconds, switched tabs, came back, and a portion of users left before it finished.',
    sessions: [
      { email: 'rajesh+support@acme.com', plan: 'paid', browser: 'Chrome', os: 'Windows', loc: 'Newark', dur: '15m20s', tags: ['Checkout', 'Slow Performance'], journey: 'Clicked through to checkout, stared at a half-loaded page, switched tabs while it loaded, and came back several seconds later.' },
      { email: 'elena@brightbox.io', plan: 'trial', browser: 'Chrome', os: 'Mac OS X', loc: 'Berlin', dur: '11m02s', tags: ['Slow Performance', 'Drop-off'], journey: 'Waited on the slow checkout, lost patience before the payment fields rendered, and left without ordering.' },
    ],
  },
  {
    id: 5,
    head: 'Users abandon onboarding at the long step-4 form',
    critical: false,
    cat: 'UI/UX',
    impact: 47,
    seenAgoMin: 480,
    real: 'Step 4 of onboarding is a single overly long form with 14 required fields; completion drops sharply here and many users never reach step 5.',
    journey: 'User progressed smoothly through steps 1–3, hit the long form at step 4, scrolled the whole thing, hesitated on several fields, then closed the tab.',
    sessions: [
      { email: 'muhammad.hadayat@swipbox.com', plan: 'trial', browser: 'Chrome', os: 'Mac OS X', loc: 'Saidpur', dur: '11m31s', tags: ['Onboarding', 'Form Completion', 'Hesitation'], journey: 'Breezed through steps 1–3, hit the 14-field form at step 4, hesitated on several inputs, then closed the tab.' },
      { email: 'tom@layerlabs.dev', plan: 'trial', browser: 'Firefox', os: 'Windows', loc: 'Austin', dur: '8m49s', tags: ['Onboarding', 'Drop-off'], journey: 'Scrolled the long step-4 form top to bottom, never started filling it, and abandoned onboarding.' },
    ],
  },
  {
    id: 6,
    head: 'Product images slow to load on the listing grid',
    critical: false,
    cat: 'Slowness',
    impact: 39,
    seenAgoMin: 1320,
    real: 'Product thumbnails on the category listing take several seconds to appear, loading one by one as the user scrolls, so the grid looks broken on first paint.',
    journey: 'User opened a category, scrolled a grid of empty image placeholders, paused waiting for thumbnails, and scrolled back up once they finally loaded.',
    sessions: [
      { email: 'apps@vfairs.com', plan: 'free', browser: 'Chrome', os: 'Windows', loc: 'Poznan', dur: '7m55s', tags: ['Navigation', 'Slow Performance'], journey: 'Opened a category, scrolled a grid of empty placeholders, waited, then scrolled back up once the thumbnails finally loaded.' },
      { email: 'kenji@miraisoft.jp', plan: 'paid', browser: 'Safari', os: 'Mac OS X', loc: 'Osaka', dur: '6m10s', tags: ['Search', 'Slow Performance'], journey: 'Searched the listing, watched images trickle in one by one, and paused before interacting with the grid.' },
    ],
  },
  {
    id: 7,
    head: 'Search spinner never resolves',
    critical: false,
    cat: 'Errors',
    impact: 35,
    seenAgoMin: 2880,
    real: 'A search request fails silently on the network layer; the results spinner keeps spinning indefinitely and no results or error are ever shown.',
    journey: 'User typed a query, waited on the spinner, cleared and retried twice, then tried navigating to the category manually instead.',
    sessions: [
      { email: 'mehdi+new@openreplay.cloud', plan: 'paid', browser: 'Firefox', os: 'Mac OS X', loc: 'Schieren', dur: '10m26s', tags: ['Search', 'Error'], journey: 'Typed a query, watched the spinner hang, cleared and retried twice, then tried browsing to the category by hand instead.' },
      { email: 'hana@coralpay.io', plan: 'trial', browser: 'Chrome', os: 'Windows', loc: 'Seoul', dur: '6m38s', tags: ['Filtering', 'Frustration'], journey: 'Applied a filter, hit a spinner that never resolved, retried it a few times and grew frustrated before leaving.' },
    ],
  },
  {
    id: 8,
    head: 'Filters reset when moving to the next page',
    critical: false,
    cat: 'UI/UX',
    impact: 30,
    seenAgoMin: 5760,
    real: 'Active filter chips are silently dropped when the user paginates, so page 2 shows unfiltered results — an information mismatch between what the user set and what they see.',
    journey: 'User applied two filters, reviewed page 1, clicked to page 2, saw the filters gone and results changed, went back and re-applied them repeatedly.',
    sessions: [
      { email: 'apps@vfairs.com', plan: 'free', browser: 'Chrome', os: 'Windows', loc: 'Nong Sung', dur: '9m20s', tags: ['Filtering', 'Lost Filters'], journey: 'Set two filters, reviewed page 1, clicked to page 2 and found them silently cleared, then re-applied them repeatedly.' },
      { email: 'omar@gridly.io', plan: 'paid', browser: 'Chrome', os: 'Linux', loc: 'Cairo', dur: '7m02s', tags: ['Search', 'Back-and-Forth'], journey: 'Filtered the results, paged forward and back, lost the filters each time, and eventually gave up.' },
    ],
  },
  {
    id: 9,
    head: 'Footer "Help Center" link 404s',
    critical: false,
    cat: 'UI/UX',
    impact: 22,
    seenAgoMin: 8640,
    real: 'The Help Center link in the footer points to a dead URL and returns a 404, blocking users who are trying to reach support.',
    journey: 'User scrolled to the footer, clicked "Help Center", landed on a 404 page, hit back, and tried the contact link instead.',
    sessions: [
      { email: 'daniel@black-bird.io', plan: 'paid', browser: 'Chrome', os: 'Mac OS X', loc: 'Thung Khru', dur: '5m44s', tags: ['Navigation', 'Help Seeking'], journey: 'Scrolled to the footer, clicked "Help Center", landed on a 404, hit back, and tried the contact link instead.' },
      { email: 'greta@nordkit.se', plan: 'free', browser: 'Firefox', os: 'Windows', loc: 'Stockholm', dur: '4m12s', tags: ['Help Seeking', 'Error'], journey: 'Went looking for support, clicked the footer Help Center link, hit the dead 404 page, and abandoned the attempt.' },
    ],
  },
  {
    id: 10,
    head: 'Dashboard charts take 5s to render',
    critical: false,
    cat: 'Slowness',
    impact: 18,
    seenAgoMin: 12960,
    real: 'The account dashboard charts take around five seconds to fetch and draw after the page loads, leaving the panels blank in the meantime.',
    journey: 'User opened the dashboard, waited on blank chart panels, moved the cursor around expecting data, and continued once the charts appeared.',
    sessions: [
      { email: 'rajesh+support@acme.com', plan: 'trial', browser: 'Chrome', os: 'Linux', loc: 'Lahore (Sher Kot)', dur: '6m32s', tags: ['Navigation', 'Slow Performance'], journey: 'Opened the dashboard, waited on blank chart panels, moved the cursor around expecting data, and carried on once it drew.' },
      { email: 'bea@finchly.com', plan: 'paid', browser: 'Chrome', os: 'Mac OS X', loc: 'Lisbon', dur: '5m18s', tags: ['Navigation'], journey: 'Landed on the dashboard and sat through several seconds of empty panels before the charts finally appeared.' },
    ],
  },
  {
    id: 11,
    head: 'Quick bounce off the pricing page',
    critical: false,
    cat: 'UI/UX',
    impact: 12,
    seenAgoMin: 20160,
    real: 'A noticeable share of sessions land on the pricing page and leave within a few seconds with no scroll or click — a bounce that suggests the page is not matching intent.',
    journey: 'User landed on pricing from an ad, stayed under ten seconds without scrolling or interacting, and closed the tab.',
    sessions: [
      { email: 'visitor@gmail.com', plan: 'free', browser: 'Chrome', os: 'Windows', loc: 'Manila', dur: '8s', tags: ['Bounce', 'Inactive'], journey: 'Landed on pricing from an ad, stayed under ten seconds without scrolling or clicking, and closed the tab.' },
      { email: 'guest@yahoo.com', plan: 'free', browser: 'Safari', os: 'iOS', loc: 'Jakarta', dur: '6s', tags: ['Navigation', 'Bounce'], journey: 'Arrived on the pricing page from a link, did not scroll or interact at all, and bounced within seconds.' },
    ],
  },
];

const ISSUES: Issue[] = RAW.map((r) => ({
  ...r,
  tags: [...new Set(r.sessions.flatMap((s) => s.tags))],
}));

export default class IssuesStore {
  all: Issue[] = ISSUES;

  q = '';
  cats: CategoryName[] = [];
  labels: string[] = [];
  match: MatchMode = 'all';
  sort: SortMode = 'impact';
  critOnly = false;
  showHidden = false;
  hidden: number[] = [];
  names: Record<number, string> = {};
  dismissReasons: Record<number, string> = {};

  constructor() {
    makeAutoObservable(this);
  }

  // ---- derived ----
  get allTags(): string[] {
    return [...new Set(this.all.flatMap((i) => i.tags))].sort();
  }

  catCount(c: CategoryName): number {
    return this.all.filter((i) => i.cat === c).length;
  }

  get list(): Issue[] {
    let l = this.all.map((i) =>
      this.names[i.id] ? { ...i, head: this.names[i.id] } : i,
    );
    if (!this.showHidden) l = l.filter((i) => !this.hidden.includes(i.id));
    if (this.cats.length) l = l.filter((i) => this.cats.includes(i.cat));
    if (this.labels.length)
      l = l.filter((i) =>
        this.match === 'any'
          ? this.labels.some((t) => i.tags.includes(t))
          : this.labels.every((t) => i.tags.includes(t)),
      );
    if (this.critOnly) l = l.filter((i) => i.critical);
    const q = this.q.toLowerCase().trim();
    if (q)
      l = l.filter((i) =>
        (i.head + i.real + i.journey + i.tags.join() + i.cat)
          .toLowerCase()
          .includes(q),
      );
    const cmp =
      this.sort === 'newest'
        ? (a: Issue, b: Issue) => a.seenAgoMin - b.seenAgoMin
        : (a: Issue, b: Issue) =>
            +b.critical - +a.critical || b.impact - a.impact;
    return [...l].sort(cmp);
  }

  byId(id: number): Issue | undefined {
    const i = this.all.find((x) => x.id === id);
    if (!i) return undefined;
    return this.names[id] ? { ...i, head: this.names[id] } : i;
  }

  // ---- actions ----
  setQ = (q: string) => { this.q = q; };
  setSort = (s: SortMode) => { this.sort = s; };
  setMatch = (m: MatchMode) => { this.match = m; };
  setCats = (c: CategoryName[]) => { this.cats = c; };
  setLabels = (l: string[]) => { this.labels = l; };
  setCritOnly = (v: boolean) => { this.critOnly = v; };
  setShowHidden = (v: boolean) => { this.showHidden = v; };
  rename = (id: number, name: string) => { this.names[id] = name; };
  hide = (id: number, reason: string) => {
    if (!this.hidden.includes(id)) this.hidden.push(id);
    this.dismissReasons[id] = reason;
  };
  unhide = (id: number) => {
    this.hidden = this.hidden.filter((x) => x !== id);
    delete this.dismissReasons[id];
  };
}
