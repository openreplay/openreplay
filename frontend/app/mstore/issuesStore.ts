import { makeAutoObservable, runInAction } from 'mobx';

import {
  type Segment,
  deleteSegment as apiDeleteSegment,
  createSegment,
  fetchSegments as fetchDmSegments,
  updateSegment,
} from 'App/components/DataManagement/Segments/api';
import {
  type CaptureMode,
  type IssueOrigin,
  type LabelsMatch,
  type Reasons,
  type SavedSegment,
  type SegmentCaptureState,
  type SortDir,
  type Visibility,
  setCaptureMode as apiSetCaptureMode,
  deleteIssue,
  getIssue,
  getIssueSessions,
  getIssues,
  getLabels,
  getReasons,
  getSegmentCapture,
  hideIssue,
  renameIssue,
  restoreIssue,
  setSegmentCapture,
  unhideIssue,
} from 'App/components/SmartAlerts/api';
import {
  makeIssue,
  makeIssueSessionCard,
} from 'App/components/SmartAlerts/factories';
import { summarize } from 'App/components/SmartAlerts/segments/segmentUtils';
import {
  CAT_ORDER,
  type CategoryName,
  type Issue,
  type IssueSessionCard,
  type MatchMode,
  type SortMode,
} from 'App/components/SmartAlerts/shared/model';
import { filterStore, userStore } from 'App/mstore';
import type FilterItem from 'App/mstore/types/filterItem';

/* Critical is a DESCRIBED RULE, not a per-issue flag (§14, Mehdi 07-28/29):
   the customer writes what "critical" means to them, one description per line,
   each carrying its author; the agent flags issues that match. So criticality
   in the UI is always DERIVED (matchedRules) — every control is an explanation
   or a way to author a description.

   NOT-YET-BACKED on this branch: the definitions + per-issue attribution
   (`criticalBy`) + per-user `notCritical` are client-side only (no endpoints —
   see TODO). The server still returns a per-issue `critical` boolean (the
   agent's own flag); we treat that as one anonymous "agent" match so flagged
   issues keep reading as critical until real attribution lands. */
export type CriticalRule = {
  id: number;
  description: string;
  createdBy: string;
  /** description authored by the current user (drives "Critical to me") */
  mine: boolean;
};

export type JourneyTag = { name: string; description: string };

/* The agent's own flag (server `critical`) shown as a rule when no user
   description is attached yet — so a server-flagged issue still reads critical. */
const AGENT_RULE: CriticalRule = {
  id: 0,
  description: 'Detected by the agent',
  createdBy: 'the agent',
  mine: false,
};

/* Seed journey tags (Mehdi 07-28): editable state, not a constant — the
   customer can rename/remove them like any custom tag. */
export const PREDEFINED_JOURNEY_TAGS: JourneyTag[] = [
  {
    name: 'Navigation',
    description:
      'The user browses across pages or sections without a transactional goal.',
  },
  {
    name: 'Onboarding',
    description:
      'First-run steps: signup, initial setup, tutorials or welcome flows.',
  },
  {
    name: 'Checkout',
    description:
      'The user moves through a cart or order flow toward placing an order.',
  },
  {
    name: 'Payment',
    description:
      'Entering or confirming payment details, or completing a charge.',
  },
  {
    name: 'Form submission',
    description: 'Filling and submitting any form, including multi-step ones.',
  },
  {
    name: 'Workflow completed',
    description: 'A multi-step task reaches its intended end state.',
  },
  {
    name: 'Drop off',
    description: 'The user abandons a flow before reaching its end state.',
  },
  {
    name: 'Back and forth',
    description:
      'Repeated switching between the same pages or steps, suggesting hesitation.',
  },
  {
    name: 'Error encountered',
    description:
      'The session hits a visible error state, message or broken page.',
  },
  {
    name: 'Frustration',
    description:
      'Rage clicks, dead clicks or rapid repeated actions on the same element.',
  },
];

/* Store behind the AI Issues surface. Issues + example sessions come from the
   /v2/smart-issues Go endpoints (see SmartAlerts/api.ts + api.yaml), mapped
   through SmartAlerts/factories. Filtering, sorting and pagination are all
   server-side: changing a filter refetches. Mutations (critical / hide / unhide
   / rename / delete / restore) persist through the API, then we refetch.

   Remaining contract gaps (defaulted in the factory, degrade gracefully): the
   suggested-fix text, and a per-row hidden/deleted flag — see TODO.md. */

