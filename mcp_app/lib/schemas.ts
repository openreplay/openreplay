import {z} from "zod";

export const ConfigureBackendSchema = z.object({
    appUrl: z.string().describe("OpenReplay instance URL (e.g. https://app.openreplay.com or https://openreplay.your-company.com). The API host is derived automatically."),
});

export const LoginSchema = z.object({
    email: z.string().describe("Email address"),
    password: z.string().describe("Password"),
});

export const LoginJwtSchema = z.object({
    jwt: z.string().describe("JWT token for authentication"),
});

export const LoginBrowserSchema = z.object({
    appUrl: z.string().optional().describe("OpenReplay instance URL (optional, uses current if already configured)"),
});

export const CompleteLoginSchema = z.object({
    state: z.string().optional().describe("Auth state code returned from login_browser. Defaults to the most recent pending code."),
    timeoutMs: z.number().optional().describe("How long to wait for approval before returning still-pending. Default 60000."),
});

export const FetchChartDataSchema = z.object({
    endpoint: z.string().describe("API endpoint to fetch chart data from"),
    params: z.looseRecord(z.string(), z.any()).optional().describe("Query parameters"),
    siteId: z.string().optional().describe("Site ID (project ID)"),
});

export const GetSessionReplaySchema = z.object({
    sessionId: z.string().describe("Session ID to get replay URL for"),
    siteId: z.string().optional().describe("Site ID (project ID)"),
});

export const GetProjectIdSchema = z.object({
    projectName: z.string().describe("Project name to look up"),
});

export const FilterPropertySchema = z.object({
    name: z.string().describe("Property name (e.g. 'urlPath', 'urlHost', 'label', 'selector', 'status', 'method', 'duration', 'message'). Discoverable via get_available_filters under the 'event' / Event Properties category."),
    value: z.array(z.union([z.string(), z.number()])).describe("Property values. Use numbers for numeric properties (status, duration, etc.)."),
    operator: z.string().optional().default("is").describe("Operator: 'is', 'isNot', 'contains', 'notContains', 'startsWith', 'endsWith', 'regex'; for numeric values: '=', '!=', '<', '<=', '>', '>='")
});

export const FilterItemSchema = z.object({
    name: z.string().describe("Filter name (e.g. 'userCountry', 'userBrowser', 'userOs', 'userDevice', or an event name like 'CLICK', 'LOCATION', 'REQUEST', 'INPUT', 'ERROR', or a custom event name). Discoverable via get_available_filters."),
    value: z.array(z.union([z.string(), z.number()])).optional().describe("Filter values. For countries use full name like 'France'. For event filters, leave empty (or omit) and use 'properties' to narrow by attributes like urlPath, label, status, etc."),
    operator: z.string().optional().default("is").describe("Operator: 'is', 'isNot', 'contains', 'notContains', 'startsWith', 'endsWith', 'regex'; for numeric values: '=', '!=', '<', '<=', '>', '>='"),
    properties: z.array(FilterPropertySchema).optional().describe("Sub-filters for events only (e.g. CLICK, LOCATION, REQUEST, INPUT, ERROR, custom events). Each entry narrows the event by an attribute. Example for 'visited /signup': name='LOCATION', properties=[{name:'urlPath', value:['/signup'], operator:'contains'}]. Non-event filters must NOT use this field.")
});

export const ViewSessionsChartSchema = z.object({
    startDate: z.string().describe("Start date as an ISO 8601 string (e.g. '2025-02-10' or '2025-02-10T00:00:00'). Convert relative references like 'last week' or 'past 3 days' to actual dates."),
    endDate: z.string().describe("End date as an ISO 8601 string. Defaults to now if the user says 'until now' or doesn't specify an end."),
    siteId: z.string().optional().describe("Site ID (project ID)"),
    projectName: z.string().optional().describe("Project name to look up"),
    filters: z.array(FilterItemSchema).optional().describe("Filters to apply."),
});

