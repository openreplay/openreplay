import { state } from "./state.js";
import { resolveCountryValue } from "./countries.js";

// Helper function to make authenticated API requests
export async function makeApiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${state.backendUrl}${endpoint}`;
  const headers = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    ...(state.jwt ? { "Authorization": `Bearer ${state.jwt}` } : {}),
    ...options.headers,
  };

  console.error(`[SERVER] Making API request to: ${url}`);

  const response = await fetch(url, { ...options, headers });

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

  const { data } = await makeApiRequest(`/api/pa/${siteId}/filters`);
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

// Resolve simplified model filters into full API filter objects
export async function resolveFilters(
  siteId: string,
  modelFilters: Array<{ name: string; value: string[]; operator?: string }>,
): Promise<any[]> {
  const filterDefs = await getOrFetchFilters(siteId);
  if (!filterDefs) return [];

  // Flatten all filter definitions from categorized response
  const allDefs: any[] = [];
  for (const category of Object.values(filterDefs) as any[]) {
    if (category?.list) {
      allDefs.push(...category.list);
    }
  }

  return modelFilters.map((mf) => {
    const def = allDefs.find((d: any) => d.name === mf.name);

    // Resolve country values if applicable
    let resolvedValues = mf.value;
    if (mf.name === "userCountry") {
      resolvedValues = mf.value.map(resolveCountryValue);
    }

    return {
      value: resolvedValues,
      operator: mf.operator || "is",
      dataType: def?.dataType || "string",
      propertyOrder: "and",
      filters: [],
      isEvent: def?.isEvent ?? false,
      name: mf.name,
      autoCaptured: def?.autoCaptured ?? true,
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

  const { data } = await makeApiRequest(`/v2/api/${siteId}/sessions/search`, {
    method: "POST",
    body: JSON.stringify(searchPayload),
  });

  console.error(`[SERVER] Found ${data.sessions?.length || 0} sessions`);

  if (!data.sessions || data.sessions.length === 0) {
    console.error('Used params', siteId, searchPayload, "\n data", data);
    throw new Error("No sessions found in the last 24 hours");
  }

  // Construct player URLs for each session
  const baseUrl = state.backendUrl.replace("/api", "").replace("//api.", "//app.");
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

  const { data } = await makeApiRequest("/api/projects");
  console.error(`[SERVER] Found ${data.length || 0} projects`);

  // Store projects in state
  state.projects = data.map((project: any) => ({
    projectId: String(project.projectId || project.id),
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

  const { data } = await makeApiRequest(`/v2/api/${siteId}/cards/try`, {
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

  const { data } = await makeApiRequest(`/v2/api/${siteId}/cards/try`, {
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

  const { data } = await makeApiRequest(`/v2/api/${siteId}/cards/try`, {
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

  const { data } = await makeApiRequest(`/v2/api/${siteId}/cards/try`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  console.error(`[SERVER] Got table data: ${data?.values?.length || 0} values, total=${data?.total || 0}`);
  return data;
}

// Fetch funnel data (step-by-step conversion)
export async function fetchFunnel(
  siteId: string,
  startTimestamp: number,
  endTimestamp: number,
  steps: string[],
  filters: any[] = [],
) {
  console.error(`[SERVER] Fetching funnel for site ${siteId}, steps: ${steps.join(' -> ')}...`);

  if (!state.jwt) {
    throw new Error("AUTH_ERROR: Not authenticated");
  }

  // Each step becomes a LOCATION event filter
  const stepFilters = steps.map(step => ({
    value: step ? [step] : [],
    operator: "is",
    dataType: "string",
    propertyOrder: "and",
    filters: [],
    isEvent: true,
    name: "LOCATION",
    autoCaptured: true,
  }));

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

  const { data } = await makeApiRequest(`/v2/api/${siteId}/cards/try`, {
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

  const { data } = await makeApiRequest(`/v2/api/${siteId}/sessions/${sessionId}/replay`);
  return data;
}

// Fetch session events (errors, events, incidents, issues, userEvents)
export async function fetchSessionEvents(siteId: string, sessionId: string) {
  console.error(`[SERVER] Fetching session events for ${sessionId} in site ${siteId}...`);

  if (!state.jwt) {
    throw new Error("AUTH_ERROR: Not authenticated");
  }

  const { data } = await makeApiRequest(`/v2/api/${siteId}/sessions/${sessionId}/events`);
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

  const { data } = await makeApiRequest(`/api/${siteId}/events`, {
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

  const { data } = await makeApiRequest(`/api/${siteId}/users`, {
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

  const { data } = await makeApiRequest(`/api/pa/${siteId}/filters`);

  // Extract event-type filters (custom events and their properties)
  const events = (data || []).filter((f: any) => f.isEvent);
  const attributes = (data || []).filter((f: any) => !f.isEvent);

  console.error(`[SERVER] Got ${events.length} events, ${attributes.length} attributes`);
  return { events, attributes };
}

// Poll the backend for browser-based auth approval
export async function pollForAuth(
  backendUrl: string,
  authCode: string,
  clientId: string,
  timeoutMs: number = 300_000,
  intervalMs: number = 3_000,
): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${backendUrl}/v1/mcp/auth-status?state=${authCode}&client_id=${clientId}`);

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        console.error(`[SERVER] auth-status returned ${res.status}:`, errorData?.error || res.statusText);
        return null;
      }

      const data = await res.json();

      if (data.jwt) {
        console.error("[SERVER] Browser auth approved");
        return data.jwt;
      }
    } catch (err) {
      console.error("[SERVER] Poll request failed, retrying...", err);
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  console.error("[SERVER] Browser auth timed out");
  return null;
}

// Helper function to resolve project name to ID
export function getProjectIdByName(projectName: string): string | null {
  const project = state.projects.find(
    (p) => p.name.toLowerCase() === projectName.toLowerCase()
  );
  return project ? project.projectId : null;
}