export const PAGE_SIZE = 20;

/* Persist the light view preferences per project so a chosen view sticks across
   reloads (the heavier filters reset — they refetch). */
const critOnlyKey = (p: string) => `${p}_issues_crit_only`;
const visibilityKey = (p: string) => `${p}_issues_visibility`;
const readFlag = (key: string) => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};
const writeFlag = (key: string, value: boolean) => {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    /* localStorage unavailable — in-memory only */
  }
};
const readStr = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeStr = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* no-op */
  }
};

/** Map the UI match toggle to the API's labelsMatch. */
const toLabelsMatch = (m: MatchMode): LabelsMatch =>
  m === 'any' ? 'or' : 'and';

/** Merge a Data Management saved search with the (NOT-YET-BACKED) capture layer
    into the view model the segment UI reads. `mine`/`createdBy` are resolved
    from the members list — until the segment API returns a creator name, a
    teammate whose name isn't loaded falls back to a generic label. */
function toSavedSegment(
  s: Segment,
  capture: SegmentCaptureState,
): SavedSegment {
  const currentUserId = userStore.account.id;
  const mine = s.userId != null && String(s.userId) === String(currentUserId);
  const member = userStore.list.find(
    (u) => String(u.userId) === String(s.userId),
  );
  return {
    id: s.id,
    name: s.name,
    isPublic: s.isPublic,
    mine,
    createdBy: mine ? 'You' : member?.name || 'a teammate',
    filters: s.filters,
    summary: summarize(s.filters),
    sessionsCount: s.sessionsCount,
    usersCount: s.usersCount,
    totalSessionCount: s.totalSessionCount,
    updatedAt: s.updatedAt,
    // real server flag; fall back to the capture stub until it's everywhere
    active: s.isCapture || capture.active.includes(s.id),
    instructions: capture.instructions[s.id],
    trafficPct: 0 /* NOT-YET-BACKED: backend estimates the traffic share */,
    sessionsPerDay: 0 /* NOT-YET-BACKED */,
  };
}

export default class IssuesStore {
  projectId = '';
  issues: Issue[] = [];
  total = 0;
  loading = false;
  loaded = false;

  // ---- pagination ----
  page = 1;
  limit = PAGE_SIZE;

  // ---- filters (each setter refetches) ----
  query = '';
  cats: CategoryName[] = [];
  labels: string[] = []; // journey labels
  match: MatchMode = 'all';
  sort: SortMode = 'impact';
  sortDir: SortDir = 'desc';
  // the default sort is applied silently; a column header only lights up once
  // the user explicitly sorts
  sortTouched = false;
  critOnly = false;
  visibility: Visibility = 'active';
  range: [number, number] | null = null; // null => server default (last 7 days)
  minImpact = 0;

  /* ---- critical definitions + traffic segments (NOT-YET-BACKED, see TODO.md)
     `criticalRules` = the customer's "what critical means" descriptions;
     `criticalBy` = ruleIds that flagged each issue (server-derived in the real
     API; here only what the user authors via the dialog); `notCritical` = my
     per-user suppression + its reason. `segments`/`captureMode`/`origins` are
     the traffic-segment layer. All hydrate from stubs until the backend ships. */
  criticalRules: CriticalRule[] = [];
  criticalBy: Record<string, number[]> = {};
  notCritical: Record<string, string> = {};
  relevantToMe = false;
  segments: SavedSegment[] = [];
  captureMode: CaptureMode = 'full';
  origins: IssueOrigin[] = [];

  // ---- journey tags (NOT-YET-BACKED) — predefined set is editable state ----
  customTags: JourneyTag[] = [];
  predefinedTags: JourneyTag[] = PREDEFINED_JOURNEY_TAGS.map((t) => ({ ...t }));

  /* baseline count with no filters, for the empty-state "reset to show N" hint.
     lazy: fetched only when an empty filtered list is shown. */
  unfilteredTotal: number | null = null;

  /* detail page: segment ids scoping the example-sessions sample (SESSIONS
     ONLY — headline stats stay global). Mirrored to ?seg= by the view. */
  detailScope: string[] = [];
  /* issue-page tag filter (Mehdi 07-28): example sessions filtered by their
     journey tags, same grammar as the list's Tags dropdown. Sessions-only —
     headline stats stay global. Sent to /search as journeyLabels. */
  detailLabels: string[] = [];
  detailMatch: MatchMode = 'all';

