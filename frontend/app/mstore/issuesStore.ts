import { makeAutoObservable, runInAction } from 'mobx';

import {
  type Segment,
  deleteSegment as apiDeleteSegment,
  createSegment,
  fetchSegment,
  mapSegments,
  updateSegment,
} from 'App/components/DataManagement/Segments/api';
import {
  type CaptureMode,
  type CreatedTicket,
  type IssueOrigin,
  type LabelsMatch,
  type RawCriticalDefinition,
  type RawJourneyTag,
  type Reasons,
  type SavedSegment,
  type SegmentCaptureState,
  type SessionJourney,
  type SortDir,
  type TicketTarget,
  type Visibility,
  setCaptureMode as apiSetCaptureMode,
  createCriticalDefinition,
  createIssueTicket,
  createJourneyTag,
  deleteCriticalDefinition,
  deleteIssue,
  deleteJourneyTag,
  getIssue,
  getIssueSessions,
  getIssues,
  getLabels,
  getReasons,
  getSegmentCapture,
  getSessionJourney,
  hideIssue,
  listCriticalDefinitions,
  listJourneyTags,
  renameIssue,
  restoreIssue,
  setIssueCritical,
  setSegmentCapture,
  unhideIssue,
  updateCriticalDefinition,
  updateJourneyTag,
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
import { filterStore, searchStore, userStore } from 'App/mstore';
import type FilterItem from 'App/mstore/types/filterItem';

/* Critical is a DESCRIBED RULE, not a per-issue flag: the customer describes
   what "critical" means, the agent flags matching issues, so criticality in the
   UI is always DERIVED (matchedRules).

   The rule catalogue is server-backed (`/critical-definitions`). Per-issue
   attribution comes from the issue's `criticalBy`, but the backend discards the
   model's verdict before storage (a known limitation), so it is empty in
   practice; the local `criticalBy`/`notCritical` maps give in-session feedback
   over the real, persisted per-user `critical` boolean (`PUT` + `{critical}`). */
export type CriticalRule = {
  id: number;
  description: string;
  createdBy: string;
  /** description authored by the current user (drives "Critical to me") */
  mine: boolean;
};

/* Journey tag (server-backed CRUD). `source` is provenance only — predefined
   tags are editable/removable like custom ones. */
export type JourneyTag = {
  id: number;
  name: string;
  description: string;
  source: 'predefined' | 'custom';
};

/* The agent's own flag (server `critical`) shown as a rule when no user
   description is attached yet — so a server-flagged issue still reads critical. */
const AGENT_RULE: CriticalRule = {
  id: 0,
  description: 'Detected by the agent',
  createdBy: 'the agent',
  mine: false,
};

/* Store behind the AI Issues surface. Issues + example sessions come from the
   /v2/smart-issues endpoints, mapped through SmartAlerts/factories. Filtering,
   sorting and pagination are server-side; mutations persist then refetch. */

export const PAGE_SIZE = 20;

/* Persist light view preferences per project so a chosen view sticks across
   reloads (heavier filters reset — they refetch). */
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

/** Merge a Data Management saved search with the (NOT-YET-BACKED) capture mode +
    instructions into the segment view model. `mine` compares the creator id to
    the current user; `createdBy` falls back to a generic label when blank. */
function toSavedSegment(
  s: Segment,
  capture: SegmentCaptureState,
): SavedSegment {
  const currentUserId = userStore.account.id;
  const mine = s.userId != null && String(s.userId) === String(currentUserId);
  return {
    id: s.id,
    name: s.name,
    isPublic: s.isPublic,
    mine,
    // server-provided creator name (may be "")
    createdBy: mine ? 'You' : s.userName || 'a teammate',
    filters: s.filters,
    summary: summarize(s.filters),
    sessionsCount: s.sessionsCount,
    usersCount: s.usersCount,
    totalSessionCount: s.totalSessionCount,
    updatedAt: s.updatedAt,
    // real server flag; fall back to the capture stub until it ships
    active: s.isCapture || capture.active.includes(s.id),
    instructions: capture.instructions[s.id],
    // server traffic estimate — 0 means "no estimate", not "zero traffic"
    trafficPct: s.trafficPct,
    sessionsPerDay: s.sessionsPerDay,
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
  // default sort is applied silently; a column header only lights up once the
  // user explicitly sorts
  sortTouched = false;
  critOnly = false;
  visibility: Visibility = 'active';
  range: [number, number] | null = null; // null => server default (last 7 days)
  minImpact = 0;

  /* ---- critical definitions + traffic segments ----
     `criticalRules` = the customer's descriptions (server `/critical-definitions`);
     `criticalBy` = ruleIds that flagged each issue in-session (server attribution
     is discarded before storage, so this holds only what the user authors here);
     `notCritical` = per-user suppression + reason. `segments`/`captureMode`/
     `origins` are the traffic-segment layer (mode + flag backed; per-segment
     instructions still stubbed). */
  criticalRules: CriticalRule[] = [];
  criticalBy: Record<string, number[]> = {};
  notCritical: Record<string, string> = {};
  relevantToMe = false;
  segments: SavedSegment[] = [];
  captureMode: CaptureMode = 'full';
  origins: IssueOrigin[] = [];
  /** AND/OR across the chosen segments ('any' => hasAny, the server default) */
  segmentsMatch: MatchMode = 'any';

  // ---- journey tags (server-backed CRUD) ----
  journeyTags: JourneyTag[] = [];

  // ---- category tab counts (from the list response) ----
  categoryCounts: Record<string, number> | null = null;

  /* baseline count with no filters, for the empty-state "reset to show N" hint;
     fetched lazily only when an empty filtered list is shown. */
  unfilteredTotal: number | null = null;

  /* segment ids scoping the example-sessions sample (SESSIONS ONLY — headline
     stats stay global). Mirrored to ?seg= by the view. */
  detailScope: string[] = [];
  /* issue-page tag filter: example sessions filtered by journey tags, same
     grammar as the list's Tags dropdown. Sessions-only — headline stats stay
     global. Sent to /search as journeyLabels. */
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

  /* ---- issue player panel (rendered inside the shared RightBlock) ----
     Held globally so RightBlock can render the panel natively, without the
     player prop-drilling into it. The player keeps these in sync. */
  playerIssueId: string | null = null;
  playerCard: IssueSessionCard | null = null;
  criticalDialogId: string | null = null;

  // ---- example sessions per cache key (issue name + optional search query) ----
  sessions: Record<string, IssueSessionCard[]> = {};
  sessionsTotal: Record<string, number> = {};
  sessionsLoading: Record<string, boolean> = {};

  // ---- per-session journey (player fallback for sessions off the /search sample) ----
  // undefined = not fetched; null = fetched, no journey row (404 / aged out)
  sessionJourneys: Record<string, SessionJourney | null> = {};
  sessionJourneyLoading: Record<string, boolean> = {};

  /* ---- issue-tracker tickets ----
     Session-only: the issue row carries no ticket, so a created ticket is only
     known here until the page reloads. */
  tickets: Record<string, CreatedTicket> = {};
  ticketPending: string | null = null;

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
    // vocabulary for filter controls + reason prompts — fetched once per project
    void this.fetchLabels();
    void this.fetchReasons();
    void this.fetchSegments();
    void this.fetchJourneyTags();
    void this.fetchCriticalDefinitions();
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
    this.journeyTags = [];
    this.categoryCounts = null;
    this.relevantToMe = false;
    this.segments = [];
    this.captureMode = 'full';
    this.origins = [];
    this.segmentsMatch = 'any';
    this.unfilteredTotal = null;
    this.labelsAll = { issueLabels: [], journeyLabels: [] };
    this.reasons = { hide: [], criticality: [] };
    this.tickets = {};
    this.ticketPending = null;
    this.issueCache = {};
    this.issueLoading = {};
    this.issueDetailLoaded = {};
    this.playerIssueId = null;
    this.playerCard = null;
    this.criticalDialogId = null;
    this.sessions = {};
    this.sessionsTotal = {};
    this.sessionsLoading = {};
    this.sessionJourneys = {};
    this.sessionJourneyLoading = {};
    this.detailScope = [];
    this.detailLabels = [];
    this.detailMatch = 'all';
  };

  fetchIssues = async () => {
    if (!this.projectId) return;
    this.loading = true;
    try {
      const { rows, total, categoryCounts } = await getIssues(this.projectId, {
        limit: this.limit,
        page: this.page,
        journeyLabels: this.labels,
        journeyLabelsMatch: toLabelsMatch(this.match),
        // the category tab is its own primary-category filter (not a label match)
        category: this.cats[0],
        sortBy: this.sort,
        sortDir: this.sortDir,
        range: this.range ?? undefined,
        hidden: this.visibility,
        // "Critical only" is a dedicated request flag, not a label filter
        critical: this.critOnly,
        // scope to chosen segments (origins minus the "full traffic" sentinel)
        segmentIds: this.segmentIds,
        segmentsMatch: toLabelsMatch(this.segmentsMatch),
        // "Critical to me" — only issues the caller has marked critical
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
        // categoryCounts is computed with the category filter removed, so keep
        // the last non-null value while a tab is selected (it returns null then)
        if (categoryCounts) this.categoryCounts = categoryCounts;
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

  private toJourneyTag = (t: RawJourneyTag): JourneyTag => ({
    id: t.id,
    name: t.name,
    description: t.description,
    source: t.source,
  });

  fetchJourneyTags = async () => {
    if (!this.projectId) return;
    try {
      const tags = await listJourneyTags(this.projectId);
      runInAction(() => {
        this.journeyTags = tags.map(this.toJourneyTag);
      });
    } catch (e) {
      console.error('Failed to load journey tags', e);
    }
  };

  private toCriticalRule = (d: RawCriticalDefinition): CriticalRule => ({
    id: d.id,
    description: d.description,
    // author-only edit/delete keys off `mine`; matches the server's 403
    createdBy: d.createdBy?.name || 'a teammate',
    mine:
      d.createdBy?.id != null &&
      String(d.createdBy.id) === String(userStore.account.id),
  });

  fetchCriticalDefinitions = async () => {
    if (!this.projectId) return;
    try {
      const defs = await listCriticalDefinitions(this.projectId);
      runInAction(() => {
        this.criticalRules = defs.map(this.toCriticalRule);
      });
    } catch (e) {
      console.error('Failed to load critical definitions', e);
    }
  };

  /* The segment list is real (Data Management saved searches) and so is the
     capture MODE (project settings → `captureSegmentsOnly`). The active set is
     read from each saved search's `isCapture`; only per-segment instructions
     are still unbacked. */
  fetchSegments = async () => {
    if (!this.projectId) return;
    try {
      const [, capture] = await Promise.all([
        // the saved-search list is loaded once per project by searchStore and
        // shared with session search and Data Management
        searchStore.ensureSavedSearchList(),
        getSegmentCapture(this.projectId),
      ]);
      const segments = mapSegments(searchStore.savedSearchRaw);
      runInAction(() => {
        const mapped = segments.map((s) => toSavedSegment(s, capture));
        /* `captureSegmentsOnly` defaults to true on a project that never set it,
           so a project with nothing capturing would read as "capturing only
           active segments (0)" — segment capture needs a segment to be real. */
        this.captureMode =
          capture.mode === 'segments' && !mapped.some((s) => s.active)
            ? 'full'
            : capture.mode;
        this.segments = mapped;
      });
    } catch (e) {
      console.error('Failed to load segments', e);
    }
  };

  /** Load just the segments — for the Data Management page, which needs the
      capture layer without the full Issues init. */
  ensureSegments = (projectId: string) => {
    if (this.projectId !== projectId) this.projectId = projectId;
    void this.fetchSegments();
  };

  /** Load just the journey tags — for Preferences > Agents. Without this the
      panel renders empty AND every write no-ops on the blank `projectId`. */
  ensureJourneyTags = (projectId: string) => {
    if (this.projectId !== projectId) this.projectId = projectId;
    void this.fetchJourneyTags();
  };

  /** Load just the critical definitions — for Preferences > Agents, reachable
      without opening Issues (where init() would fetch them). */
  ensureCriticalDefinitions = (projectId: string) => {
    if (this.projectId !== projectId) this.projectId = projectId;
    void this.fetchCriticalDefinitions();
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

  /** Ensure an issue is loaded by id (may be off the current page/filter). */
  loadIssue = async (id: string) => {
    if (!this.projectId || !id) return;
    // a cached list row lacks issueDescription — fetch the full issue once so
    // the detail page can show it
    if (this.issueDetailLoaded[id] || this.issueLoading[id]) return;
    this.issueLoading[id] = true;
    try {
      const raw = await getIssue(this.projectId, id, this.range ?? undefined);
      runInAction(() => {
        if (raw) this.issueCache[id] = makeIssue(raw);
        this.issueDetailLoaded[id] = true;
      });
    } catch (e) {
      console.error('Failed to load issue', e);
    } finally {
      runInAction(() => {
        this.issueLoading[id] = false;
      });
    }
  };

  isLoadingIssue(id: string): boolean {
    return Boolean(this.issueLoading[id]);
  }

  // ---- issue player panel (global; read by RightBlock's ISSUE case) ----
  get playerIssue(): Issue | undefined {
    return this.playerIssueId ? this.byId(this.playerIssueId) : undefined;
  }
  setPlayerPanel = (issueId: string | null, card: IssueSessionCard | null) => {
    this.playerIssueId = issueId;
    this.playerCard = card;
  };
  clearPlayerPanel = () => {
    this.playerIssueId = null;
    this.playerCard = null;
    this.criticalDialogId = null;
  };
  openCriticalDialog = (id: string) => {
    this.criticalDialogId = id;
  };
  closeCriticalDialog = () => {
    this.criticalDialogId = null;
  };

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
  // key by issue + query + range + detail scope + tag filter so each scoped view
  // caches separately. The range is part of the REQUEST, so it must be part of
  // the key — otherwise changing the period replays the previous window's cache.
  private sessKey = (id: string, query = '') => {
    const win = this.range ? ` ~${this.range[0]}-${this.range[1]}` : '';
    const scope = this.detailScope.length
      ? ` #${[...this.detailScope].sort().join(',')}`
      : '';
    const tags = this.detailLabels.length
      ? ` @${this.detailMatch}:${[...this.detailLabels].sort().join(',')}`
      : '';
    return `${query.trim() ? `${id} ${query.trim()}` : id}${win}${scope}${tags}`;
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

  /* Fetch a single session's journey for the player fallback — used when a
     deep-linked session isn't in the issue's /search sample, so there's no card
     to read the journey/steps/variation from. Cached; null on 404 / aged out. */
  loadSessionJourney = async (sessionId: string) => {
    if (!this.projectId || !sessionId) return;
    if (
      this.sessionJourneys[sessionId] !== undefined ||
      this.sessionJourneyLoading[sessionId]
    )
      return;
    this.sessionJourneyLoading[sessionId] = true;
    try {
      const j = await getSessionJourney(this.projectId, sessionId);
      runInAction(() => {
        this.sessionJourneys[sessionId] = j;
      });
    } catch (e) {
      console.error('Failed to load session journey', e);
    } finally {
      runInAction(() => {
        this.sessionJourneyLoading[sessionId] = false;
      });
    }
  };

  sessionJourney(sessionId: string): SessionJourney | null {
    return this.sessionJourneys[sessionId] ?? null;
  }

  // ---- derived ----
  get list(): Issue[] {
    return this.issues;
  }

  /* Whether the project has any categorized issues (drives the category tabs).
     Read from the server's categorization (`category` / `categoryCounts`), NOT
     the label vocabulary — the vocabulary can lack categories entirely. */
  get hasCategories(): boolean {
    const counts = this.categoryCounts;
    if (counts) return CAT_ORDER.some((c) => (counts[c] ?? 0) > 0);
    return this.issues.some((i) => i.cat != null);
  }

  /** Journey-label options for the filter. */
  get allTags(): string[] {
    return [...this.labelsAll.journeyLabels].sort();
  }

  /** journey tags split by provenance (both editable) for the manager */
  get predefinedTags(): JourneyTag[] {
    return this.journeyTags.filter((t) => t.source === 'predefined');
  }
  get customTags(): JourneyTag[] {
    return this.journeyTags.filter((t) => t.source === 'custom');
  }

  // ---- category tab counts (from the list response) ----
  /** issues in a category (0 when the count query failed / bucket absent) */
  catCount(c: CategoryName): number {
    return this.categoryCounts?.[c] ?? 0;
  }
  /** total across every category bucket incl. uncategorized = "All" tab count */
  get allCategoryCount(): number {
    return this.categoryCounts
      ? Object.values(this.categoryCounts).reduce((a, n) => a + n, 0)
      : this.total;
  }
  get hasCategoryCounts(): boolean {
    return this.categoryCounts != null;
  }

  /** Rows are hidden when the visibility filter is scoped to hidden issues. */
  get viewingHidden(): boolean {
    return this.visibility === 'hidden';
  }

  // ---- critical (derived from descriptions) ----
  /** the server/agent flag on the raw issue (its own anonymous "rule") */
  private serverCritical(id: string): boolean {
    return Boolean(this.byId(id)?.critical);
  }
  /** the descriptions IGNORING my suppression — the definitions the server says
      flagged it (issue `criticalBy`) unioned with what the user attached this
      session, plus the agent's own flag as a synthetic rule when nothing matched */
  rulesFor(id: string): CriticalRule[] {
    const serverIds = (this.byId(id)?.criticalBy ?? []).map(
      (m) => m.definitionId,
    );
    const ruleIds = Array.from(
      new Set([...serverIds, ...(this.criticalBy[id] ?? [])]),
    );
    const attached = ruleIds
      .map((ruleId) => this.criticalRules.find((r) => r.id === ruleId))
      .filter(Boolean) as CriticalRule[];
    if (attached.length) return attached;
    return this.serverCritical(id) ? [AGENT_RULE] : [];
  }
  /** the descriptions that made this issue critical; empty once I've marked it
      not-critical for me. */
  matchedRules(id: string): CriticalRule[] {
    if (this.notCritical[id] != null) return [];
    return this.rulesFor(id);
  }
  /** triangle state, resolved per caller. `critical` is the gate — is it critical
      for ME (false once I've muted it). When it is, `criticalBy` attributes it:
      one of my own definitions matched (a match whose `userId` is mine) reads as
      MINE (red fill); only teammates'/agent's definitions read as TEAM (red
      outline, attributed by name in the dialog). */
  critState(id: string): 'none' | 'team' | 'mine' {
    const issue = this.byId(id);
    if (!issue || !issue.critical) return 'none';
    const me = String(userStore.account.id);
    return (issue.criticalBy ?? []).some((m) => String(m.userId) === me)
      ? 'mine'
      : 'team';
  }
  /** relevant = one of MY descriptions flagged it, or a segment I own surfaced it */
  isRelevant = (i: Issue): boolean =>
    this.critState(i.id) === 'mine' ||
    i.segmentIds.some((id) => this.segmentById(id)?.mine);
  /** count next to "Critical to me" — issues my own descriptions flagged */
  get relevantCount(): number {
    return this.issues.filter((i) => this.critState(i.id) === 'mine').length;
  }

  // ---- critical definitions (server-backed CRUD, optimistic + refetch) ----
  /** Author a description. When authored from an issue, that issue is flagged
      for the caller straight away (optimistic attach + persisted `critical`). */
  addCriticalRule = (description: string, forIssueId?: string) => {
    if (!this.projectId) return;
    // temp negative id until the refetch replaces it with the server's
    const tempId = -Date.now();
    this.criticalRules = [
      ...this.criticalRules,
      {
        id: tempId,
        description,
        createdBy: userStore.account.name || 'You',
        mine: true,
      },
    ];
    if (forIssueId != null) {
      const { [forIssueId]: _dropped, ...rest } = this.notCritical;
      this.notCritical = rest;
      this.criticalBy = {
        ...this.criticalBy,
        [forIssueId]: [...(this.criticalBy[forIssueId] ?? []), tempId],
      };
      // server attribution isn't stored, but the per-user `critical` flag +
      // reasoning are — persist so the issue still reads critical after reload
      this.persistCritical(forIssueId, true, [], description);
    }
    void createCriticalDefinition(this.projectId, description)
      .then((created) => {
        // swap the temp id for the real one in the in-session attachment
        if (created && forIssueId != null) {
          runInAction(() => {
            this.criticalBy = {
              ...this.criticalBy,
              [forIssueId]: (this.criticalBy[forIssueId] ?? []).map((r) =>
                r === tempId ? created.id : r,
              ),
            };
          });
        }
        return this.fetchCriticalDefinitions();
      })
      .catch((e) => console.error('Failed to create critical definition', e));
  };
  updateCriticalRule = (id: number, description: string) => {
    if (!this.projectId) return;
    this.criticalRules = this.criticalRules.map((r) =>
      r.id === id ? { ...r, description } : r,
    );
    void updateCriticalDefinition(this.projectId, id, description)
      .then(() => this.fetchCriticalDefinitions())
      .catch((e) => console.error('Failed to update critical definition', e));
  };
  /** Removing a description un-flags everything it was the only match for. */
  removeCriticalRule = (id: number) => {
    if (!this.projectId) return;
    this.criticalRules = this.criticalRules.filter((r) => r.id !== id);
    const next: Record<string, number[]> = {};
    Object.keys(this.criticalBy).forEach((key) => {
      next[key] = this.criticalBy[key].filter((r) => r !== id);
    });
    this.criticalBy = next;
    void deleteCriticalDefinition(this.projectId, id)
      .then(() => this.fetchCriticalDefinitions())
      .catch((e) => console.error('Failed to delete critical definition', e));
  };
  /** how many issues would stop being critical if this description went away */
  rulesOnlyMatch(id: number): number {
    return Object.keys(this.criticalBy).filter((key) => {
      const ids = this.criticalBy[key];
      return ids.includes(id) && ids.length === 1;
    }).length;
  }
  /* Write the criticality decision + feedback to the server (`PUT` + `{critical}`
     with reason enum + note). Per-user scoping is still client-side, so this is
     the shared flag that makes the decision + reasons outlive a reload. */
  private persistCritical = (
    id: string,
    critical: boolean,
    reasons: string[],
    note: string,
  ) => {
    if (!this.projectId) return;
    void setIssueCritical(
      this.projectId,
      id,
      critical,
      reasons,
      note,
    ).catch((e) => console.error('Failed to persist criticality', e));
    // keep the row + cache in step so the UI doesn't wait on the round-trip
    this.afterMutation(id, { critical });
  };

  /** Suppress the flag for me only; the reasons + note are sent with the flag.
      Replace, never mutate a key (MobX tracks the object identity). */
  setNotCriticalForMe = (id: string, reasons: string[] = [], note = '') => {
    this.notCritical = {
      ...this.notCritical,
      [id]: [...reasons, note.trim()].filter(Boolean).join(' · '),
    };
    this.persistCritical(id, false, reasons, note.trim());
  };
  restoreCritical = (id: string) => {
    const { [id]: _dropped, ...rest } = this.notCritical;
    this.notCritical = rest;
    this.persistCritical(id, true, [], '');
  };

  // ---- segments + capture ----
  /** segment ids to scope the list to (origins minus the full-traffic sentinel) */
  get segmentIds(): string[] {
    return this.origins.filter((o) => o !== 'full');
  }
  segmentById(id?: string): SavedSegment | undefined {
    return id == null ? undefined : this.segments.find((s) => s.id === id);
  }
  /** Segment display name — prefer the globally-loaded filter vocabulary, fall
      back to the loaded segment list. */
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
  // ---- journey tags (server-backed CRUD, persist then refetch) ----
  /** Author a custom journey tag. Returns false synchronously when the name is
      already taken locally; the create request runs in the background. */
  addCustomTag = (name: string, description: string): boolean => {
    const taken = this.journeyTags.some(
      (t) => t.name.toLowerCase() === name.toLowerCase(),
    );
    if (taken || !this.projectId) return false;
    // optimistic (temp negative id until the refetch replaces it)
    this.journeyTags = [
      ...this.journeyTags,
      { id: -Date.now(), name, description, source: 'custom' },
    ];
    void createJourneyTag(this.projectId, name, description)
      .then(() => this.fetchJourneyTags())
      .catch((e) => console.error('Failed to create journey tag', e));
    return true;
  };
  /** Rename/redescribe a tag; an active journey-label filter follows the rename. */
  updateTag = (id: number, name: string, description: string) => {
    if (!this.projectId) return;
    const oldName = this.journeyTags.find((t) => t.id === id)?.name;
    this.journeyTags = this.journeyTags.map((t) =>
      t.id === id ? { ...t, name, description } : t,
    );
    if (oldName)
      this.labels = this.labels.map((l) => (l === oldName ? name : l));
    void updateJourneyTag(this.projectId, id, { name, description })
      .then(() => this.fetchJourneyTags())
      .catch((e) => console.error('Failed to update journey tag', e));
  };
  removeTag = (id: number) => {
    if (!this.projectId) return;
    const removed = this.journeyTags.find((t) => t.id === id);
    this.journeyTags = this.journeyTags.filter((t) => t.id !== id);
    if (removed) this.labels = this.labels.filter((l) => l !== removed.name);
    void deleteJourneyTag(this.projectId, id)
      .then(() => this.fetchJourneyTags())
      .catch((e) => console.error('Failed to delete journey tag', e));
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
    this.setOrigins(
      this.origins.includes(o)
        ? this.origins.filter((x) => x !== o)
        : [...this.origins, o],
    );
  };
  /** Set the whole origin selection at once — the aggregate rows flip several
      ids together and must refetch ONCE, not per id. */
  setOrigins = (o: IssueOrigin[]) => {
    this.origins = o;
    this.refetch();
  };
  clearOrigins = () => {
    this.origins = [];
    this.refetch();
  };
  setSegmentsMatch = (m: MatchMode) => {
    this.segmentsMatch = m;
    // only affects the request when >1 segment is selected
    if (this.segmentIds.length > 1) this.refetch();
  };

  /** switch the project between full-traffic and segment capture (persists as
      the `captureSegmentsOnly` project setting). */
  setCaptureMode = (mode: CaptureMode) => {
    this.captureMode = mode;
    if (this.projectId)
      void apiSetCaptureMode(this.projectId, mode).catch((e) =>
        console.error('Failed to set capture mode', e),
      );
  };

  /* Persist a segment's capture flag (the saved search's real `isCapture`), with
     a best-effort mirror to the NOT-YET-BACKED capture endpoint.

     `updateSegment` REPLACES the whole saved search, query included, so re-read
     the segment first and write its own stored query back — sending our
     view-model copy of `filters` would clobber what the owner last saved. */
  private persistCapture = async (id: string, on: boolean) => {
    if (!this.projectId) return;
    try {
      const fresh = await fetchSegment(id);
      await updateSegment(id, {
        name: fresh.name,
        isPublic: fresh.isPublic,
        filters: fresh.filters,
        isCapture: on && fresh.isPublic,
      });
    } catch (e) {
      console.error('Failed to persist capture', e);
    }
    void setSegmentCapture(this.projectId, id, { active: on });
  };

  /** turn a segment's capture on (anyone can — it's the shared capture set). */
  enableCapture = (id: string) => {
    this.segments = this.segments.map((s) =>
      s.id === id ? { ...s, active: true } : s,
    );
    void this.persistCapture(id, true);
  };

  /** toggle a segment's capture; returns true when turning the last one off
      dropped the project back to full traffic. */
  toggleSegment = (id: string, on: boolean): boolean => {
    this.segments = this.segments.map((s) =>
      s.id === id ? { ...s, active: on } : s,
    );
    void this.persistCapture(id, on);
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

  /** create or update a segment — persists the saved search, then its capture
      flag + agent instructions. Returns true when the save dropped capture back
      to full traffic. */
  saveSegment = async (input: {
    id?: string;
    name: string;
    isPublic: boolean;
    filters: FilterItem[];
    active: boolean;
    instructions?: string;
  }): Promise<boolean> => {
    if (!this.projectId) return false;
    // private segments can't capture — eligibility follows visibility; the
    // capture flag is the saved search's real `isCapture` prop
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
    // best-effort: mirror capture + instructions to the (NOT-YET-BACKED) capture
    // endpoint until it's the single source of truth
    await setSegmentCapture(this.projectId, saved.id, {
      active: capture,
      instructions: input.instructions ?? '',
    });
    searchStore.invalidateSavedSearchList();
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
    searchStore.invalidateSavedSearchList();
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

  /* Un-delete (un-delete + un-hide, `PUT` + `{restore: true}`); reached from the
     row menu in the Deleted view. */
  restore = (id: string) => {
    if (!this.projectId) return;
    this.issues = this.issues.filter((i) => i.id !== id);
    void restoreIssue(this.projectId, id)
      .then(() => this.refetch({ resetPage: false }))
      .catch((e) => console.error('Failed to restore issue', e));
  };

  /* File the issue in a connected tracker. Resolves to the ticket (also kept in
     `tickets` so the button can link to it) or null when the call failed. */
  createTicket = async (
    id: string,
    target: TicketTarget = 'linear',
  ): Promise<CreatedTicket | null> => {
    if (!this.projectId || this.ticketPending) return null;
    this.ticketPending = id;
    try {
      const ticket = await createIssueTicket(this.projectId, id, target);
      if (ticket) {
        runInAction(() => {
          this.tickets[id] = ticket;
        });
      }
      return ticket;
    } catch (e) {
      console.error('Failed to create ticket', e);
      return null;
    } finally {
      runInAction(() => {
        this.ticketPending = null;
      });
    }
  };
}
