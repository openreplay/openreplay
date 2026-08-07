import {
  type RawIssue,
  type RawIssueSession,
  type RawLabelRatio,
  type SessionJourney,
} from './api';
import {
  CAT_ORDER,
  type CategoryName,
  type Issue,
  type IssueSessionCard,
  fmtDate,
  fmtDuration,
} from './shared/model';

/* Factories mapping raw /v2/smart-issues payloads to view-model shapes.
   `fix` (suggested fix) is the only field the contract doesn't provide yet. */

/* The backend's critical label is a real issue label whose stored name contains
   "critical" — match by substring, case-insensitive. */
export const isCriticalLabel = (name: string) =>
  name.toLowerCase().includes('critical');

const CAT_SET = new Set<string>(CAT_ORDER);
const asCategories = (v?: string[]): CategoryName[] =>
  (v ?? []).filter((c): c is CategoryName => CAT_SET.has(c));

/* Labels carry a `ratio` — the share of the issue's sessions they apply to
   (0-100). Below this floor a label describes a minority variation, not the
   issue, so drop it; keep only labels that hold for most sessions. */
const LABEL_RATIO_MIN = 70;
const strongLabels = (labels?: RawLabelRatio[]): string[] =>
  (labels ?? [])
    .filter((l) => (l.ratio ?? 0) >= LABEL_RATIO_MIN)
    .map((l) => l.name);

/** RawIssue (POST /smart-issues/{projectId}, GET …/issue) -> Issue */
export function makeIssue(d: RawIssue): Issue {
  const lastSeen = d.lastSeen ?? null;
  const categories = asCategories(d.categories);
  return {
    // identity — issueId is the stable UUID; issueName is display only
    id: d.issueId,
    head: d.issueName,
    impact: d.impact ?? 0,
    // critical is the server's own flag — not inferred from labels
    critical: Boolean(d.critical),
    // which critical-definitions the server says flagged this issue
    criticalBy: d.criticalBy ?? [],
    hidden: Boolean(d.hidden),
    deleted: Boolean(d.deleted),
    deletedAt: d.deletedAt ?? null,
    tags: strongLabels(d.issueLabels).filter((n) => !isCriticalLabel(n)),
    journeyLabels: strongLabels(d.journeyLabels),
    // server-assigned category; `cat` is the dominant one for the column/avatar
    cat: (CAT_SET.has(d.category ?? '') ? d.category : categories[0]) as
      | CategoryName
      | undefined,
    categories,

    segmentIds: d.segmentIds ?? [],
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
    // the one-line journey summary is the variation headline; fall back to the
    // longer description/journey when a session has no summary
    variation: s.journeySummary || s.description || s.journey || '',
    issueTimestamp: s.issueTimestamp ?? null,
    thumbnail: s.thumbnail,
    journeySteps: (s.journeySteps ?? []).map((st) => ({
      name: st.name,
      relativeTimestamp: st.relativeTimestamp,
    })),
  };
}

/** SessionJourney (GET …/session/{id}/journey) -> a card carrying only the
    journey fields, for the player fallback when the session isn't in the
    /search sample. Replay metadata + the issue-moment seek aren't available
    here — the player fills metadata from the loaded session, and there's no
    issueTimestamp to seek to. */
export function makeJourneyCard(j: SessionJourney): IssueSessionCard {
  return {
    sessionId: String(j.sessionId),
    date: '',
    email: '',
    browser: '',
    os: '',
    device: 'desktop',
    country: '',
    city: '',
    loc: '',
    durMs: 0,
    dur: '',
    events: 0,
    plan: '',
    journey: j.journey ?? '',
    tags: j.journeyLabels ?? [],
    variation: j.journeySummary || j.journey || '',
    issueTimestamp: null,
    thumbnail: undefined,
    journeySteps: (j.journeySteps ?? []).map((st) => ({
      name: st.name,
      relativeTimestamp: st.relativeTimestamp,
    })),
  };
}
