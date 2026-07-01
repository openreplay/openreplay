import { type RawIssue, type RawIssueSession } from './api';
import {
  CAT_ORDER,
  type CategoryName,
  type Issue,
  type IssueSessionCard,
  fmtDate,
  fmtDuration,
} from './shared/model';

/* Factories mapping raw /v2/smart-issues payloads to our view-model shapes.
   Categories are still derived locally from label ratios (the backend has no
   explicit per-issue category); `fix` (suggested fix) is the only field the
   contract still doesn't provide — see TODO.md. */

/* The backend's critical label is a real issue label whose stored name contains
   "critical" (e.g. "Critical") — match by substring, case-insensitive. */
export const isCriticalLabel = (name: string) =>
  name.toLowerCase().includes('critical');

const CATEGORY_SET = new Set<string>(CAT_ORDER);
/* A category label counts as a real membership above this ratio — an issue can
   belong to several categories at once (e.g. UI/UX 99 + Errors 56). */
const CATEGORY_RATIO_MIN = 25;

/* Until the backend sends explicit categories, derive them locally from the
   issueLabels ratios for the three fixed categories (Errors/UI/UX/Slowness). */
function dominantCategory(
  labels: { name: string; ratio: number }[],
): CategoryName | undefined {
  const cats = labels.filter((l) => CATEGORY_SET.has(l.name));
  if (!cats.length) return undefined;
  return cats.reduce((a, b) => (b.ratio > a.ratio ? b : a))
    .name as CategoryName;
}

function memberCategories(
  labels: { name: string; ratio: number }[],
): CategoryName[] {
  return labels
    .filter((l) => CATEGORY_SET.has(l.name) && l.ratio > CATEGORY_RATIO_MIN)
    .map((l) => l.name as CategoryName);
}

/** RawIssue (POST /smart-issues/{projectId}, GET …/issue) -> Issue */
export function makeIssue(d: RawIssue): Issue {
  const lastSeen = d.lastSeen ?? null;
  return {
    // identity — issueName is the stable key the backend keys on
    id: d.issueName,
    head: d.issueName,
    impact: d.impact ?? 0,
    // critical is the server's own flag — not inferred from labels
    critical: Boolean(d.critical),
    hidden: Boolean(d.hidden),
    tags: (d.issueLabels ?? [])
      .map((l) => l.name)
      .filter((n) => !isCriticalLabel(n)),
    journeyLabels: (d.journeyLabels ?? []).map((l) => l.name),
    // derived locally from label ratios (see dominantCategory/memberCategories);
    // replace with server-provided categories when available
    cat: dominantCategory(d.issueLabels ?? []),
    categories: memberCategories(d.issueLabels ?? []),

    impactedSessions: d.impactedSessions ?? 0,
    count: d.count ?? 0,
    firstSeen: d.firstSeen ?? null,
    lastSeen,
    seenAgoMin: lastSeen ? Math.max(0, (Date.now() - lastSeen) / 60000) : null,

    // issueDescription only rides along on GET …/issue; empty in list items
    problem: d.issueDescription ?? '',
    fix: '' /* WAITING BACKEND: suggested fix / resolution */,
  };
}

/** RawIssueSession (POST /smart-issues/{projectId}/search) -> IssueSessionCard */
export function makeIssueSessionCard(s: RawIssueSession): IssueSessionCard {
  const ts = s.startTs ?? null;
  return {
    sessionId: s.sessionId,
    date: fmtDate(ts),
    email: s.userId ?? '',
    browser: s.userBrowser ?? '',
    os: s.userOs ?? '',
    device: s.userDeviceType ?? 'desktop',
    country: s.userCountry ?? '',
    city: s.userCity ?? '',
    loc: s.userCity || s.userCountry || '',
    durMs: s.duration ?? 0,
    dur: fmtDuration(s.duration ?? 0),
    events: s.eventsCount ?? 0,
    // the session metadata bag is free-form; "plan" may or may not be present
    plan: (s.metadata && (s.metadata as any).plan) ?? '',
    journey: s.journey ?? '',
    // /search returns journeyLabels as plain strings; tolerate { name } too
    tags: (s.journeyLabels ?? [])
      .map((l) => (typeof l === 'string' ? l : l?.name))
      .filter((n): n is string => Boolean(n)),
    // backend returns a per-session description; the redesign wants a short
    // "variation" headline — we fall back to the description until one exists
    variation:
      s.description ??
      s.journey ??
      '' /* WAITING BACKEND: short per-session variation headline */,
    issueTimestamp: s.issueTimestamp ?? null,
  };
}
