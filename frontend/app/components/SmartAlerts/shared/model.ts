import { CircleX, Gauge, MousePointerClick } from 'lucide-react';
import React from 'react';

export type CategoryName = 'Errors' | 'UI/UX' | 'Slowness';
export type MatchMode = 'all' | 'any';
/** server-backed sort keys (see api.yaml IssuesListRequest.sortBy) */
export type SortMode = 'impact' | 'count' | 'recency' | 'firstSeen';
export type ImpactLevel = 'High' | 'Medium' | 'Low';

export interface Issue {
  id: string;
  head: string;
  critical: boolean;
  /** server-persisted hidden flag (surfaced when viewing hidden/all) */
  hidden: boolean;
  impact: number;
  tags: string[];
  /** journey-level labels, kept distinct from issue tags for the detail page */
  journeyLabels: string[];
  /** dominant category (highest-ratio label) — the single value shown in the
      column/avatar */
  cat?: CategoryName;
  /** every category the issue is significant in (label ratio over threshold) —
      drives the category tab filter + counts (an issue can be in several) */
  categories: CategoryName[];
  /** distinct sessions affected within the window (impact% is derived from this) */
  impactedSessions: number;
  /** total occurrences within the window */
  count: number;
  /** epoch-ms of the earliest / most recent occurrence within the window */
  firstSeen: number | null;
  lastSeen: number | null;
  /** minutes since `lastSeen`, derived for the relative "last seen" labels */
  seenAgoMin: number | null;
  /** which segment surfaced this issue (NOT-YET-BACKED) — absent = full traffic */
  segmentId?: string;
  /** issue-level problem text — only populated from GET …/issue (detail/player) */
  problem: string;
  /** suggested fix — still not provided by the backend (see TODO.md); the UI
      hides the "Suggested fix" section until it lands */
  fix: string;
}

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
  /** ms offset the issue was detected at, used to seek the player */
  issueTimestamp: number | null;
}

export const CAT_ORDER: CategoryName[] = ['Errors', 'UI/UX', 'Slowness'];

/* Autocomplete hints for the natural-language journey search on the issue
   detail page. Suggestions only — the typed text is what's sent to the search. */
export const JOURNEY_SEARCH_SUGGESTIONS = [
  'users who add to cart then abandon at checkout',
  'users who hit "Place order" and watch the spinner end with nothing',
  'users who tap the order button repeatedly with no response',
  'users whose valid card expiry gets rejected as invalid',
  'users who leave before the payment fields render',
  'users who abandon the long onboarding form',
  'users who scroll past empty image placeholders',
  'users who retry a search after the spinner hangs',
  'users who lose their filters when moving to the next page',
  'users who wait on blank dashboard charts',
];

/* Uniform teal used for the category avatar/icon (matches the `tealx` token in
   app/theme/colors.js). The per-category CAT_COLOR below is only the tab-highlight. */
export const CAT_AVATAR_COLOR = 'var(--color-tealx)';

/* The issue player renders as a `fixed inset-0` overlay above the whole app, so
   it needs an extreme z-index. The overlay container sits just below the popup
   layer, so its own popovers/tooltips/dropdowns (which carry PLAYER_POPUP_Z)
   always stack above the player chrome. */
export const PLAYER_OVERLAY_Z = 2147483000;
export const PLAYER_POPUP_Z = 2147483647;

export const HIDE_REASONS = [
  'Not a real issue',
  'Already fixed',
  'Expected behavior',
  'Duplicate',
  'Low priority',
];

export const CRITICAL_REASONS = [
  'Not actually critical',
  'Already resolved',
  'Acceptable risk',
  'Low user impact',
];

export const CAT_ICON: Record<
  CategoryName,
  React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    style?: React.CSSProperties;
    className?: string;
  }>
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
  if (minAgo < 7 * MIN_PER_DAY)
    return `${Math.round(minAgo / MIN_PER_DAY)}d ago`;
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

export function fmtDuration(ms: number): string {
  const totalSec = Math.max(1, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m ? `${m}m${s}s` : `${s}s`;
}

/** Display label for a server reason key: snake_case → sentence case
    (e.g. "not_a_real_issue" → "Not a real issue"). The original key is kept as
    the value and sent back to the server; only the label is humanized. */
export function humanizeReason(reason: string): string {
  const words = reason.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : '';
}

/** "Jun 26, 2026" — the standard session date label; empty when no timestamp. */
export function fmtDate(ts: number | null | undefined): string {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
