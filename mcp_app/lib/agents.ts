import {state} from "./state.js";
import {makeApiRequest} from "./api.js";

// Smart Issues and Smart Tests (the UI's "Agents" section). There's no UI view
// for these: tools return compact JSON and the model presents it. The frontend
// clients are the contract: frontend/app/components/SmartAlerts/api.ts and
// frontend/app/components/Client/SmartTests/api.ts.

const enc = encodeURIComponent;

function requireAuth() {
    if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
    }
}

function withQuery(endpoint: string, params: Record<string, string | number | boolean | undefined>): string {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") qs.set(key, String(value));
    }
    const s = qs.toString();
    return s ? `${endpoint}?${s}` : endpoint;
}

const appBase = () => state.appUrl.replace(/\/+$/, "");
const isoOrNull = (ms?: number | null) => (ms ? new Date(ms).toISOString() : null);

// Runner output is LLM-written and can run long; it all lands in context.
const clip = (s: string | null | undefined, max = 500) =>
    !s ? undefined : s.length > max ? `${s.slice(0, max)}…` : s;

// ---- Smart Issues: /v2/smart-issues/{projectId}, routed at the origin root (see buildApiUrl) ----

const issuesBase = (siteId: string) => `/v2/smart-issues/${enc(siteId)}`;

type LabelRatio = {name: string; ratio?: number};

// The UI only shows labels that hold for most of the issue's sessions; below
// that a label describes a minority variation. Same floor as SmartAlerts/factories.
const LABEL_RATIO_MIN = 70;
const strongLabels = (labels?: LabelRatio[]) =>
    (labels ?? []).filter((l) => (l.ratio ?? 0) >= LABEL_RATIO_MIN).map((l) => l.name);

const labelNames = (labels?: (string | {name: string})[]) =>
    (labels ?? []).map((l) => (typeof l === "string" ? l : l?.name)).filter(Boolean);

const impactLevel = (v: number) => (v >= 45 ? "high" : v >= 25 ? "medium" : "low");

function compactIssue(siteId: string, d: any) {
    return {
        issueId: d.issueId,
        name: d.issueName,
        description: d.issueDescription || undefined,
        category: d.category || d.categories?.[0],
        impact: d.impact ?? 0,
        impactLevel: impactLevel(d.impact ?? 0),
        severity: d.level || undefined,
        critical: Boolean(d.critical),
        hidden: Boolean(d.hidden),
        deleted: d.deleted || undefined,
        impactedSessions: d.impactedSessions ?? 0,
        occurrences: d.count ?? 0,
        firstSeen: isoOrNull(d.firstSeen),
        lastSeen: isoOrNull(d.lastSeen),
        issueLabels: strongLabels(d.issueLabels),
        journeyLabels: strongLabels(d.journeyLabels),
        url: `${appBase()}/${siteId}/smart-issues/${d.issueId}`,
    };
}

function compactIssueSession(siteId: string, issueId: string, s: any) {
    // issueTimestamp is either an offset or an absolute epoch; the player tells
    // them apart by comparing against the duration (IssuePlayer.tsx).
    const ts = s.issueTimestamp;
    const duration = s.duration ?? 0;
    const issueAtMs = ts ? Math.max(duration && ts > duration ? ts - (s.startTs ?? 0) : ts, 0) : undefined;
    return {
        sessionId: String(s.sessionId),
        startedAt: isoOrNull(s.startTs),
        durationMs: s.duration ?? undefined,
        userId: s.userId || undefined,
        userBrowser: s.userBrowser,
        userOs: s.userOs,
        userDeviceType: s.userDeviceType,
        userCountry: s.userCountry,
        userCity: s.userCity || undefined,
        summary: s.journeySummary || undefined,
        description: clip(s.description, 1000),
        journeyLabels: labelNames(s.journeyLabels),
        issueAtMs,
        journeySteps: (s.journeySteps ?? []).map((st: any) => ({name: st.name, atMs: st.relativeTimestamp})),
        replayUrl: `${appBase()}/${siteId}/smart-issues/${issueId}/session/${s.sessionId}`,
    };
}

export interface SmartIssueListOptions {
    range: [number, number];
    limit: number;
    page: number;
    sortBy: string;
    visibility: string;
    query?: string;
    category?: string;
    critical?: boolean;
}

export async function fetchSmartIssues(siteId: string, opts: SmartIssueListOptions) {
    requireAuth();
    const json = await makeApiRequest(issuesBase(siteId), {
        method: "POST",
        body: JSON.stringify({
            limit: opts.limit,
            page: opts.page,
            issueLabels: [],
            journeyLabels: [],
            issueLabelsMatch: "and",
            journeyLabelsMatch: "and",
            sortBy: opts.sortBy,
            sortDir: "desc",
            range: opts.range,
            hidden: opts.visibility,
            minImpact: 0,
            minCount: 0,
            query: opts.query ?? "",
            ...(opts.category ? {category: opts.category} : {}),
            ...(opts.critical ? {critical: true} : {}),
        }),
    });
    const rows: any[] = json.data ?? [];
    return {
        total: json.total ?? rows.length,
        categoryCounts: json.categoryCounts ?? undefined,
        issues: rows.map((d) => compactIssue(siteId, d)),
    };
}

