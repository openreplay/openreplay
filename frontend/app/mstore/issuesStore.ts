import React from 'react';
import { makeAutoObservable } from 'mobx';
import { CircleX, MousePointerClick, Gauge } from 'lucide-react';
import { getMockSessionById, MOCK_SESSION_POOL } from 'App/dev/mockSessions';

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
  /** short headline for how this session experienced the issue — a "variation" */
  variation: string;
}

export interface Issue {
  id: number;
  head: string;
  critical: boolean;
  /** which focus surfaced this issue — absent = found in full traffic */
  focusId?: number;
  cat: CategoryName;
  real: string;
  /** suggested fix / resolution — paired with `real` in the detail diagnosis */
  fix: string;
  journey: string;
  impact: number;
  /** minutes since this issue was last seen (drives "Last seen" + newest sort) */
  seenAgoMin: number;
  tags: string[];
  sessions: IssueSession[];
  /** ids into the shared MOCK_SESSION_POOL — the SAME entities the Sessions
      page lists. Drives the example-session cards on the issue detail page. */
  sessionIds?: string[];
}

/** A resolved example-session card for the issue detail page. Factual fields are
    sourced from the shared session pool (same entity as the Sessions page); the
    behavioral tags + plain-language journey are issue-authored (zipped by index). */
export interface IssueSessionCard {
  sessionId: string;
  email: string;
  browser: string;
  os: string;
  city: string;
  country: string;
  loc: string;
  durMs: number;
  dur: string;
  date: string;
  device: string;
  events: number;
  plan: string;
  tags: string[];
  journey: string;
  /** short headline of this session's variation of the issue */
  variation: string;
}

