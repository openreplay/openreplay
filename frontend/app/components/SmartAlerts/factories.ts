import { type RawIssue, type RawIssueSession } from './api';
import { type Issue, type IssueSessionCard, fmtDuration } from './shared/model';

/* Factories that map raw backend payloads to our view-model shapes. Every field
   the backend does not return yet is given a safe default and tagged with a
   WAITING BACKEND marker so the gaps are greppable (see TODO.md). */

export const isCriticalLabel = (name: string) =>
  name.toLowerCase() === 'critical';

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

    cat: undefined /* WAITING BACKEND: issue category (Errors | UI/UX | Slowness) */,
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
    tags: (s.journeyLabels ?? []).map((l) => l.name),
    // backend returns a per-session description; the redesign wants a short
    // "variation" headline — we fall back to the description until one exists
    variation:
      s.description ??
      s.journey ??
      '' /* WAITING BACKEND: short per-session variation headline */,
    issueTimestamp: s.issueTimestamp ?? null,
  };
}
