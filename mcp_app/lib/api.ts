import {state, createPollAbortController} from "./state.js";
import {resolveCountryValue} from "./countries.js";

// Build a full API URL from the user-facing OpenReplay URL and an endpoint path.
//
// Two deployment shapes:
//   SaaS:        UI = app.openreplay.com   API = api.openreplay.com         (no /api segment in paths)
//   Self-hosted: UI = <host>               API = <host>/api                 (paths keep /api)
//
// Endpoint paths in this codebase use the self-hosted style with `/api` baked
// in (e.g. `/v2/api/<siteId>/...`, `/api/v1/login`, plain `/projects`). On
// SaaS we strip that `/api` segment so the path becomes `/v2/<siteId>/...`,
// `/v1/login`, etc., matching api.openreplay.com's routing.
export function buildApiUrl(appUrl: string, endpoint: string): string {
    const trimmed = appUrl.replace(/\/+$/, '');
    let isSaas = false;
    let host = trimmed;

    try {
        const u = new URL(trimmed);
        if (u.hostname === 'app.openreplay.com') {
            isSaas = true;
            host = `${u.protocol}//api.openreplay.com`;
        }
    } catch {
        // fall through and treat as self-hosted
    }

    if (isSaas) {
        const path = endpoint
            .replace(/^\/v2\/api\//, '/v2/')
            .replace(/^\/api\//, '/');
        return `${host}${path}`;
    }

    // Self-hosted: paths starting with /v2/api/ or /api/ already include the
    // prefix; bare paths get /api prepended.
    if (endpoint.startsWith('/v2/api/') || endpoint.startsWith('/api/')) {
        return `${host}${endpoint}`;
    }
    return `${host}/api${endpoint}`;
}

// Helper function to make authenticated API requests
export async function makeApiRequest(endpoint: string, options: RequestInit = {}) {
    const url = buildApiUrl(state.appUrl, endpoint);
    const headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        ...(state.jwt ? {"Authorization": `Bearer ${state.jwt}`} : {}),
        ...options.headers,
    };

    console.error(`[SERVER] Making API request to: ${url}`);

    const response = await fetch(url, {...options, headers});

    if (!response.ok) {
        const error = await response.text();
        console.error(`[SERVER] API request failed: ${response.status} ${response.statusText}`);

        // Check if it's an auth error
        if (response.status === 401 || response.status === 403) {
            throw new Error(`AUTH_ERROR: ${response.status} ${response.statusText}`);
        }

        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${error}`);
    }

    return response.json();
}

// --- Filter helpers ---

// Fetch filter definitions for a project
export async function fetchFilters(siteId: string) {
    console.error(`[SERVER] Fetching filters for site ${siteId}...`);

    if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
    }

    const {data} = await makeApiRequest(`/pa/${siteId}/filters`);
    state.projectFilters[siteId] = data;
    console.error(`[SERVER] Cached filters for site ${siteId}`);
    return data;
}

// Get filters from cache or fetch them
export async function getOrFetchFilters(siteId: string) {
    if (state.projectFilters[siteId]) {
        return state.projectFilters[siteId];
    }
    try {
        return await fetchFilters(siteId);
    } catch (err) {
        console.error(`[SERVER] Failed to fetch filters for site ${siteId}:`, err);
        return null;
    }
}

type ModelPropertyFilter = {
    name: string;
    value?: Array<string | number>;
    operator?: string;
};

type ModelFilter = ModelPropertyFilter & {
    properties?: ModelPropertyFilter[];
};

function resolveValues(name: string, value: Array<string | number> | undefined): Array<string | number> {
    if (!value) return [];
    if (name === "userCountry") {
        return value.map((v) => (typeof v === "string" ? resolveCountryValue(v) : v));
    }
    return value;
}

// Resolve simplified model filters into full API filter objects.
// Events are identified by their category in the /filters response (the
// `events` category) — the API definitions themselves don't carry an
// `isEvent` flag. Event filters can carry `properties`, which we render
// into the API's nested `filters` array (sub-filters), looking up each
// property's dataType in the `event` (Event Properties) category.
export async function resolveFilters(
    siteId: string,
    modelFilters: ModelFilter[],
): Promise<any[]> {
    const filterDefs = await getOrFetchFilters(siteId);
    if (!filterDefs) return [];

    // Index defs by name, remembering which category they came from.
    // First-seen wins so events take precedence over same-named entries
    // elsewhere (e.g. session-level "duration" vs event property "duration").
    const defsByName: Record<string, { def: any; category: string }> = {};
    for (const [categoryName, category] of Object.entries(filterDefs) as [string, any][]) {
        if (!category?.list) continue;
        for (const def of category.list) {
            if (!defsByName[def.name]) {
                defsByName[def.name] = { def, category: categoryName };
            }
        }
    }

    // Event properties live in the `event` category — used to look up
    // dataType/autoCaptured for sub-filters inside an event.
    const eventPropertyDefs: Record<string, any> = {};
    const eventCategory = (filterDefs as any).event;
    if (eventCategory?.list) {
        for (const def of eventCategory.list) {
            eventPropertyDefs[def.name] = def;
        }
    }

    const buildPropertyFilter = (sf: ModelPropertyFilter) => {
        const def = eventPropertyDefs[sf.name] || defsByName[sf.name]?.def;
        return {
            value: resolveValues(sf.name, sf.value),
            operator: sf.operator || "is",
            dataType: def?.dataType || "string",
            propertyOrder: "and",
            filters: [],
            isEvent: false,
            name: sf.name,
            autoCaptured: def?.autoCaptured ?? true,
            isSegment: false,
        };
    };

    return modelFilters.map((mf) => {
        const lookup = defsByName[mf.name];
        const def = lookup?.def;
        const isEvent = lookup?.category === "events";

        const subFilters = (mf.properties || []).map(buildPropertyFilter);

        // When an event has properties, the top-level value is empty —
        // the actual filtering happens via sub-filters.
        const topValue = subFilters.length > 0 ? [] : resolveValues(mf.name, mf.value);

        return {
            value: topValue,
            operator: mf.operator || "is",
            dataType: def?.dataType || "string",
            propertyOrder: "and",
            filters: subFilters,
            isEvent,
            name: mf.name,
            autoCaptured: def?.autoCaptured ?? true,
            isSegment: false,
        };
    });
}

// --- Data fetching ---

// Fetch recent sessions from OpenReplay
export async function fetchRecentSessions(siteId: string = "5", limit: number = 10, filters: any[] = []) {
    console.error(`[SERVER] Fetching recent sessions for site ${siteId}...`);

    if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
    }

    const now = Date.now();
    const yesterday = now - 24 * 60 * 60 * 1000;

    const searchPayload = {
        filters: filters,
        rangeValue: "LAST_24_HOURS",
        startDate: yesterday,
        endDate: now,
        sort: "startTs",
        order: "desc",
        viewed: false,
        eventsOrder: "then",
        limit,
        startTimestamp: Math.floor(yesterday / 1000) * 1000,
        endTimestamp: Math.floor(now / 1000) * 1000,
        page: 1,
    };

    const {data} = await makeApiRequest(`/v2/api/${siteId}/sessions/search`, {
        method: "POST",
        body: JSON.stringify(searchPayload),
    });

    console.error(`[SERVER] Found ${data.sessions?.length || 0} sessions`);

    if (!data.sessions || data.sessions.length === 0) {
        console.error('Used params', siteId, searchPayload, "\n data", data);
        throw new Error("No sessions found in the last 24 hours");
    }

    // Construct player URLs for each session — use the UI URL directly.
    const baseUrl = state.appUrl.replace(/\/+$/, '');
    const jwt = state.jwt!; // Already checked above

    const sessions = data.sessions.map((session: any) => ({
        ...session,
        replayUrl: `${baseUrl}/${siteId}/session/${session.sessionId}?jwt=${encodeURIComponent(jwt)}`,
    }));

    console.error(`[SERVER] Returning ${sessions.length} sessions`);

    return sessions;
}

// Fetch projects from OpenReplay
export async function fetchProjects() {
    console.error("[SERVER] Fetching projects...");

    if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
    }

    const {data} = await makeApiRequest("/projects");
    console.error(`[SERVER] Found ${data.length || 0} projects`);

    // Store projects in state
    state.projects = data.map((project: any) => ({
        projectId: String(project.projectId),
        name: project.name,
    }));

    return state.projects;
}

// Fetch sessions timeseries chart data
export async function fetchSessionsTimeseries(
    siteId: string,
    startTimestamp: number,
    endTimestamp: number,
    density: number = 24,
    filters: any[] = [],
) {
    console.error(`[SERVER] Fetching sessions timeseries for site ${siteId} (${startTimestamp} - ${endTimestamp}, density: ${density})...`);

    if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
    }

    const payload = {
        startTimestamp,
        endTimestamp,
        density,
        metricOf: "sessionCount",
        metricType: "timeseries",
        metricFormat: "sessionCount",
        viewType: "lineChart",
        name: "Sessions Over Time",
        series: [
            {
                seriesId: null,
                name: "Sessions",
                filter: {
                    filters: filters,
                    excludes: [],
                    eventsOrder: "then",
                    startTimestamp: 0,
                    endTimestamp: 0,
                    page: 1,
                    limit: 10,
                },
            },
        ],
        page: 1,
        limit: 20,
        sortOrder: "desc",
    };

    const {data} = await makeApiRequest(`/v2/api/${siteId}/cards/try`, {
        method: "POST",
        body: JSON.stringify(payload),
    });

    console.error(`[SERVER] Got ${data?.length || 0} timeseries data points`);
    return data;
}

// Fetch path analysis (user journey / sankey) data
export async function fetchPathAnalysis(
    siteId: string,
    startTimestamp: number,
    endTimestamp: number,
    startPoint?: string,
    filters: any[] = [],
) {
    console.error(`[SERVER] Fetching path analysis for site ${siteId} (start point: ${startPoint || "auto"})...`);

    if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
    }

    const payload = {
        startTimestamp,
        endTimestamp,
        density: 5,
        metricOf: "sessionCount",
        metricValue: [],
        metricType: "pathAnalysis",
        metricFormat: "sessionCount",
        viewType: "lineChart",
        name: "User Journey",
        series: [
            {
                name: "Series 1",
                filter: {
                    filters: filters,
                    excludes: [],
                    eventsOrder: "then",
                    startTimestamp: 0,
                    endTimestamp: 0,
                    page: 1,
                    limit: 10,
                },
            },
        ],
        page: 1,
        rows: 5,
        stepsBefore: 0,
        stepsAfter: 5,
        columns: 4,
        limit: 20,
        sortOrder: "desc",
        hideExcess: true,
        startType: "start",
        startPoint: [
            {
                value: startPoint ? [startPoint] : [],
                operator: "is",
                dataType: "string",
                propertyOrder: "and",
                filters: [],
                isEvent: true,
                name: "LOCATION",
                autoCaptured: true,
            },
        ],
        excludes: [],
    };

    const {data} = await makeApiRequest(`/v2/api/${siteId}/cards/try`, {
        method: "POST",
        body: JSON.stringify(payload),
    });

    console.error(`[SERVER] Got path analysis: ${data?.nodes?.length || 0} nodes, ${data?.links?.length || 0} links`);
    return data;
}

// Fetch Web Vitals data
export async function fetchWebVitals(
    siteId: string,
    startTimestamp: number,
    endTimestamp: number,
    filters: any[] = [],
) {
    console.error(`[SERVER] Fetching web vitals for site ${siteId}...`);

    if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
    }

    // LOCATION event filter is required by the web vitals endpoint
    const locationFilter = {
        value: [],
        operator: "is",
        dataType: "string",
        propertyOrder: "and",
        filters: [],
        isEvent: true,
        name: "LOCATION",
        autoCaptured: true,
    };

    const payload = {
        startTimestamp,
        endTimestamp,
        density: 24,
        metricOf: "webVitalUrl",
        metricValue: [],
        metricType: "webVital",
        metricFormat: "sessionCount",
        viewType: "chart",
        name: "Web Vitals",
        series: [
            {
                name: "Series 1",
                filter: {
                    filters: [locationFilter, ...filters],
                    excludes: [],
                    eventsOrder: "then",
                    startTimestamp: 0,
                    endTimestamp: 0,
                    page: 1,
                    limit: 10,
                },
            },
        ],
        page: 1,
        limit: 20,
        sortOrder: "desc",
    };

    const {data} = await makeApiRequest(`/v2/api/${siteId}/cards/try`, {
        method: "POST",
        body: JSON.stringify(payload),
    });

    console.error(`[SERVER] Got web vitals data: ${Object.keys(data || {}).join(", ")}`);
    return data;
}

// Fetch table data (top pages, top browsers, top countries, top requests, etc.)
export async function fetchTableData(
    siteId: string,
    startTimestamp: number,
    endTimestamp: number,
    metricOf: string,
    limit: number = 20,
    filters: any[] = [],
) {
    console.error(`[SERVER] Fetching table data for site ${siteId}, metricOf=${metricOf}...`);

    if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
    }

    const payload = {
        startTimestamp,
        endTimestamp,
        density: 24,
        metricOf,
        metricValue: [],
        metricType: "table",
        metricFormat: "sessionCount",
        viewType: "table",
        name: `Top ${metricOf}`,
        series: [
            {
                name: "Series 1",
                filter: {
                    filters: filters,
                    excludes: [],
                    eventsOrder: "and",
                    startTimestamp: 0,
                    endTimestamp: 0,
                    page: 1,
                    limit: 10,
                },
            },
        ],
        page: 1,
        rows: 5,
        limit,
        sortOrder: "desc",
    };

    const {data} = await makeApiRequest(`/v2/api/${siteId}/cards/try`, {
        method: "POST",
        body: JSON.stringify(payload),
    });

    console.error(`[SERVER] Got table data: ${data?.values?.length || 0} values, total=${data?.total || 0}`);
    return data;
}

// Build a property sub-filter object (e.g. urlPath, label) for an event step.
function buildPropertySubFilter(name: string, value: string, operator: string) {
    return {
        value: [value],
        operator,
        dataType: "string",
        propertyOrder: "and",
        filters: [],
        isEvent: false,
        name,
        autoCaptured: true,
        isSegment: false,
    };
}

// Each built-in autoCaptured event with a "natural" sub-filter property.
// LOCATION → urlPath, CLICK/INPUT → label. Other autoCaptured events
// (ISSUE, ERROR, REQUEST, PERFORMANCE) get the value at top-level.
const FUNNEL_STEP_PROPERTY: Record<string, string> = {
    LOCATION: "urlPath",
    CLICK: "label",
    INPUT: "label",
};

export type FunnelStepInput = string | { type: string; value?: string; operator?: string };

// Resolve user-friendly funnel step descriptors into the API's filter shape.
// A bare string is shorthand for a LOCATION step matching a URL path.
// Object steps select an event by name; for autoCaptured=false (custom)
// events the value is ignored — only the event name is sent.
export async function resolveFunnelSteps(
    siteId: string,
    steps: FunnelStepInput[],
): Promise<any[]> {
    const filterDefs = await getOrFetchFilters(siteId);

    const eventDefs: Record<string, any> = {};
    const eventCategory = (filterDefs as any)?.events;
    if (eventCategory?.list) {
        for (const def of eventCategory.list) {
            eventDefs[def.name] = def;
        }
    }

    return steps.map((step) => {
        const isShorthand = typeof step === "string";
        const eventName = isShorthand ? "LOCATION" : step.type;
        const value = isShorthand ? step : step.value;
        const operator = isShorthand ? "is" : (step.operator || "is");

        const def = eventDefs[eventName];
        // Trust the project's filter defs; if the event isn't there, assume
        // it's a built-in (autoCaptured=true) and let the API surface any error.
        const autoCaptured = def?.autoCaptured ?? true;

        // Custom events (autoCaptured=false) — bare event reference, no value/sub-filters.
        if (!autoCaptured) {
            return {
                value: [],
                operator: "is",
                dataType: def?.dataType || "string",
                propertyOrder: "and",
                filters: [],
                isEvent: true,
                name: eventName,
                autoCaptured: false,
                isSegment: false,
            };
        }

        // autoCaptured event with a "natural" sub-filter (LOCATION/CLICK/INPUT).
        const propertyName = FUNNEL_STEP_PROPERTY[eventName];
        const subFilters = propertyName && value
            ? [buildPropertySubFilter(propertyName, value, operator)]
            : [];

        // Top-level value is empty when sub-filters carry the value.
        const topValue = subFilters.length === 0 && value ? [value] : [];

        return {
            value: topValue,
            operator: subFilters.length > 0 ? "is" : operator,
            dataType: def?.dataType || "string",
            propertyOrder: "and",
            filters: subFilters,
            isEvent: true,
            name: eventName,
            autoCaptured: true,
            isSegment: false,
        };
    });
}

// Fetch funnel data (step-by-step conversion)
export async function fetchFunnel(
    siteId: string,
    startTimestamp: number,
    endTimestamp: number,
    stepFilters: any[],
    filters: any[] = [],
) {
    console.error(`[SERVER] Fetching funnel for site ${siteId}, ${stepFilters.length} step(s)...`);

    if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
    }

    const payload = {
        startTimestamp,
        endTimestamp,
        density: 24,
        metricOf: "sessionCount",
        metricValue: [],
        metricType: "funnel",
        metricFormat: "sessionCount",
        viewType: "chart",
        name: "Funnel Analysis",
        series: [
            {
                name: "Series 1",
                filter: {
                    filters: [...stepFilters, ...filters],
                    excludes: [],
                    eventsOrder: "then",
                    startTimestamp: 0,
                    endTimestamp: 0,
                    page: 1,
                    limit: 10,
                },
            },
        ],
        page: 1,
        limit: 20,
        sortOrder: "desc",
    };

    const {data} = await makeApiRequest(`/v2/api/${siteId}/cards/try`, {
        method: "POST",
        body: JSON.stringify(payload),
    });

    console.error(`[SERVER] Got funnel data: ${data?.stages?.length || 0} stages`);
    return data;
}

// Fetch session replay metadata
export async function fetchSessionReplay(siteId: string, sessionId: string) {
    console.error(`[SERVER] Fetching session replay for ${sessionId} in site ${siteId}...`);

    if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
    }

    const {data} = await makeApiRequest(`/v2/api/${siteId}/sessions/${sessionId}/replay`);
    return data;
}

// Fetch session events (errors, events, incidents, issues, userEvents)
export async function fetchSessionEvents(siteId: string, sessionId: string) {
    console.error(`[SERVER] Fetching session events for ${sessionId} in site ${siteId}...`);

    if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
    }

    const {data} = await makeApiRequest(`/v2/api/${siteId}/sessions/${sessionId}/events`);
    return data;
}

// Fetch recent events (data management / analytics)
export async function fetchEvents(
    siteId: string,
    startTimestamp: number,
    endTimestamp: number,
    limit: number = 50,
    page: number = 1,
    filters: any[] = [],
) {
    console.error(`[SERVER] Fetching events for site ${siteId}...`);

    if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
    }

    const payload = {
        sortOrder: "desc",
        sortBy: "created_at",
        limit,
        startTimestamp,
        endTimestamp,
        columns: ["$city", "$os", "$auto_captured", "$user_id"],
        page,
        filters,
    };

    const {data} = await makeApiRequest(`/${siteId}/events`, {
        method: "POST",
        body: JSON.stringify(payload),
    });

    console.error(`[SERVER] Got ${data?.events?.length || 0} events (total: ${data?.total || 0})`);
    return data;
}

// Fetch users (data management / analytics)
export async function fetchUsers(
    siteId: string,
    startTimestamp: number,
    endTimestamp: number,
    limit: number = 50,
    page: number = 1,
    query: string = "",
    filters: any[] = [],
) {
    console.error(`[SERVER] Fetching users for site ${siteId}...`);

    if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
    }

    const payload = {
        sortOrder: "desc",
        sortBy: "$created_at",
        limit,
        startTimestamp,
        endTimestamp,
        columns: ["$avatar", "$email", "$state", "$city", "$country", "$created_at", "$name", "$last_seen"],
        page,
        filters,
        query,
    };

    const {data} = await makeApiRequest(`/${siteId}/users`, {
        method: "POST",
        body: JSON.stringify(payload),
    });

    console.error(`[SERVER] Got ${data?.users?.length || 0} users (total: ${data?.total || 0})`);
    return data;
}

// Fetch event properties (custom properties tracked for a given event)
export async function fetchEventProperties(siteId: string) {
    console.error(`[SERVER] Fetching event properties for site ${siteId}...`);

    if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
    }

    const {data} = await makeApiRequest(`/pa/${siteId}/filters`);

    // Extract event-type filters (custom events and their properties)
    const events = (data || []).filter((f: any) => f.isEvent);
    const attributes = (data || []).filter((f: any) => !f.isEvent);

    console.error(`[SERVER] Got ${events.length} events, ${attributes.length} attributes`);
    return {events, attributes};
}

export interface PollAttempt {
    attempt: number;
    status: number | null;       // HTTP status, or null if fetch threw
    elapsedMs: number;
    body: string;                // truncated to 200 chars
    error?: string;              // non-AbortError fetch errors
}

// Compact summary suitable for embedding in a tool response. Avoids per-attempt
// arrays so the JSON fits inside Claude Desktop's log truncation budget.
export interface PollSummary {
    totalAttempts: number;
    statusCounts: Record<string, number>;   // e.g. { "404": 30 } or { "fetch_error": 30 }
    lastStatus: number | "fetch_error" | null;
    lastBody: string;                       // truncated
    firstError?: string;                    // first non-Abort fetch error
}

export interface PollAuthResult {
    jwt: string | null;
    statusUrl: string;
    summary: PollSummary;
    durationMs: number;
    aborted: boolean;
    timedOut: boolean;
}

function summarize(trace: PollAttempt[]): PollSummary {
    const statusCounts: Record<string, number> = {};
    let lastStatus: number | "fetch_error" | null = null;
    let lastBody = "";
    let firstError: string | undefined;

    for (const a of trace) {
        if (a.error) {
            statusCounts["fetch_error"] = (statusCounts["fetch_error"] || 0) + 1;
            lastStatus = "fetch_error";
            if (!firstError) firstError = a.error;
        } else {
            const key = String(a.status);
            statusCounts[key] = (statusCounts[key] || 0) + 1;
            lastStatus = a.status;
            lastBody = a.body || "<empty>";
        }
    }

    return {
        totalAttempts: trace.length,
        statusCounts,
        lastStatus,
        lastBody: lastBody.length > 200 ? lastBody.slice(0, 200) + "...(truncated)" : lastBody,
        firstError,
    };
}

// Poll the backend for browser-based auth approval.
// `appUrl` is the user-facing OpenReplay URL — the API host is derived via getApiBase.
export async function pollForAuth(
    appUrl: string,
    authCode: string,
    clientId: string,
    timeoutMs: number = 60_000,
    intervalMs: number = 2_000,
): Promise<PollAuthResult> {
    const abortController = createPollAbortController();
    const startedAt = Date.now();
    const deadline = startedAt + timeoutMs;
    const statusUrl = `${buildApiUrl(appUrl, '/v1/mcp/auth-status')}?state=${authCode}&client_id=${clientId}`;
    const trace: PollAttempt[] = [];

    console.error(`[POLL] Starting auth polling`);
    console.error(`[POLL]   url: ${statusUrl}`);
    console.error(`[POLL]   timeout: ${timeoutMs}ms, interval: ${intervalMs}ms, deadline: ${new Date(deadline).toISOString()}`);

    let attempt = 0;
    while (Date.now() < deadline) {
        attempt++;
        if (abortController.signal.aborted) {
            console.error(`[POLL] [#${attempt}] aborted before fetch`);
            return { jwt: null, statusUrl, summary: summarize(trace), durationMs: Date.now() - startedAt, aborted: true, timedOut: false };
        }

        const attemptStart = Date.now();
        try {
            const res = await fetch(statusUrl, {signal: abortController.signal});
            const elapsedMs = Date.now() - attemptStart;
            const bodyText = await res.text().catch(() => "");
            const remaining = Math.max(0, deadline - Date.now());
            const truncatedBody = bodyText.length > 200 ? bodyText.slice(0, 200) + "...(truncated)" : bodyText;

            console.error(
                `[POLL] [#${attempt}] status=${res.status} elapsed=${elapsedMs}ms remaining=${remaining}ms ` +
                `body=${truncatedBody || "<empty>"}`
            );

            trace.push({ attempt, status: res.status, elapsedMs, body: truncatedBody });

            if (res.ok) {
                let parsed: any = null;
                try {
                    parsed = bodyText ? JSON.parse(bodyText) : null;
                } catch {
                    console.error(`[POLL] [#${attempt}] response body is not JSON, continuing to poll`);
                }

                if (parsed?.jwt) {
                    console.error(`[POLL] [#${attempt}] auth approved, jwt length=${String(parsed.jwt).length}`);
                    return { jwt: parsed.jwt, statusUrl, summary: summarize(trace), durationMs: Date.now() - startedAt, aborted: false, timedOut: false };
                }

                console.error(`[POLL] [#${attempt}] no jwt in response yet, continuing`);
            } else {
                console.error(`[POLL] [#${attempt}] non-OK response, will keep polling`);
            }
        } catch (err: any) {
            const elapsedMs = Date.now() - attemptStart;
            if (err?.name === "AbortError") {
                console.error(`[POLL] [#${attempt}] aborted during fetch (elapsed=${elapsedMs}ms)`);
                return { jwt: null, statusUrl, summary: summarize(trace), durationMs: Date.now() - startedAt, aborted: true, timedOut: false };
            }
            const errorMsg = err?.message || String(err);
            console.error(`[POLL] [#${attempt}] fetch threw after ${elapsedMs}ms:`, errorMsg);
            trace.push({ attempt, status: null, elapsedMs, body: "", error: errorMsg });
        }

        await new Promise((r) => {
            const timer = setTimeout(r, intervalMs);
            abortController.signal.addEventListener("abort", () => {
                clearTimeout(timer);
                r(undefined);
            }, {once: true});
        });
    }

    const summary = summarize(trace);
    console.error(
        `[POLL] timed out after ${attempt} attempt(s) (~${timeoutMs}ms) ` +
        `statusCounts=${JSON.stringify(summary.statusCounts)} ` +
        `lastStatus=${summary.lastStatus} ` +
        `lastBody=${summary.lastBody || "<empty>"}`
    );
    return { jwt: null, statusUrl, summary, durationMs: Date.now() - startedAt, aborted: false, timedOut: true };
}

// Helper function to resolve project name to ID
export function getProjectIdByName(projectName: string): string | null {
    const project = state.projects.find(
        (p) => p.name.toLowerCase() === projectName.toLowerCase()
    );
    return project ? project.projectId : null;
}