  // ---- vocabulary / lookups ----
  labelsAll: { issueLabels: string[]; journeyLabels: string[] } = {
    issueLabels: [],
    journeyLabels: [],
  };
  reasons: Reasons = { hide: [], criticality: [] };

  // ---- single-issue cache for detail/player deep-links (may be off-page) ----
  issueCache: Record<string, Issue> = {};
  issueLoading: Record<string, boolean> = {};
  // issues whose full detail (incl. issueDescription) has been fetched
  issueDetailLoaded: Record<string, boolean> = {};

  // ---- example sessions per cache key (issue name + optional search query) ----
  sessions: Record<string, IssueSessionCard[]> = {};
  sessionsTotal: Record<string, number> = {};
  sessionsLoading: Record<string, boolean> = {};

  private queryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  init = (projectId: string) => {
    if (projectId === this.projectId && this.loaded) return;
    if (projectId !== this.projectId) this.reset();
    this.projectId = projectId;
    this.critOnly = readFlag(critOnlyKey(projectId));
    const vis = readStr(visibilityKey(projectId));
    if (
      vis === 'active' ||
      vis === 'hidden' ||
      vis === 'deleted' ||
      vis === 'all'
    )
      this.visibility = vis;
    void this.fetchIssues();
    // vocabulary for the filter controls + reason prompts — fetched once per
    // project, not on every list load
    void this.fetchLabels();
    void this.fetchReasons();
    void this.fetchSegments();
  };

  private reset = () => {
    this.issues = [];
    this.total = 0;
    this.loaded = false;
    this.page = 1;
    this.query = '';
    this.cats = [];
    this.labels = [];
    this.match = 'all';
    this.sort = 'impact';
    this.sortDir = 'desc';
    this.sortTouched = false;
    this.critOnly = false;
    this.visibility = 'active';
    this.range = null;
    this.minImpact = 0;
    this.criticalRules = [];
    this.criticalBy = {};
    this.notCritical = {};
    this.customTags = [];
    this.predefinedTags = PREDEFINED_JOURNEY_TAGS.map((t) => ({ ...t }));
    this.relevantToMe = false;
    this.segments = [];
    this.captureMode = 'full';
    this.origins = [];
    this.unfilteredTotal = null;
    this.labelsAll = { issueLabels: [], journeyLabels: [] };
    this.reasons = { hide: [], criticality: [] };
    this.issueCache = {};
    this.issueLoading = {};
    this.issueDetailLoaded = {};
    this.sessions = {};
    this.sessionsTotal = {};
    this.sessionsLoading = {};
    this.detailScope = [];
    this.detailLabels = [];
    this.detailMatch = 'all';
  };