function fmtDuration(ms: number): string {
  const totalSec = Math.max(1, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m ? `${m}m${s}s` : `${s}s`;
}

export const CAT_ORDER: CategoryName[] = ['Errors', 'UI/UX', 'Slowness'];

/* Reason chips offered when hiding an issue (shared by the list + detail pages),
   so the agent learns why something was dismissed. */
export const HIDE_REASONS = [
  'Not a real issue',
  'Already fixed',
  'Expected behavior',
  'Duplicate',
  'Low priority',
];

/* Reason chips offered when removing an issue's critical flag (shared by the
   list + detail pages). */
export const CRITICAL_REASONS = [
  'Not actually critical',
  'Already resolved',
  'Acceptable risk',
  'Low user impact',
];

/* Canned journey descriptions offered as autocomplete suggestions in the NL
   journey search on the issue detail page. Phrased from the same vocabulary as
   the mock session journeys below so they read like real, findable journeys. */
export const JOURNEY_SEARCH_SUGGESTIONS = [
  'users who add to cart then abandon at checkout',
  'users who hit "Place order" and watch the spinner end with nothing',
  'users who tap the order button repeatedly with no response',
  'users whose valid card expiry gets rejected as invalid',
  'users who leave before the payment fields render',
  'users who abandon the long onboarding form at step 4',
  'users who scroll past empty image placeholders',
  'users who retry a search after the spinner hangs',
  'users who lose their filters when moving to page 2',
  'users who hit the dead Help Center link in the footer',
  'users who wait on blank dashboard charts',
  'users who bounce from pricing in under ten seconds',
];

/* Single source for the per-category icon so the list and the detail header
   stay consistent. */
export const CAT_ICON: Record<
  CategoryName,
  React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>
> = {
  Errors: CircleX,
  'UI/UX': MousePointerClick,
  Slowness: Gauge,
};

export const CAT_COLOR: Record<CategoryName, string> = {
  Errors: '#CC0000',
  'UI/UX': '#615FFF',
  Slowness: '#E28940',
};

/* =========================================================================
   FOCUS — point the agent's limited daily sample at portions of traffic.
   A focus = an omni-search query (the same filters as Sessions) + optional
   free-text instructions. Several can be active at once (one per teammate's
   area, typically); full traffic keeps a baseline share of the sample and
   active focuses get concentrated sampling on top. Issues carry the focus
   that surfaced them (focusId) — absent means found in full traffic.
   ========================================================================= */

/** One serialized omni-search filter — enough to re-hydrate the real filter
    object from the catalog (filterStore.findEvent) when editing a focus. */
export interface FocusFilterSeed {
  name: string;
  isEvent: boolean;
  autoCaptured?: boolean;
  operator?: string;
  value: string[];
}

export interface Focus {
  id: number;
  name: string;
  /** display name of the creator; `mine` gates edit/delete (anyone toggles) */
  createdBy: string;
  mine: boolean;
  active: boolean;
  /** serialized omni-search query (rebuilt into real filters on edit) */
  seeds: FocusFilterSeed[];
  /** human-readable one-liner of the query, shown in the popover */
  summary: string;
  /** share of daily traffic this query matches (computed at save time) */
  trafficPct: number;
  /** ~sessions analysed per day for this focus */
  sessionsPerDay: number;
  instructions?: string;
}

/** One origin an issue can come from: the full-traffic baseline, or a specific
    focus (by id). Filtering is multi-select, like tag labels — an empty
    selection means "everywhere". */
export type IssueOrigin = 'full' | number;

/* Seeded focuses — one of mine (edit/delete), two from teammates (toggle only).
   Filter names/values match the mock omni-search catalog (dev/mockSessions). */
export const MOCK_FOCUSES: Focus[] = [
  {
    id: 1,
    name: 'Billing & checkout',
    createdBy: 'You',
    mine: true,
    active: true,
    seeds: [
      { name: 'LOCATION', isEvent: true, autoCaptured: true, operator: 'contains', value: ['/checkout'] },
      { name: 'CLICK', isEvent: true, autoCaptured: true, value: ['Place order'] },
    ],
    summary: 'Path contains /checkout · Click "Place order"',
    trafficPct: 2,
    sessionsPerDay: 40,
    instructions:
      'Watch for silent payment failures and anything around coupons or card validation.',
  },
  {
    id: 2,
    name: 'Pricing · France',
    createdBy: 'Mehdi',
    mine: false,
    active: true,
    seeds: [
      { name: 'LOCATION', isEvent: true, autoCaptured: true, operator: 'contains', value: ['/pricing'] },
      { name: 'userCountry', isEvent: false, operator: 'is', value: ['FR'] },
    ],
    summary: 'Path contains /pricing · Country = FR',
    trafficPct: 6,
    sessionsPerDay: 120,
  },
  {
    id: 3,
    name: 'Mobile visitors',
    createdBy: 'Nikita',
    mine: false,
    active: false,
    seeds: [
      { name: 'userDevice', isEvent: false, operator: 'is', value: ['mobile'] },
    ],
    summary: 'Device = mobile',
    trafficPct: 38,
    sessionsPerDay: 760,
  },
];

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

const RAW: Omit<Issue, 'tags' | 'fix'>[] = [
  {
    id: 1,
    head: 'Card declined with no error message at checkout',
    critical: true,
    focusId: 1, // surfaced by the "Billing & checkout" focus
    cat: 'Errors',
    impact: 71,
    seenAgoMin: 3,
    real: 'When the payment processor returns a declined status, the checkout UI swallows the error entirely — no message, no toast, no inline validation. The "Place order" button simply resets to its default state, so the user has no idea whether the charge failed, succeeded, or is still pending. Most retry the exact same card two or three times before giving up, and a meaningful share of them never complete the purchase at all.',
    journey: 'User filled in card details, hit "Place order", saw the spinner end with nothing, retried the same card twice, then abandoned the cart.',
    sessions: [
      { email: 'daniel@black-bird.io', plan: 'paid', browser: 'Chrome', os: 'Mac OS X', loc: 'Frankfurt am Main', dur: '12m1s', variation: 'Order silently failed, retried twice', tags: ['Payment', 'Checkout', 'Error'], journey: 'Filled in card details, hit "Place order", watched the spinner end with nothing, re-entered the same card twice, then left the cart.' },
      { email: 'lucas@finhub.io', plan: 'paid', browser: 'Chrome', os: 'Windows', loc: 'Toronto', dur: '9m12s', variation: 'Bounced back to the form, abandoned', tags: ['Checkout', 'Frustration', 'Drop-off'], journey: 'Reached checkout, submitted payment, got silently bounced back to the form, grew visibly frustrated and abandoned.' },
      { email: 'amara@shopwave.co', plan: 'trial', browser: 'Safari', os: 'iOS', loc: 'Lagos', dur: '6m03s', variation: 'Pay button reset on mobile', tags: ['Payment', 'Drop-off'], journey: 'Tried to pay on her phone, saw the button reset with no message, and gave up after a single attempt.' },
    ],
  },
  {
    id: 2,
    head: '"Place order" button unresponsive on mobile',
    critical: true,
    cat: 'UI/UX',
    impact: 66,
    seenAgoMin: 24,
    real: 'On mobile viewports the primary "Place order" button receives the tap event but never fires its click handler, so the order is never submitted. An overlay element appears to be intercepting the touch, which is why the button looks active but does nothing. Users tap it repeatedly — classic rage-click behaviour — scroll around hunting for an error that never appears, and then abandon the session.',
    journey: 'User reached the checkout step on a phone, tapped "Place order" seven times in a row, scrolled up and back down looking for an error, then left.',
    sessions: [
      { email: 'main@badmanners.gg', plan: 'trial', browser: 'Safari', os: 'iOS', loc: 'Islamabad', dur: '8m7s', variation: 'Tapped seven times, nothing fired', tags: ['Checkout', 'Rage Clicks', 'Frustration'], journey: 'Tapped "Place order" seven times in a row on a phone, nothing fired, scrolled up and down hunting for an error, then quit.' },
      { email: 'priya@meshcart.in', plan: 'free', browser: 'Chrome', os: 'Android', loc: 'Mumbai', dur: '5m44s', variation: 'Looped between cart and checkout', tags: ['Checkout', 'Back-and-Forth'], journey: 'Tapped the order button, looped back to the cart and forward again twice, and never got a response.' },
    ],
  },
  {
    id: 3,
    head: 'Card form rejects a valid expiry date',
    critical: true,
    focusId: 1, // surfaced by the "Billing & checkout" focus
    cat: 'Errors',
    impact: 58,
    seenAgoMin: 52,
    real: 'The expiry-date field rejects correctly formatted future dates (MM/YY) with an "invalid date" validation error, blocking payment submission. The check appears to run on every keystroke rather than on blur, so the field flags itself as invalid mid-entry and never clears. Users re-type the same valid date several different ways, grow frustrated, and abandon the payment step.',
    journey: 'User entered a valid expiry three different ways, each rejected with "invalid date", re-typed slowly, then gave up on the payment step.',
    sessions: [
      { email: 'dev@dosetech.co', plan: 'paid', browser: 'Firefox', os: 'Linux', loc: 'Lahore (Sher Kot)', dur: '9m1s', variation: 'Valid expiry rejected three times', tags: ['Payment', 'Form Completion', 'Error'], journey: 'Entered a valid expiry three different ways, each rejected as "invalid date", re-typed it slowly, then abandoned payment.' },
      { email: 'sofia@oakmont.eu', plan: 'paid', browser: 'Chrome', os: 'Windows', loc: 'Madrid', dur: '7m20s', variation: 'Fought a false validation error', tags: ['Form Completion', 'Data Entry'], journey: 'Corrected the expiry field over and over against a false validation error before giving up on the order.' },
    ],
  },
  {
    id: 4,
    head: 'Checkout page takes 8s to load',
    critical: true,
    cat: 'Slowness',
    impact: 52,
    seenAgoMin: 180,
    real: 'The checkout page takes around eight seconds to become interactive. The order summary and payment fields render well after the rest of the page, so users stare at a half-loaded screen with no clear signal that anything is still loading. Many tab away while they wait, and a portion never return to finish the order — directly bleeding revenue at the most critical step of the funnel.',
    journey: 'User clicked through to checkout, stared at a half-loaded page for several seconds, switched tabs, came back, and a portion of users left before it finished.',
    sessions: [
      { email: 'rajesh+support@acme.com', plan: 'paid', browser: 'Chrome', os: 'Windows', loc: 'Newark', dur: '15m20s', variation: 'Tab-switched while it loaded', tags: ['Checkout', 'Slow Performance'], journey: 'Clicked through to checkout, stared at a half-loaded page, switched tabs while it loaded, and came back several seconds later.' },
      { email: 'elena@brightbox.io', plan: 'trial', browser: 'Chrome', os: 'Mac OS X', loc: 'Berlin', dur: '11m02s', variation: 'Left before fields rendered', tags: ['Slow Performance', 'Drop-off'], journey: 'Waited on the slow checkout, lost patience before the payment fields rendered, and left without ordering.' },
    ],
  },
  {
    id: 5,
    head: 'Users abandon onboarding at the long step-4 form',
    critical: false,
    cat: 'UI/UX',
    impact: 47,
    seenAgoMin: 480,
    real: 'Step 4 of onboarding is a single overwhelming form with 14 required fields presented all at once. Completion drops sharply at this point — users who breezed through the first three steps stall here, hesitate over several inputs, and a large share close the tab without finishing. The sheer length of the form, with no progress indication or grouping, is the clearest driver of the drop-off.',
    journey: 'User progressed smoothly through steps 1–3, hit the long form at step 4, scrolled the whole thing, hesitated on several fields, then closed the tab.',
    sessions: [
      { email: 'muhammad.hadayat@swipbox.com', plan: 'trial', browser: 'Chrome', os: 'Mac OS X', loc: 'Saidpur', dur: '11m31s', variation: 'Stalled on the 14-field form', tags: ['Onboarding', 'Form Completion', 'Hesitation'], journey: 'Breezed through steps 1–3, hit the 14-field form at step 4, hesitated on several inputs, then closed the tab.' },
      { email: 'tom@layerlabs.dev', plan: 'trial', browser: 'Firefox', os: 'Windows', loc: 'Austin', dur: '8m49s', variation: 'Never started the long form', tags: ['Onboarding', 'Drop-off'], journey: 'Scrolled the long step-4 form top to bottom, never started filling it, and abandoned onboarding.' },
    ],
  },
  {
    id: 6,
    head: 'Product images slow to load on the listing grid',
    critical: false,
    cat: 'Slowness',
    impact: 39,
    seenAgoMin: 1320,
    real: 'Product thumbnails on the category listing take several seconds to appear, loading one at a time as the user scrolls instead of being reserved and lazy-loaded. On first paint the grid is a wall of empty placeholders, so it reads as broken rather than loading. Users pause, scroll past the gaps, and often scroll back up once the images finally trickle in — a janky first impression on a page meant to drive browsing.',
    journey: 'User opened a category, scrolled a grid of empty image placeholders, paused waiting for thumbnails, and scrolled back up once they finally loaded.',
    sessions: [
      { email: 'apps@vfairs.com', plan: 'free', browser: 'Chrome', os: 'Windows', loc: 'Poznan', dur: '7m55s', variation: 'Scrolled past empty placeholders', tags: ['Navigation', 'Slow Performance'], journey: 'Opened a category, scrolled a grid of empty placeholders, waited, then scrolled back up once the thumbnails finally loaded.' },
      { email: 'kenji@miraisoft.jp', plan: 'paid', browser: 'Safari', os: 'Mac OS X', loc: 'Osaka', dur: '6m10s', variation: 'Images trickled in one by one', tags: ['Search', 'Slow Performance'], journey: 'Searched the listing, watched images trickle in one by one, and paused before interacting with the grid.' },
    ],
  },
  {
    id: 7,
    head: 'Search spinner never resolves',
    critical: false,
    cat: 'Errors',
    impact: 35,
    seenAgoMin: 2880,
    real: 'The search request fails silently at the network layer — there is no timeout and no error state, so the results spinner keeps spinning indefinitely. Users wait, clear the query and retry a couple of times, and eventually give up and try to navigate to the category by hand. Because nothing ever surfaces the failure, it looks to the user like the product simply does not work.',
    journey: 'User typed a query, waited on the spinner, cleared and retried twice, then tried navigating to the category manually instead.',
    sessions: [
      { email: 'mehdi+new@openreplay.cloud', plan: 'paid', browser: 'Firefox', os: 'Mac OS X', loc: 'Schieren', dur: '10m26s', variation: 'Spinner hung, browsed manually', tags: ['Search', 'Error'], journey: 'Typed a query, watched the spinner hang, cleared and retried twice, then tried browsing to the category by hand instead.' },
      { email: 'hana@coralpay.io', plan: 'trial', browser: 'Chrome', os: 'Windows', loc: 'Seoul', dur: '6m38s', variation: 'Filter spinner never resolved', tags: ['Filtering', 'Frustration'], journey: 'Applied a filter, hit a spinner that never resolved, retried it a few times and grew frustrated before leaving.' },
    ],
  },
  {
    id: 8,
    head: 'Filters reset when moving to the next page',
    critical: false,
    cat: 'UI/UX',
    impact: 30,
    seenAgoMin: 5760,
    real: 'Active filter chips are silently dropped the moment the user paginates, so page 2 onward shows unfiltered results while the controls still imply the filters are applied. The filter state lives only in component memory and is not persisted to the URL or query, so any navigation resets it. Users re-apply the same filters repeatedly, page back and forth, and lose trust that the listing reflects what they asked for.',
    journey: 'User applied two filters, reviewed page 1, clicked to page 2, saw the filters gone and results changed, went back and re-applied them repeatedly.',
    sessions: [
      { email: 'apps@vfairs.com', plan: 'free', browser: 'Chrome', os: 'Windows', loc: 'Nong Sung', dur: '9m20s', variation: 'Filters cleared on page 2', tags: ['Filtering', 'Lost Filters'], journey: 'Set two filters, reviewed page 1, clicked to page 2 and found them silently cleared, then re-applied them repeatedly.' },
      { email: 'omar@gridly.io', plan: 'paid', browser: 'Chrome', os: 'Linux', loc: 'Cairo', dur: '7m02s', variation: 'Lost filters paging back and forth', tags: ['Search', 'Back-and-Forth'], journey: 'Filtered the results, paged forward and back, lost the filters each time, and eventually gave up.' },
    ],
  },
  {
    id: 9,
    head: 'Footer "Help Center" link 404s',
    critical: false,
    cat: 'UI/UX',
    impact: 22,
    seenAgoMin: 8640,
    real: 'The "Help Center" link in the footer points to a dead URL and returns a 404. Users who are already stuck and actively seeking help hit a wall at the exact moment they need support most. There is no redirect or monitoring in place, so the broken link has likely been failing silently for a while, quietly pushing frustrated users toward churn instead of resolution.',
    journey: 'User scrolled to the footer, clicked "Help Center", landed on a 404 page, hit back, and tried the contact link instead.',
    sessions: [
      { email: 'daniel@black-bird.io', plan: 'paid', browser: 'Chrome', os: 'Mac OS X', loc: 'Thung Khru', dur: '5m44s', variation: 'Help Center link 404’d', tags: ['Navigation', 'Help Seeking'], journey: 'Scrolled to the footer, clicked "Help Center", landed on a 404, hit back, and tried the contact link instead.' },
      { email: 'greta@nordkit.se', plan: 'free', browser: 'Firefox', os: 'Windows', loc: 'Stockholm', dur: '4m12s', variation: 'Hit a dead support page', tags: ['Help Seeking', 'Error'], journey: 'Went looking for support, clicked the footer Help Center link, hit the dead 404 page, and abandoned the attempt.' },
    ],
  },
  {
    id: 10,
    head: 'Dashboard charts take 5s to render',
    critical: false,
    cat: 'Slowness',
    impact: 18,
    seenAgoMin: 12960,
    real: 'The account dashboard charts take around five seconds to fetch and draw after the page shell loads, leaving every panel blank in the meantime. With no skeletons or loading states, returning users land on what looks like an empty, broken dashboard. The data eventually appears, but the dead first impression makes the product feel slow and unreliable on the page users see most often.',
    journey: 'User opened the dashboard, waited on blank chart panels, moved the cursor around expecting data, and continued once the charts appeared.',
    sessions: [
      { email: 'rajesh+support@acme.com', plan: 'trial', browser: 'Chrome', os: 'Linux', loc: 'Lahore (Sher Kot)', dur: '6m32s', variation: 'Waited on blank chart panels', tags: ['Navigation', 'Slow Performance'], journey: 'Opened the dashboard, waited on blank chart panels, moved the cursor around expecting data, and carried on once it drew.' },
      { email: 'bea@finchly.com', plan: 'paid', browser: 'Chrome', os: 'Mac OS X', loc: 'Lisbon', dur: '5m18s', variation: 'Sat through an empty dashboard', tags: ['Navigation'], journey: 'Landed on the dashboard and sat through several seconds of empty panels before the charts finally appeared.' },
    ],
  },
  {
    id: 11,
    head: 'Quick bounce off the pricing page',
    critical: false,
    focusId: 2, // surfaced by the "Pricing · France" focus
    cat: 'UI/UX',
    impact: 12,
    seenAgoMin: 20160,
    real: 'A noticeable share of sessions land on the pricing page from ads and leave within a few seconds with no scroll and no click. The instant bounce suggests the above-the-fold content is not matching the intent the ad set up — the value proposition or the plan they expected is not immediately visible. These are paid arrivals leaving before they engage at all, so the wasted acquisition spend compounds the lost conversions.',
    journey: 'User landed on pricing from an ad, stayed under ten seconds without scrolling or interacting, and closed the tab.',
    sessions: [
      { email: 'visitor@gmail.com', plan: 'free', browser: 'Chrome', os: 'Windows', loc: 'Manila', dur: '8s', variation: 'Bounced in under ten seconds', tags: ['Bounce', 'Inactive'], journey: 'Landed on pricing from an ad, stayed under ten seconds without scrolling or clicking, and closed the tab.' },
      { email: 'guest@yahoo.com', plan: 'free', browser: 'Safari', os: 'iOS', loc: 'Jakarta', dur: '6s', variation: 'Left pricing without scrolling', tags: ['Navigation', 'Bounce'], journey: 'Arrived on the pricing page from a link, did not scroll or interact at all, and bounced within seconds.' },
    ],
  },
];

/* Link each issue to real sessions in the shared pool (app/dev/mockSessions).
   These are the SAME entities the Sessions page lists — the issue's example
   sessions and the sessions list now reference one source of truth. */
const ISSUE_SESSION_IDS: Record<number, string[]> = {
  1: ['sess_1001', 'sess_1002', 'sess_1003'],
  2: ['sess_1004', 'sess_1005'],
  3: ['sess_1009', 'sess_1020'],
  4: ['sess_1002', 'sess_1015'],
  5: ['sess_1013', 'sess_1014'],
  6: ['sess_1016', 'sess_1011'],
  7: ['sess_1006', 'sess_1018'],
  8: ['sess_1012', 'sess_1019'],
  9: ['sess_1021', 'sess_1010'],
  10: ['sess_1012', 'sess_1019'],
  11: ['sess_1010', 'sess_1021'],
};

/* Suggested fix / resolution per issue — paired with `real` in the detail-page
   diagnosis (The problem / Suggested fix). */
const ISSUE_FIX: Record<number, string> = {
  1: 'Surface the decline reason inline and keep the user on the payment step, instead of silently resetting the “Place order” button.',
  2: 'Bind the tap handler to the button on mobile (check the overlay/z-index intercepting taps) and show a pressed state so the action registers.',
  3: 'Fix the expiry validation to accept correctly formatted future MM/YY dates, and validate on blur rather than per keystroke.',
  4: 'Defer non-critical work and prioritize the order summary + payment fields so checkout is interactive in under ~2s.',
  5: 'Split step 4 into smaller grouped steps (or progressively disclose fields) and trim the required set to reduce drop-off.',
  6: 'Reserve image space and lazy-load thumbnails with low-res placeholders so the grid never looks broken on first paint.',
  7: 'Add a timeout + error state to the search request and let the user retry, instead of an indefinite spinner.',
  8: 'Persist active filters in the URL/query so they survive pagination instead of resetting on page change.',
  9: 'Point the footer “Help Center” link to the live support URL and add a redirect/monitor to catch future 404s.',
  10: 'Render the dashboard shell immediately with skeleton panels and stream chart data, or cache the last result.',
  11: 'Match the pricing page to ad intent above the fold and test a clearer value prop to reduce instant bounces.',
};

const ISSUES: Issue[] = RAW.map((r) => ({
  ...r,
  tags: [...new Set(r.sessions.flatMap((s) => s.tags))],
  sessionIds: ISSUE_SESSION_IDS[r.id] ?? [],
  fix: ISSUE_FIX[r.id] ?? '',
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
  dismissTags: Record<number, string[]> = {};
  // per-issue override of the authored `critical` flag (Gmail-style toggle)
  criticalOverride: Record<number, boolean> = {};
  criticalReasons: Record<number, string> = {};

  // ---- focus (portions of traffic the agent concentrates on) ----
  focuses: Focus[] = MOCK_FOCUSES;
  /** "found in" filter — lives in the Tags dropdown next to the labels, because
      origin is an ATTRIBUTE of an issue (Display only shapes visibility).
      Multi-select; empty = everywhere. */
  origins: IssueOrigin[] = [];

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

  /** Apply per-issue user overrides (rename + critical toggle) to a raw issue. */
  decorate = (i: Issue): Issue => {
    const head = this.names[i.id] ?? i.head;
    const critical =
      i.id in this.criticalOverride ? this.criticalOverride[i.id] : i.critical;
    return head === i.head && critical === i.critical
      ? i
      : { ...i, head, critical };
  };

  get list(): Issue[] {
    let l = this.all.map(this.decorate);
    if (!this.showHidden) l = l.filter((i) => !this.hidden.includes(i.id));
    if (this.cats.length) l = l.filter((i) => this.cats.includes(i.cat));
    if (this.labels.length)
      l = l.filter((i) =>
        this.match === 'any'
          ? this.labels.some((t) => i.tags.includes(t))
          : this.labels.every((t) => i.tags.includes(t)),
      );
    if (this.critOnly) l = l.filter((i) => i.critical);
    if (this.origins.length)
      l = l.filter((i) =>
        i.focusId != null
          ? this.origins.includes(i.focusId)
          : this.origins.includes('full'),
      );
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
    return this.decorate(i);
  }

  /** Mock total of sessions matching a journey search on this issue — the
      example cards are a small sample of this larger set. Deterministic and
      scaled off impact so bigger issues report bigger matched populations. */
  journeyMatchTotal(issue: Issue): number {
    return issue.impact * 7 + ((issue.id * 13) % 29);
  }

  /** Example-session cards for the issue detail page, resolved from the shared
      session pool (same entities as the Sessions page). Falls back to the
      issue-authored summaries if no pool ids are mapped. */
  exampleSessions(issue: Issue): IssueSessionCard[] {
    // The curated ids come first; we then top up from the shared pool so the detail
    // page can "load more" / "refresh" through a bigger sample (the only count shown
    // is the quiet matched-sessions total, see journeyMatchTotal).
    const curated = issue.sessionIds ?? [];
    const extra = MOCK_SESSION_POOL.map((s) => s.sessionId).filter(
      (id) => !curated.includes(id),
    );
    const orderedIds = [...curated, ...extra].slice(0, 12);
    const fromPool = orderedIds
      .map((id, i) => {
        const s = getMockSessionById(id);
        if (!s) return null;
        // narrative (tags + journey) is issue-authored, cycled so every card has one
        const authored = issue.sessions.length
          ? issue.sessions[i % issue.sessions.length]
          : undefined;
        return {
          sessionId: s.sessionId,
          email: s.userId,
          browser: s.userBrowser,
          os: s.userOs,
          city: s.userCity,
          country: s.userCountry,
          loc: s.userCity || s.userCountry,
          durMs: s.duration,
          dur: fmtDuration(s.duration),
          date: new Date(s.startTs).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          device: s.userDeviceType,
          events: s.eventsCount ?? 0,
          plan: s.metadata?.plan ?? '',
          tags: authored?.tags ?? [],
          journey: authored?.journey ?? '',
          variation: authored?.variation ?? '',
        };
      })
      .filter((s): s is IssueSessionCard => Boolean(s));
    if (fromPool.length) return fromPool;
    return issue.sessions.map((s, i) => ({
      sessionId: `${issue.id}-${i}`,
      email: s.email,
      browser: s.browser,
      os: s.os,
      city: s.loc,
      country: '',
      loc: s.loc,
      durMs: 0,
      dur: s.dur,
      date: '',
      device: 'desktop',
      events: 0,
      plan: s.plan,
      tags: s.tags,
      journey: s.journey,
      variation: s.variation,
    }));
  }

  // ---- actions ----
  setQ = (q: string) => { this.q = q; };
  setSort = (s: SortMode) => { this.sort = s; };
  setMatch = (m: MatchMode) => { this.match = m; };
  setCats = (c: CategoryName[]) => { this.cats = c; };
  setLabels = (l: string[]) => { this.labels = l; };
  toggleLabel = (t: string) => {
    this.labels = this.labels.includes(t)
      ? this.labels.filter((x) => x !== t)
      : [...this.labels, t];
  };
  setCritOnly = (v: boolean) => { this.critOnly = v; };
  setShowHidden = (v: boolean) => { this.showHidden = v; };

  // ---- focus ----
  get activeFocusCount(): number {
    return this.focuses.filter((f) => f.active).length;
  }

  focusById(id?: number): Focus | undefined {
    return id == null ? undefined : this.focuses.find((f) => f.id === id);
  }

  toggleOrigin = (o: IssueOrigin) => {
    this.origins = this.origins.includes(o)
      ? this.origins.filter((x) => x !== o)
      : [...this.origins, o];
  };

  clearOrigins = () => { this.origins = []; };

  /** anyone can toggle any focus — it's the project's shared analysis budget */
  toggleFocus = (id: number, active: boolean) => {
    this.focuses = this.focuses.map((f) => (f.id === id ? { ...f, active } : f));
  };

  /** create (no id) or update (id) — editing is gated to `mine` in the UI */
  saveFocus = (
    focus: Omit<Focus, 'id' | 'createdBy' | 'mine'> & { id?: number },
  ) => {
    if (focus.id != null) {
      this.focuses = this.focuses.map((f) =>
        f.id === focus.id
          ? { ...f, ...focus, id: f.id, createdBy: f.createdBy, mine: f.mine }
          : f,
      );
    } else {
      const id = Math.max(0, ...this.focuses.map((f) => f.id)) + 1;
      this.focuses = [
        { ...focus, id, createdBy: 'You', mine: true },
        ...this.focuses,
      ];
    }
  };

  deleteFocus = (id: number) => {
    this.focuses = this.focuses.filter((f) => f.id !== id);
    this.origins = this.origins.filter((o) => o !== id);
  };
  rename = (id: number, name: string) => { this.names[id] = name; };
  hide = (id: number, reason: string, tags: string[] = []) => {
    if (!this.hidden.includes(id)) this.hidden.push(id);
    this.dismissReasons[id] = reason;
    this.dismissTags[id] = tags;
  };
  unhide = (id: number) => {
    this.hidden = this.hidden.filter((x) => x !== id);
    delete this.dismissReasons[id];
    delete this.dismissTags[id];
  };
  /** Toggle the critical flag. Marking is instant; unmarking carries an optional
      reason so the agent can learn what wasn't actually critical. */
  setCritical = (id: number, val: boolean, reason = '') => {
    this.criticalOverride[id] = val;
    if (val) delete this.criticalReasons[id];
    else this.criticalReasons[id] = reason;
  };
}
