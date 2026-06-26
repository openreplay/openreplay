import { makeAutoObservable, runInAction } from 'mobx';

import {
  type RawIssue,
  getIssueSessions,
  getIssues,
  hideIssue,
  renameIssue,
} from 'App/components/SmartAlerts/api';
// BACKEND-PENDING: server-side tag filtering used getTagLabels (see the
// commented fetchLabels / allTags / setLabels blocks below).
// import { getTagLabels } from 'App/components/SmartAlerts/api';
import {
  makeIssue,
  makeIssueSessionCard,
} from 'App/components/SmartAlerts/factories';
import {
  type CategoryName,
  type Issue,
  type IssueSessionCard,
  type MatchMode,
  type SortMode,
  slugify,
} from 'App/components/SmartAlerts/shared/model';

/* Store behind the AI Issues surface. Issues + example sessions come from the
   /kai smart-alerts endpoints (the same ones the legacy IssuesSummary used),
   mapped through the factories in ./SmartAlerts/factories. The endpoints return
   less than the redesign needs, so a few fields (category, problem/fix text,
   last-seen) are defaulted until the backend extends them — the UI degrades
   gracefully. Critical toggle, rename and hide that the backend can't fully
   persist are tracked client-side here (see TODO.md). */

/* Selecting a category narrows to its significant issues (impact above this);
   "All" is unfiltered. Local rule until the backend scopes categories. */
const CATEGORY_IMPACT_MIN = 25;

export default class IssuesStore {
  projectId = '';
  raw: RawIssue[] = [];
  loading = false;
  loaded = false;
  // BACKEND-PENDING: all issue labels for server-side tag filtering.
  // labelsAll: string[] = [];

  /** example sessions per issue id (issueName), lazily loaded */
  sessions: Record<string, IssueSessionCard[]> = {};
  sessionsLoading: Record<string, boolean> = {};

  // ---- filters / ui (client-side, except `labels` which refetches) ----
  q = '';
  cats: CategoryName[] = [];
  labels: string[] = [];
  match: MatchMode = 'all';
  sort: SortMode = 'impact';
  critOnly = false;
  showHidden = false;

  // ---- client-side overrides (no backend persistence yet) ----
  hidden: string[] = [];
  names: Record<string, string> = {};
  dismissReasons: Record<string, string> = {};
  criticalOverride: Record<string, boolean> = {};
  criticalReasons: Record<string, string> = {};

  constructor() {
    makeAutoObservable(this);
  }

  init = (projectId: string) => {
    if (projectId === this.projectId && this.loaded) return;
    this.projectId = projectId;
    void this.fetchIssues();
    // BACKEND-PENDING: void this.fetchLabels();
  };