export async function fetchSmartIssue(
    siteId: string,
    issueId: string,
    range: [number, number],
    sessions: {limit: number; query?: string},
) {
    requireAuth();
    const [issueJson, sessionsJson] = await Promise.all([
        makeApiRequest(withQuery(`${issuesBase(siteId)}/issue`, {id: issueId, startMs: range[0], endMs: range[1]})),
        makeApiRequest(`${issuesBase(siteId)}/search`, {
            method: "POST",
            body: JSON.stringify({
                issueId,
                // a non-null query switches the backend to vector search + LLM re-rank
                query: sessions.query || null,
                issueLabels: [],
                journeyLabels: [],
                journeyLabelsMatch: "and",
                sortBy: "time",
                sortDir: "desc",
                range,
                limit: sessions.limit,
                page: 1,
            }),
        }),
    ]);
    if (!issueJson.data) {
        throw new Error(`Smart issue ${issueId} not found in project ${siteId}`);
    }
    const rows: any[] = sessionsJson.data ?? [];
    return {
        issue: compactIssue(siteId, issueJson.data),
        sessionsTotal: sessionsJson.total ?? rows.length,
        sessions: rows.map((s) => compactIssueSession(siteId, issueId, s)),
    };
}

// ---- Smart Tests: /v2/api/{projectId}/browser-tests (responses are not wrapped in `data`) ----

const testsBase = (siteId: string) => `/v2/api/${enc(siteId)}/browser-tests`;

type EnvInfo = {name: string; baseUrl: string};

// Tests and runs carry environment ids only. Variables are left out on purpose:
// they hold the runner's login credentials and headers.
async function fetchEnvironments(siteId: string): Promise<Map<string, EnvInfo>> {
    try {
        const json = await makeApiRequest(withQuery(`${testsBase(siteId)}/environments`, {limit: 100}));
        return new Map((json.items ?? []).map((e: any) => [e.environmentId, {name: e.name, baseUrl: e.baseUrl}]));
    } catch (err) {
        console.error(`[SERVER] Could not load test environments for site ${siteId}:`, err);
        return new Map();
    }
}

const testUrl = (siteId: string, testId: string) => `${appBase()}/${siteId}/test-agents?tab=tests&test=${enc(testId)}`;
const runUrl = (siteId: string, runId: string) => `${appBase()}/${siteId}/test-agents?tab=runs&run=${enc(runId)}`;

const stepLines = (steps: unknown): string[] => {
    if (!steps) return [];
    if (Array.isArray(steps)) return steps.map((s) => (typeof s === "string" ? s : JSON.stringify(s)));
    if (typeof steps === "string") return steps.split("\n").filter((l) => l.trim() !== "");
    return [JSON.stringify(steps)];
};

const stringList = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : undefined;

function compactTest(siteId: string, t: any, envs: Map<string, EnvInfo>) {
    return {
        testId: t.testId,
        name: t.name,
        status: t.status,
        needsReview: t.needsReview || undefined,
        pendingVersion: t.suggestion?.version,
        tags: t.tags?.length ? t.tags : undefined,
        schedule: t.cron || null,
        environments: (t.environments ?? []).map((id: string) => envs.get(id)?.name ?? id),
        resolutions: stringList(t.config?.resolutions),
        regions: stringList(t.config?.regions),
        hasSideEffects: t.hasSideEffects || undefined,
        lastRunAt: t.lastRunAt ?? null,
        nextRunAt: t.nextRunAt ?? null,
        url: testUrl(siteId, t.testId),
    };
}

function compactRun(siteId: string, r: any, envs: Map<string, EnvInfo>) {
    return {
        runId: r.runId,
        testId: r.testId,
        testName: r.testName,
        status: r.status,
        startedAt: r.startedAt ?? null,
        finishedAt: r.finishedAt ?? null,
        durationMs: r.durationMs || undefined,
        version: r.version ?? undefined,
        screenType: r.screenType,
        region: r.region ?? undefined,
        environment: r.environmentId ? (envs.get(r.environmentId)?.name ?? r.environmentId) : undefined,
        tags: r.tags?.length ? r.tags : undefined,
        batchId: r.batchId ?? undefined,
        url: runUrl(siteId, r.runId),
    };
}

export interface SmartTestListOptions {
    limit: number;
    page: number;
    name?: string;
    status?: string;
    tags?: string[];
    needsReview?: boolean;
}

export async function fetchSmartTests(siteId: string, opts: SmartTestListOptions) {
    requireAuth();
    const [json, envs] = await Promise.all([
        makeApiRequest(withQuery(`${testsBase(siteId)}/tests`, {
            limit: opts.limit,
            page: opts.page,
            sortField: "updated_at",
            sortOrder: "desc",
            name: opts.name,
            status: opts.status,
            tags: opts.tags?.join(","),
            needsReview: opts.needsReview,
        })),
        fetchEnvironments(siteId),
    ]);
    const items: any[] = json.items ?? [];
    return {
        total: json.total ?? items.length,
        tests: items.map((t) => compactTest(siteId, t, envs)),
    };
}

