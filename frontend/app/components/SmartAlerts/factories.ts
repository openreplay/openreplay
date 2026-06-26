import { type RawIssue, type RawIssueSession } from './api';
import {
  CAT_ORDER,
  type CategoryName,
  type Issue,
  type IssueSessionCard,
  fmtDuration,
} from './shared/model';

/* Factories that map raw backend payloads to our view-model shapes. Every field
   the backend does not return yet is given a safe default and tagged with a
   WAITING BACKEND marker so the gaps are greppable (see TODO.md). */

export const isCriticalLabel = (name: string) =>
  name.toLowerCase() === 'critical';

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
  return cats.reduce((a, b) => (b.ratio > a.ratio ? b : a)).name as CategoryName;
}

function memberCategories(
  labels: { name: string; ratio: number }[],
): CategoryName[] {
  return labels
    .filter((l) => CATEGORY_SET.has(l.name) && l.ratio > CATEGORY_RATIO_MIN)
    .map((l) => l.name as CategoryName);
}

/** RawIssue (POST /kai/:projectId/smart_alerts) -> Issue */
export function makeIssue(d: RawIssue): Issue {
  return {
    // identity — issueName is the only stable key the backend exposes today
    id: d.issueName,
    head: d.issueName,
    impact: d.impact ?? 0,
    // critical is inferred from the presence of a "critical" label
    critical: d.issueLabels.some((l) => isCriticalLabel(l.name)),
    tags: d.issueLabels.map((l) => l.name).filter((n) => !isCriticalLabel(n)),
    journeyLabels: d.journeyLabels.map((l) => l.name),
    // derived locally from label ratios (see dominantCategory/memberCategories);
    // replace with server-provided categories when available
    cat: dominantCategory(d.issueLabels),
    categories: memberCategories(d.issueLabels),

    real: '' /* WAITING BACKEND: issue-level problem description */,
    fix: '' /* WAITING BACKEND: suggested fix / resolution */,
    seenAgoMin:
      null /* WAITING BACKEND: minutes since the issue was last seen */,
  };
}

/** RawIssueSession (POST /kai/:projectId/smart_alerts/search) -> IssueSessionCard */
export function makeIssueSessionCard(s: RawIssueSession): IssueSessionCard {
  const ts = s.startTs ?? s.timestamp ?? null;
  return {
    sessionId: s.sessionId,
    email: s.userId ?? '',
    browser: s.userBrowser ?? '',
    os: s.userOs ?? '',
    device: s.userDeviceType ?? 'desktop',
    country: s.userCountry ?? '',
    city: s.userCity ?? '',
    loc: s.userCity || s.userCountry || '',
    durMs: s.duration ?? 0,
    dur: fmtDuration(s.duration ?? 0),
    date: ts
      ? new Date(ts).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '',
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