  fetchIssues = async () => {
    if (!this.projectId) return;
    this.loading = true;
    try {
      // tag filtering is done locally (see `list`); don't scope on the server.
      // BACKEND-PENDING: const data = await getIssues(this.projectId, this.labels);
      const data = await getIssues(this.projectId);
      runInAction(() => {
        this.raw = data;
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

  /* BACKEND-PENDING: fetched the full label set for server-side tag filtering.
     Re-add the getTagLabels import + labelsAll field + the init call, and swap
     `allTags` / `setLabels` back to their commented variants.
  fetchLabels = async () => {
    if (!this.projectId) return;
    try {
      const labels = await getTagLabels(this.projectId);
      runInAction(() => {
        this.labelsAll = labels;
      });
    } catch (e) {
      console.error('Failed to load issue labels', e);
    }
  };
  */

  loadSessions = async (id: string) => {
    if (this.sessions[id] || this.sessionsLoading[id]) return;
    this.sessionsLoading[id] = true;
    try {
      const rows = await getIssueSessions(this.projectId, id);
      runInAction(() => {
        this.sessions[id] = rows.map(makeIssueSessionCard);
      });
    } catch (e) {
      console.error('Failed to load issue sessions', e);
      runInAction(() => {
        this.sessions[id] = [];
      });
    } finally {
      runInAction(() => {
        this.sessionsLoading[id] = false;
      });
    }
  };

  /** Layer the user's client-side overrides (rename + critical toggle) onto a
      factory-built issue. */
  private decorate = (i: Issue): Issue => {
    const head = this.names[i.id] ?? i.head;
    const critical =
      i.id in this.criticalOverride ? this.criticalOverride[i.id] : i.critical;
    return head === i.head && critical === i.critical
      ? i
      : { ...i, head, critical };
  };

  // ---- derived ----
  get all(): Issue[] {
    return this.raw.map((d) => this.decorate(makeIssue(d)));
  }

  /** Tag options for the filter — the journey labels across loaded issues
      (filtered locally; no server label endpoint is used). */
  get allTags(): string[] {
    return [...new Set(this.all.flatMap((i) => i.journeyLabels))].sort();
    // BACKEND-PENDING: server-provided label set instead of local journey labels:
    // return [...new Set(this.labelsAll)].filter((t) => !isCriticalLabel(t)).sort();
  }

  /** Whether any issue carries a category (drives the category UI visibility). */
  get hasCategories(): boolean {
    return this.all.some((i) => Boolean(i.cat));
  }

  /** A selected category shows its significant issues (impact above the
      threshold); an issue can belong to several categories. The count next to
      each tab matches that filtered view. */
  catCount(c: CategoryName): number {
    return this.all.filter(
      (i) => i.categories.includes(c) && i.impact > CATEGORY_IMPACT_MIN,
    ).length;
  }

  get list(): Issue[] {
    let l = this.all;
    if (this.cats.length)
      l = l.filter(
        (i) =>
          i.categories.some((c) => this.cats.includes(c)) &&
          i.impact > CATEGORY_IMPACT_MIN,
      );
    if (this.labels.length)
      l = l.filter((i) =>
        this.match === 'any'
          ? this.labels.some((t) => i.journeyLabels.includes(t))
          : this.labels.every((t) => i.journeyLabels.includes(t)),
      );
    const q = this.q.toLowerCase().trim();
    if (q)
      l = l.filter((i) =>
        (i.head + i.tags.join() + (i.cat ?? '')).toLowerCase().includes(q),
      );
    return [...l].sort((a: Issue, b: Issue) => b.impact - a.impact);
  }

  byId(id: string): Issue | undefined {
    const d = this.raw.find((x) => x.issueName === id);
    return d ? this.decorate(makeIssue(d)) : undefined;
  }

  /** Resolve an issue from its URL slug by matching against loaded issues
      (the slug is lossy, so this needs the list to be fetched first). */
  bySlug(slug: string): Issue | undefined {
    const d = this.raw.find((x) => slugify(x.issueName) === slug);
    return d ? this.decorate(makeIssue(d)) : undefined;
  }

  exampleSessions(id: string): IssueSessionCard[] {
    return this.sessions[id] ?? [];
  }

  // ---- actions ----
  setQ = (q: string) => {
    this.q = q;
  };
  setSort = (s: SortMode) => {
    this.sort = s;
  };
  setMatch = (m: MatchMode) => {
    this.match = m;
  };
  setCats = (c: CategoryName[]) => {
    this.cats = c;
  };
  setLabels = (l: string[]) => {
    this.labels = l;
    // BACKEND-PENDING: refetch for server-side label filtering:
    // void this.fetchIssues();
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
  };
  setShowHidden = (v: boolean) => {
    this.showHidden = v;
  };

  rename = (id: string, name: string) => {
    this.names[id] = name;
    if (this.projectId) void renameIssue(this.projectId, id, name);
  };
  hide = (id: string, reason: string, tags: string[] = []) => {
    if (!this.hidden.includes(id)) this.hidden.push(id);
    this.dismissReasons[id] = [reason, ...tags].filter(Boolean).join(' · ');
    if (this.projectId) void hideIssue(this.projectId, id);
  };
  /** Client-only — there is no backend un-hide operation yet. */
  unhide = (id: string) => {
    this.hidden = this.hidden.filter((x) => x !== id);
    delete this.dismissReasons[id];
  };
  /** Client-only — no backend operation to set the critical flag yet. */
  setCritical = (id: string, val: boolean, reason = '') => {
    this.criticalOverride[id] = val;
    if (val) delete this.criticalReasons[id];
    else this.criticalReasons[id] = reason;
  };
}