export const ViewUserJourneySchema = z.object({
    startDate: z.string().describe("Start date as ISO 8601 string. Convert relative references to actual dates."),
    endDate: z.string().describe("End date as ISO 8601 string. Use today's date if not specified."),
    siteId: z.string().optional().describe("Site ID (project ID)"),
    projectName: z.string().optional().describe("Project name to look up"),
    startPoint: z.string().optional().describe("URL path to start the journey from (e.g. '/articles/first'). Leave empty for general/most popular paths."),
    filters: z.array(FilterItemSchema).optional().describe("Filters to apply."),
});

export const GetSessionDetailsSchema = z.object({
    sessionId: z.string().describe("Session ID to get detailed information for"),
    siteId: z.string().optional().describe("Site ID (project ID)"),
    projectName: z.string().optional().describe("Project name to look up"),
});

export const ViewWebVitalsSchema = z.object({
    startDate: z.string().describe("Start date as ISO 8601 string. Convert relative references to actual dates."),
    endDate: z.string().describe("End date as ISO 8601 string. Use today's date if not specified."),
    siteId: z.string().optional().describe("Site ID (project ID)"),
    projectName: z.string().optional().describe("Project name to look up"),
    filters: z.array(FilterItemSchema).optional().describe("Filters to apply."),
});

export const ViewTableChartSchema = z.object({
    startDate: z.string().describe("Start date as ISO 8601 string. Convert relative references to actual dates."),
    endDate: z.string().describe("End date as ISO 8601 string. Use today's date if not specified."),
    metricOf: z.string().describe("What to rank/count. Values: 'LOCATION' (top pages), 'REQUEST' (top network requests), 'userBrowser' (top browsers), 'userCountry' (top countries), 'userOs' (top operating systems), 'userDevice' (top devices)."),
    siteId: z.string().optional().describe("Site ID (project ID)"),
    projectName: z.string().optional().describe("Project name to look up"),
    limit: z.number().optional().default(20).describe("Max number of items to return (default 20)"),
    filters: z.array(FilterItemSchema).optional().describe("Filters to apply."),
});

export const FunnelStepSchema = z.union([
    z.string().describe("Shorthand: a URL path string is treated as a LOCATION (page view) step, e.g. '/checkout'."),
    z.object({
        type: z.string().describe("Event name. Built-in (autoCaptured) events: 'LOCATION' (page view), 'CLICK', 'INPUT' (text input), 'ISSUE'. Or any custom event name (e.g. 'dashboard_list_viewed'). Discoverable via get_available_filters under the 'events' category."),
        value: z.string().optional().describe("Step value. For LOCATION → matches urlPath. For CLICK/INPUT → matches label. For ISSUE → issue type id (e.g. 'js_exception', 'click_rage', 'crash'). For custom events (autoCaptured=false) → ignored; only the event name is used."),
        operator: z.string().optional().default("is").describe("Operator for the step's value match. 'is' (default) for exact, 'contains' for partial.")
    })
]);

export const ViewFunnelSchema = z.object({
    startDate: z.string().describe("Start date as ISO 8601 string. Convert relative references to actual dates."),
    endDate: z.string().describe("End date as ISO 8601 string. Use today's date if not specified."),
    steps: z.array(FunnelStepSchema).min(2).describe(
        "Ordered list of funnel steps (min 2). A step can be a URL path string (treated as a LOCATION/page-view), or an object with 'type' (event name) and optional 'value'. Mix freely. Example: ['/pricing', { type: 'CLICK', value: 'Subscribe' }, { type: 'purchase_completed' }]."
    ),
    siteId: z.string().optional().describe("Site ID (project ID)"),
    projectName: z.string().optional().describe("Project name to look up"),
    filters: z.array(FilterItemSchema).optional().describe("Filters to apply."),
});

export const ViewSessionReplaySchema = z.object({
    sessionId: z.string().describe("Session ID to replay. Pick from earlier fetch_sessions/view_recent_sessions results."),
    siteId: z.string().optional().describe("Site ID (project ID). Use the siteId from the earlier session list if available."),
    projectName: z.string().optional().describe("Project name to look up. Will be resolved to project ID automatically."),
});