  fetchIssues = async () => {
    if (!this.projectId) return;
    this.loading = true;
    try {
      const { rows, total } = await getIssues(this.projectId, {
        limit: this.limit,
        page: this.page,
        issueLabels: [...this.cats],
        journeyLabels: this.labels,
        // categories combine with AND; the journey-tag match honours the toggle
        issueLabelsMatch: 'and',
        journeyLabelsMatch: toLabelsMatch(this.match),
        sortBy: this.sort,
        sortDir: this.sortDir,
        range: this.range ?? undefined,
        hidden: this.visibility,
        // "Critical only" is a dedicated request flag, not a label filter
        critical: this.critOnly,
        // scope to chosen segments (origins minus the "full traffic" sentinel)
        segmentIds: this.segmentIds,
        // NOT-YET-BACKED — server ignores until implemented
        relevantToMe: this.relevantToMe,
        minImpact: this.minImpact,
        query: this.query.trim(),
      });
      runInAction(() => {
        this.issues = rows.map(makeIssue);
        // keep the deep-link cache fresh, but preserve a description already
        // loaded via getIssue (list rows don't carry issueDescription)
        this.issues.forEach((i) => {
          const prev = this.issueCache[i.id];
          this.issueCache[i.id] =
            prev?.problem && !i.problem ? { ...i, problem: prev.problem } : i;
        });
        this.total = total;
        this.loaded = true;
      });
    } catch (e) {
      console.error('Failed to load issues', e);
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  };

  fetchLabels = async () => {
    if (!this.projectId) return;
    try {
      const labels = await getLabels(this.projectId);
      runInAction(() => {
        this.labelsAll = labels;
      });
    } catch (e) {
      console.error('Failed to load labels', e);
    }
  };

  fetchReasons = async () => {
    if (!this.projectId) return;
    try {
      const reasons = await getReasons(this.projectId);
      runInAction(() => {
        this.reasons = reasons;
      });
    } catch (e) {
      console.error('Failed to load reasons', e);
    }
  };

  /* The segment list is real (Data Management saved searches); the capture
     layer is NOT-YET-BACKED and resolves empty until the endpoints ship. */
  fetchSegments = async () => {
    if (!this.projectId) return;
    try {
      const [{ segments }, capture] = await Promise.all([
        fetchDmSegments({
          limit: 200,
          page: 1,
          sortBy: 'updatedAt',
          sortOrder: 'desc',
        }),
        getSegmentCapture(this.projectId),
      ]);
      runInAction(() => {
        this.captureMode = capture.mode;
        this.segments = segments.map((s) => toSavedSegment(s, capture));
      });
    } catch (e) {
      console.error('Failed to load segments', e);
    }
  };

  /** Load just the segments for a project — used by the Data Management page,
      which needs the capture layer without the full Issues init. */
  ensureSegments = (projectId: string) => {
    if (this.projectId !== projectId) this.projectId = projectId;
    void this.fetchSegments();
  };

  /* Refetch the list after a filter change: resets to page 1; sort changes pass
     resetPage:false to keep the current page. */
  private refetch = (opts: { resetPage?: boolean } = {}) => {
    if (opts.resetPage !== false) this.page = 1;
    this.unfilteredTotal = null;
    void this.fetchIssues();
  };

  /** Any narrowing filter active (excludes sort). Drives the empty-state reset. */
  get hasActiveFilters(): boolean {
    return Boolean(
      this.query.trim() ||
      this.cats.length ||
      this.labels.length ||
      this.critOnly ||
      this.relevantToMe ||
      this.origins.length ||
      this.visibility !== 'active' ||
      this.range !== null,
    );
  }

  /** Lazily fetch the unfiltered baseline count (for the reset hint). */
  fetchUnfilteredTotal = async () => {
    if (!this.projectId || this.unfilteredTotal !== null) return;
    try {
      const { total } = await getIssues(this.projectId, { limit: 1 });
      runInAction(() => {
        this.unfilteredTotal = total;
      });
    } catch (e) {
      console.error('Failed to load unfiltered total', e);
    }
  };

  /** Clear every narrowing filter back to defaults (keeps sort) and refetch. */
  resetFilters = () => {
    this.query = '';
    this.cats = [];
    this.labels = [];
    this.match = 'all';
    this.critOnly = false;
    this.relevantToMe = false;
    this.origins = [];
    this.visibility = 'active';
    this.range = null;
    if (this.projectId) {
      writeFlag(critOnlyKey(this.projectId), false);
      writeStr(visibilityKey(this.projectId), 'active');
    }
    this.refetch();
  };

  // ---- single-issue lookup (detail / player) ----
  byId(id: string): Issue | undefined {
    return (
      this.issueCache[id] ?? this.issues.find((i) => i.id === id) ?? undefined
    );
  }

  /** Ensure an issue is loaded by name (may be off the current page/filter). */
  loadIssue = async (name: string) => {
    if (!this.projectId || !name) return;
    // a list row may already be cached, but it lacks issueDescription — fetch
    // the full issue once so the detail page can show it
    if (this.issueDetailLoaded[name] || this.issueLoading[name]) return;
    this.issueLoading[name] = true;
    try {
      const raw = await getIssue(this.projectId, name, this.range ?? undefined);
      runInAction(() => {
        if (raw) this.issueCache[name] = makeIssue(raw);
        this.issueDetailLoaded[name] = true;
      });
    } catch (e) {
      console.error('Failed to load issue', e);
    } finally {
      runInAction(() => {
        this.issueLoading[name] = false;
      });
    }
  };

  isLoadingIssue(name: string): boolean {
    return Boolean(this.issueLoading[name]);
  }

  // ---- detail example-sessions segment scope (sessions only) ----
  setDetailScope = (ids: string[]) => {
    this.detailScope = ids;
  };
  toggleDetailScope = (id: string) => {
    this.detailScope = this.detailScope.includes(id)
      ? this.detailScope.filter((x) => x !== id)
      : [...this.detailScope, id];
  };
  clearDetailScope = () => {
    this.detailScope = [];
  };

  // ---- issue-page tag filter (same shape as the list's labels/match) ----
  setDetailLabels = (l: string[]) => {
    this.detailLabels = l;
  };
  toggleDetailLabel = (t: string) => {
    this.detailLabels = this.detailLabels.includes(t)
      ? this.detailLabels.filter((x) => x !== t)
      : [...this.detailLabels, t];
  };
  setDetailMatch = (m: MatchMode) => {
    this.detailMatch = m;
  };
  clearDetailLabels = () => {
    this.detailLabels = [];
  };

  // ---- example sessions ----
  // key by issue + query + the active detail scope (segments) + tag filter, so
  // each scoped/filtered view caches separately and refetches when it changes
  private sessKey = (id: string, query = '') => {
    const scope = this.detailScope.length
      ? ` #${[...this.detailScope].sort().join(',')}`
      : '';
    const tags = this.detailLabels.length
      ? ` @${this.detailMatch}:${[...this.detailLabels].sort().join(',')}`
      : '';
    return `${query.trim() ? `${id} ${query.trim()}` : id}${scope}${tags}`;
  };

  loadSessions = async (id: string, query = '') => {
    const key = this.sessKey(id, query);
    if (this.sessions[key] || this.sessionsLoading[key]) return;
    this.sessionsLoading[key] = true;
    try {
      const { rows, total } = await getIssueSessions(this.projectId, id, {
        query: query.trim() || null,
        range: this.range ?? undefined,
        // scope the sample to the chosen segments (search supports segmentIds)
        segmentIds: this.detailScope,
        // issue-page tag filter → journeyLabels on the sample
        journeyLabels: this.detailLabels,
        journeyLabelsMatch: toLabelsMatch(this.detailMatch),
      });
      runInAction(() => {
        this.sessions[key] = rows.map(makeIssueSessionCard);
        this.sessionsTotal[key] = total;
      });
    } catch (e) {
      // leave the key unset so the next open retries
      console.error('Failed to load issue sessions', e);
    } finally {
      runInAction(() => {
        this.sessionsLoading[key] = false;
      });
    }
  };

  exampleSessions(id: string, query = ''): IssueSessionCard[] {
    return this.sessions[this.sessKey(id, query)] ?? [];
  }
  sessionsCount(id: string, query = ''): number {
    return this.sessionsTotal[this.sessKey(id, query)] ?? 0;
  }
  isLoadingSessions(id: string, query = ''): boolean {
    return Boolean(this.sessionsLoading[this.sessKey(id, query)]);
  }

  // ---- derived ----
  get list(): Issue[] {
    return this.issues;
  }

  /** Whether the project has any category labels (drives the category UI). */
  get hasCategories(): boolean {
    return this.labelsAll.issueLabels.some((l) =>
      (CAT_ORDER as string[]).includes(l),
    );
  }

  /** Journey-label options for the filter. */
  get allTags(): string[] {
    return [...this.labelsAll.journeyLabels].sort();
  }

  /** Rows are hidden when the visibility filter is scoped to hidden issues. */
  get viewingHidden(): boolean {
    return this.visibility === 'hidden';
  }
  get viewingDeleted(): boolean {
    return this.visibility === 'deleted';
  }

  // ---- critical (derived from descriptions, §14) ----
  /** the server/agent flag on the raw issue (its own anonymous "rule") */
  private serverCritical(id: string): boolean {
    return Boolean(this.byId(id)?.critical);
  }
  /** the descriptions IGNORING my suppression — client rules the user attached,
      plus the agent's own flag as a synthetic rule when nothing else matched */
  rulesFor(id: string): CriticalRule[] {
    const attached = (this.criticalBy[id] ?? [])
      .map((ruleId) => this.criticalRules.find((r) => r.id === ruleId))
      .filter(Boolean) as CriticalRule[];
    if (attached.length) return attached;
    return this.serverCritical(id) ? [AGENT_RULE] : [];
  }
  /** the descriptions that made this issue critical — the whole truth. Empty
      once I have said it is not critical for me. */
  matchedRules(id: string): CriticalRule[] {
    if (this.notCritical[id] != null) return [];
    return this.rulesFor(id);
  }
  /** three states, about WHOSE description matched: none, a teammate's/agent's
      only, or one of mine (what "Critical to me" filters on) */
  critState(id: string): 'none' | 'team' | 'mine' {
    const matched = this.matchedRules(id);
    if (!matched.length) return 'none';
    return matched.some((r) => r.mine) ? 'mine' : 'team';
  }
  /** relevant = one of MY descriptions flagged it, or a segment I own surfaced it */
  isRelevant = (i: Issue): boolean =>
    this.critState(i.id) === 'mine' ||
    (i.segmentId != null && Boolean(this.segmentById(i.segmentId)?.mine));
  /** count next to "Critical to me" — issues my own descriptions flagged */
  get relevantCount(): number {
    return this.issues.filter((i) => this.critState(i.id) === 'mine').length;
  }

  // ---- critical definitions (NOT-YET-BACKED, client-side) ----
  /** Author a description. When it comes from an issue (the triangle's
      intermediary), that issue is flagged straight away. */
  addCriticalRule = (
    description: string,
    forIssueId?: string,
  ): CriticalRule => {
    const rule: CriticalRule = {
      id: Math.max(0, ...this.criticalRules.map((r) => r.id)) + 1,
      description,
      createdBy: userStore.account.name || 'You',
      mine: true,
    };
    this.criticalRules.push(rule);
    if (forIssueId != null) {
      const { [forIssueId]: _dropped, ...rest } = this.notCritical;
      this.notCritical = rest;
      this.criticalBy = {
        ...this.criticalBy,
        [forIssueId]: [...(this.criticalBy[forIssueId] ?? []), rule.id],
      };
    }
    return rule;
  };
  updateCriticalRule = (id: number, description: string) => {
    this.criticalRules = this.criticalRules.map((r) =>
      r.id === id ? { ...r, description } : r,
    );
  };
  /** Removing a description un-flags everything it was the only match for. */
  removeCriticalRule = (id: number) => {
    this.criticalRules = this.criticalRules.filter((r) => r.id !== id);
    const next: Record<string, number[]> = {};
    Object.keys(this.criticalBy).forEach((key) => {
      next[key] = this.criticalBy[key].filter((r) => r !== id);
    });
    this.criticalBy = next;
  };
  /** how many issues would stop being critical if this description went away */
  rulesOnlyMatch(id: number): number {
    return Object.keys(this.criticalBy).filter((key) => {
      const ids = this.criticalBy[key];
      return ids.includes(id) && ids.length === 1;
    }).length;
  }
  /** MY not-critical: suppresses the flag for me only; the reason teaches the
      agent. Replace, never mutate a key (MobX tracks the object identity). */
  setNotCriticalForMe = (id: string, reason: string) => {
    this.notCritical = { ...this.notCritical, [id]: reason };
  };
  restoreCritical = (id: string) => {
    const { [id]: _dropped, ...rest } = this.notCritical;
    this.notCritical = rest;
  };

  // ---- segments + capture ----
  /** segment ids to scope the list to (origins minus the full-traffic sentinel) */
  get segmentIds(): string[] {
    return this.origins.filter((o) => o !== 'full');
  }
  segmentById(id?: string): SavedSegment | undefined {
    return id == null ? undefined : this.segments.find((s) => s.id === id);
  }
  /** Segment display name — prefer the globally-loaded filter vocabulary (saved
      searches carry `searchId` + name), fall back to the loaded segment list. */
  segmentName(searchId?: string): string | undefined {
    if (!searchId) return undefined;
    // segment filters carry searchId at runtime; the Filter type doesn't list it
    const f = filterStore.findEvent({ searchId } as any);
    return f?.name || this.segmentById(searchId)?.name;
  }
  /** segments I can see: mine or team-visible (teammates' private ones hidden) */
  get visibleSegments(): SavedSegment[] {
    return this.segments.filter((s) => s.mine || s.isPublic);
  }
  /** segments offered as "Found in" origins in the list filter */
  get originSegments(): SavedSegment[] {
    return this.visibleSegments;
  }
  /** Create a customer-defined journey tag (name + NL description the agent
      matches). NOT-YET-BACKED — no write endpoint yet; kept wired as a no-op. */
  // ---- journey tags (NOT-YET-BACKED, client-side) ----
  /** Author a custom journey tag. Returns false when the name is already taken
      (across predefined + custom), so the caller can say so. */
  addCustomTag = (name: string, description: string): boolean => {
    const taken = [...this.predefinedTags, ...this.customTags].some(
      (t) => t.name.toLowerCase() === name.toLowerCase(),
    );
    if (taken) return false;
    this.customTags = [...this.customTags, { name, description }];
    return true;
  };
  /** Rename/redescribe either list; an active filter follows the rename. */
  updateTag = (oldName: string, name: string, description: string) => {
    const rename = (t: JourneyTag) =>
      t.name === oldName ? { name, description } : t;
    this.predefinedTags = this.predefinedTags.map(rename);
    this.customTags = this.customTags.map(rename);
    this.labels = this.labels.map((l) => (l === oldName ? name : l));
  };
  removeTag = (name: string) => {
    const keep = (t: JourneyTag) => t.name !== name;
    this.predefinedTags = this.predefinedTags.filter(keep);
    this.customTags = this.customTags.filter(keep);
    this.labels = this.labels.filter((l) => l !== name);
  };
  /** segments the agent is currently capturing */
  get capturingSegments(): SavedSegment[] {
    return this.segments.filter((s) => s.active);
  }
  get activeSegmentCount(): number {
    return this.capturingSegments.length;
  }

  setRelevantToMe = (v: boolean) => {
    this.relevantToMe = v;
    this.refetch();
  };
  toggleOrigin = (o: IssueOrigin) => {
    this.origins = this.origins.includes(o)
      ? this.origins.filter((x) => x !== o)
      : [...this.origins, o];
    this.refetch();
  };
  clearOrigins = () => {
    this.origins = [];
    this.refetch();
  };

  /** switch the project between full-traffic and segment capture. */
  setCaptureMode = (mode: CaptureMode) => {
    this.captureMode = mode;
    if (this.projectId) void apiSetCaptureMode(this.projectId, mode);
  };

  /* Persist a segment's capture flag — the saved search's real `isCapture`
     ("Identify issues in this segment"), with a best-effort mirror to the
     NOT-YET-BACKED capture endpoint. */
  private persistCapture = (id: string, on: boolean) => {
    if (!this.projectId) return;
    const seg = this.segmentById(id);
    if (seg)
      void updateSegment(id, {
        name: seg.name,
        isPublic: seg.isPublic,
        filters: seg.filters,
        isCapture: on && seg.isPublic,
      }).catch((e) => console.error('Failed to persist capture', e));
    void setSegmentCapture(this.projectId, id, { active: on });
  };

  /** turn a segment's capture on (anyone can — it's the shared capture set). */
  enableCapture = (id: string) => {
    this.segments = this.segments.map((s) =>
      s.id === id ? { ...s, active: true } : s,
    );
    this.persistCapture(id, true);
  };

  /** toggle a segment's capture; returns true when turning the last one off
      dropped the project back to full traffic. */
  toggleSegment = (id: string, on: boolean): boolean => {
    this.segments = this.segments.map((s) =>
      s.id === id ? { ...s, active: on } : s,
    );
    this.persistCapture(id, on);
    if (
      !on &&
      this.captureMode === 'segments' &&
      this.activeSegmentCount === 0
    ) {
      this.setCaptureMode('full');
      return true;
    }
    return false;
  };

  /** create or update a segment — persists the saved search through Data
      Management, then its capture flag + agent instructions. Returns true when
      the save dropped capture back to full traffic. */
  saveSegment = async (input: {
    id?: string;
    name: string;
    isPublic: boolean;
    filters: FilterItem[];
    active: boolean;
    instructions?: string;
  }): Promise<boolean> => {
    if (!this.projectId) return false;
    // private segments can't capture — eligibility follows visibility. The
    // capture flag is the saved search's real `isCapture` prop ("Identify
    // issues in this segment").
    const capture = input.active && input.isPublic;
    const payload = {
      name: input.name,
      isPublic: input.isPublic,
      filters: input.filters,
      isCapture: capture,
    };
    let saved: Segment;
    try {
      saved = input.id
        ? await updateSegment(input.id, payload)
        : await createSegment(payload);
    } catch (e) {
      console.error('Failed to save segment', e);
      return false;
    }
    // best-effort: mirror capture + per-segment instructions to the (still
    // NOT-YET-BACKED) capture endpoint until it's the single source of truth
    await setSegmentCapture(this.projectId, saved.id, {
      active: capture,
      instructions: input.instructions ?? '',
    });
    await this.fetchSegments();
    if (this.captureMode === 'segments' && this.activeSegmentCount === 0) {
      this.setCaptureMode('full');
      return true;
    }
    return false;
  };

  deleteSegment = async (id: string) => {
    if (!this.projectId) return;
    this.segments = this.segments.filter((s) => s.id !== id);
    this.origins = this.origins.filter((o) => o !== id);
    try {
      await apiDeleteSegment(id);
    } catch (e) {
      console.error('Failed to delete segment', e);
    }
    void this.fetchSegments();
  };

  // ---- filter setters ----
  setQuery = (q: string) => {
    this.query = q;
    if (this.queryTimer) clearTimeout(this.queryTimer);
    this.queryTimer = setTimeout(() => {
      this.refetch();
    }, 350);
  };
  /** Set sort key + direction together so a header click refetches once. */
  setSortState = (s: SortMode, d: SortDir) => {
    this.sortTouched = true;
    if (s === this.sort && d === this.sortDir) return;
    this.sort = s;
    this.sortDir = d;
    this.refetch({ resetPage: false });
  };
  setMatch = (m: MatchMode) => {
    this.match = m;
    this.refetch();
  };
  setCats = (c: CategoryName[]) => {
    this.cats = c;
    this.refetch();
  };
  setLabels = (l: string[]) => {
    this.labels = l;
    this.refetch();
  };
  toggleLabel = (t: string) => {
    this.setLabels(
      this.labels.includes(t)
        ? this.labels.filter((x) => x !== t)
        : [...this.labels, t],
    );
  };
  setCritOnly = (v: boolean) => {
    this.critOnly = v;
    if (this.projectId) writeFlag(critOnlyKey(this.projectId), v);
    this.refetch();
  };
  setVisibility = (v: Visibility) => {
    this.visibility = v;
    if (this.projectId) writeStr(visibilityKey(this.projectId), v);
    this.refetch();
  };
  setRange = (range: [number, number] | null) => {
    this.range = range;
    this.refetch();
  };
  setPage = (page: number) => {
    this.page = page;
    void this.fetchIssues();
  };

  // ---- mutations (persist, then refetch) ----
  private afterMutation = (id: string, patch: Partial<Issue>) => {
    // optimistic: patch the row + cache so the UI updates before the refetch
    this.issues = this.issues.map((i) =>
      i.id === id ? { ...i, ...patch } : i,
    );
    if (this.issueCache[id])
      this.issueCache[id] = { ...this.issueCache[id], ...patch };
  };

  rename = (id: string, name: string) => {
    if (!this.projectId) return;
    this.afterMutation(id, { head: name });
    void renameIssue(this.projectId, id, name)
      .then(() => this.refetch({ resetPage: false }))
      .catch((e) => console.error('Failed to rename issue', e));
  };

  hide = (id: string, reasons: string[] = [], note = '') => {
    if (!this.projectId) return;
    // drop it from the active view immediately
    this.issues = this.issues.filter((i) => i.id !== id);
    void hideIssue(this.projectId, id, reasons, note)
      .then(() => this.refetch({ resetPage: false }))
      .catch((e) => console.error('Failed to hide issue', e));
  };

  unhide = (id: string) => {
    if (!this.projectId) return;
    this.issues = this.issues.filter((i) => i.id !== id);
    void unhideIssue(this.projectId, id)
      .then(() => this.refetch({ resetPage: false }))
      .catch((e) => console.error('Failed to unhide issue', e));
  };

  remove = (id: string) => {
    if (!this.projectId) return;
    this.issues = this.issues.filter((i) => i.id !== id);
    void deleteIssue(this.projectId, id)
      .then(() => this.refetch({ resetPage: false }))
      .catch((e) => console.error('Failed to delete issue', e));
  };

  restore = (id: string) => {
    if (!this.projectId) return;
    this.issues = this.issues.filter((i) => i.id !== id);
    void restoreIssue(this.projectId, id)
      .then(() => this.refetch({ resetPage: false }))
      .catch((e) => console.error('Failed to restore issue', e));
  };
}