export async function fetchSmartTest(siteId: string, testId: string, runsLimit: number) {
    requireAuth();
    const base = testsBase(siteId);
    const [t, runs, envs] = await Promise.all([
        makeApiRequest(`${base}/tests/${enc(testId)}`),
        makeApiRequest(withQuery(`${base}/tests/${enc(testId)}/runs`, {
            limit: runsLimit,
            sortField: "started_at",
            sortOrder: "desc",
        })),
        fetchEnvironments(siteId),
    ]);
    return {
        test: {
            ...compactTest(siteId, t, envs),
            scenario: t.scenario || undefined,
            steps: stepLines(t.steps),
            expectedResult: t.expectedResult || undefined,
            environments: (t.environments ?? []).map((id: string) => envs.get(id) ?? {name: id}),
            timeoutSecs: t.timeoutSecs,
            activeVersion: t.activeVersion ?? undefined,
            latestVersion: t.latestVersion ?? undefined,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
        },
        runsTotal: runs.total ?? 0,
        recentRuns: (runs.items ?? []).map((r: any) => compactRun(siteId, r, envs)),
    };
}

export interface SmartTestRunListOptions {
    limit: number;
    page: number;
    testId?: string;
    status?: string[];
    name?: string;
    from?: string;
    to?: string;
}

export async function fetchSmartTestRuns(siteId: string, opts: SmartTestRunListOptions) {
    requireAuth();
    const [json, envs] = await Promise.all([
        makeApiRequest(withQuery(`${testsBase(siteId)}/runs`, {
            limit: opts.limit,
            page: opts.page,
            sortField: "started_at",
            sortOrder: "desc",
            testId: opts.testId,
            status: opts.status?.join(","),
            name: opts.name,
            from: opts.from,
            to: opts.to,
        })),
        fetchEnvironments(siteId),
    ]);
    const items: any[] = json.items ?? [];
    return {
        total: json.total ?? items.length,
        runs: items.map((r) => compactRun(siteId, r, envs)),
    };
}

const compactAction = (a: any) => ({
    action: clip(a.action),
    status: a.status,
    durationMs: a.duration_ms,
    error: clip(a.error),
});

// The runner's results.json: human steps in `user_steps`, each expanding into
// agent actions (indices into `agent_steps`). Runs predating `user_steps` only
// have the flat actions, tagged with `user_step_index`.
function runSteps(results: any) {
    const agentSteps: any[] = Array.isArray(results?.agent_steps) ? results.agent_steps : [];
    if (Array.isArray(results?.user_steps) && results.user_steps.length) {
        return results.user_steps.map((us: any) => ({
            step: us.description,
            status: us.status,
            error: clip(us.error),
            actions: (us.agent_steps ?? []).map((i: number) => agentSteps[i]).filter(Boolean).map(compactAction),
        }));
    }
    const groups = new Map<number | string, any[]>();
    agentSteps.forEach((a, i) => {
        const key = a.user_step_index ?? `agent-${i}`;
        groups.set(key, [...(groups.get(key) ?? []), a]);
    });
    return [...groups.values()].map((actions) => ({
        step: actions[0].user_step_text || actions[0].action,
        status: actions.find((a) => a.status === "failed" || a.status === "error")?.status ?? actions[0].status,
        actions: actions.map(compactAction),
    }));
}

const MAX_FAILED_REQUESTS = 20;

function failedRequests(results: any) {
    const seen = new Set<string>();
    const out: {method: string; url: string; status: number}[] = [];
    for (const a of results?.agent_steps ?? []) {
        for (const r of a.failed_requests ?? []) {
            const key = `${r.method} ${r.url} ${r.status}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({method: r.method, url: clip(r.url, 300)!, status: r.status});
        }
    }
    return {total: out.length, requests: out.slice(0, MAX_FAILED_REQUESTS)};
}

export async function fetchSmartTestRun(siteId: string, runId: string) {
    requireAuth();
    const [d, envs] = await Promise.all([
        makeApiRequest(`${testsBase(siteId)}/runs/${enc(runId)}`),
        fetchEnvironments(siteId),
    ]);
    const results = d.results ?? null;
    const failed = failedRequests(results);
    return {
        ...compactRun(siteId, d, envs),
        durationMs: d.durationMs || results?.duration_ms || undefined,
        summary: results?.final_result,
        error: clip(results?.failed_step_error, 2000) || (results?.errors?.length ? clip(results.errors.join("\n"), 2000) : undefined),
        failedStep: typeof results?.failed_step_index === "number"
            ? {index: results.failed_step_index, step: results.failed_step_text}
            : undefined,
        steps: results ? runSteps(results) : [],
        jsErrors: (results?.js_errors ?? []).slice(0, 20).map((e: string) => clip(e)),
        failedRequests: failed.total ? failed : undefined,
        resultsMissing: results ? undefined : true,
    };
}

export async function triggerSmartTestRun(siteId: string, testId: string) {
    requireAuth();
    return makeApiRequest(`${testsBase(siteId)}/tests/${enc(testId)}/trigger`, {
        method: "POST",
        body: "{}",
    });
}
