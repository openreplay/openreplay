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
  addMyCritical,
  setCaptureMode as apiSetCaptureMode,
  deleteIssue,
  getIssue,
  getIssueSessions,
  getIssues,
  getLabels,
  getMyCriticals,
  getReasons,
  getSegmentCapture,
  hideIssue,
  removeMyCritical,
  renameIssue,
  restoreIssue,
  setIssueCritical,
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

  /* ---- per-user critical + traffic segments (NOT-YET-BACKED, see TODO.md) ----
     `mine` = issue names the user marked "critical for me" (personal layer,
     never the project flag). `segments` = the project's saved searches with the
     agent-capture layer merged in; `captureMode` = whether the agent samples
     full traffic or only active segments; `origins` = the segment/full-traffic
     "found in" filter. The capture layer hydrates from stub calls that resolve
     empty until the backend ships. */
  mine: string[] = [];
  relevantToMe = false;
  segments: SavedSegment[] = [];
  captureMode: CaptureMode = 'full';
  origins: IssueOrigin[] = [];

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
    void this.fetchMyCriticals();
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
    this.mine = [];
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
  fetchMyCriticals = async () => {
    if (!this.projectId) return;
    const mine = await getMyCriticals(this.projectId);
    runInAction(() => {
      this.mine = mine;
    });
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

  // ---- per-user critical ("critical for me") + segments (NOT-YET-BACKED) ----
  /** the project/agent critical flag (server-owned), independent of my layer */
  agentCritical(id: string): boolean {
    return Boolean(this.byId(id)?.critical);
  }
  /** three-state critical: none -> project -> mine */
  critState(id: string): 'none' | 'project' | 'mine' {
    if (this.mine.includes(id)) return 'mine';
    return this.agentCritical(id) ? 'project' : 'none';
  }
  /** relevant = critical for me, or surfaced by a segment I own */
  isRelevant = (i: Issue): boolean =>
    this.mine.includes(i.id) ||
    (i.segmentId != null && Boolean(this.segmentById(i.segmentId)?.mine));
  /** count next to "Critical to me" — my personal criticals (segment finds are
      NOT-YET-BACKED, so not included yet) */
  get relevantCount(): number {
    return this.mine.length;
  }

  /** mark critical for me — personal layer only, never the project flag */
  markMine = (id: string) => {
    if (!this.mine.includes(id)) this.mine.push(id);
    if (this.projectId) void addMyCritical(this.projectId, id);
  };
  removeMine = (id: string) => {
    this.mine = this.mine.filter((x) => x !== id);
    if (this.projectId) void removeMyCritical(this.projectId, id);
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
  addCustomTag = (_name: string, _description: string) => {
    /* NOT-YET-BACKED: POST a custom journey-label definition */
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

  /** Marking is my personal layer only (never the project flag). Unmarking
      clears my layer, and lifts the project flag only where one exists — that
      removal carries the reason so the agent can learn. */
  setCritical = (
    id: string,
    val: boolean,
    reasons: string[] = [],
    note = '',
  ) => {
    if (!this.projectId) return;
    if (val) {
      this.markMine(id);
      return;
    }
    this.removeMine(id);
    if (this.agentCritical(id)) {
      this.afterMutation(id, { critical: false });
      void setIssueCritical(this.projectId, id, false, reasons, note)
        .then(() => this.refetch({ resetPage: false }))
        .catch((e) => console.error('Failed to set critical', e));
    }
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
