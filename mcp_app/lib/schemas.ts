import {z} from "zod";

// Every tool's inputSchema lives here and is passed to registerTool as-is, so
// what the model sees and what the handler receives can't drift apart. Keep
// descriptions short: they ship in every conversation's tool list, and the
// filter grammar is spelled out once, in get_available_filters.

const SiteId = z.string().optional().describe("Project ID. Either siteId or projectName is required.");
const ProjectName = z.string().optional().describe("Project name, resolved to its ID automatically.");
const StartDate = z.string().describe("ISO 8601 date, e.g. '2026-02-10'. Convert relative references ('last week') to dates.");
const EndDate = z.string().describe("ISO 8601 date. A bare date includes that whole day; use today for 'until now'.");

// The operators backend/pkg/analytics/model Filter accepts (there is no "!=").
const Operator = z.enum(["is", "isNot", "isAny", "isUndefined", "contains", "notContains", "startsWith", "endsWith", "regex", "=", "<", ">", "<=", ">="])
    .optional().default("is");

export const FilterPropertySchema = z.object({
    name: z.string().describe("Event property from get_available_filters 'eventProperties', e.g. urlPath, label, status"),
    value: z.array(z.union([z.string(), z.number()])),
    operator: Operator,
});

export const FilterItemSchema = z.object({
    name: z.string().describe("A name from get_available_filters: attribute (userCountry, userId), event (LOCATION, CLICK), segment or feature"),
    value: z.array(z.union([z.string(), z.number()])).optional().describe("Omit for events narrowed by properties, and for segments/features"),
    operator: Operator,
    properties: z.array(FilterPropertySchema).optional().describe("Events only, e.g. LOCATION with [{name:'urlPath', value:['/signup'], operator:'contains'}]"),
});

const Filters = z.array(FilterItemSchema).optional();

export const ViewRecentSessionsSchema = z.object({
    siteId: SiteId,
    projectName: ProjectName,
    limit: z.number().optional().default(10).describe("Max 50"),
    startDate: StartDate.optional().describe("ISO 8601 date. Defaults to 24 hours before endDate."),
    endDate: EndDate.optional().describe("ISO 8601 date, a bare date includes that day. Defaults to now."),
    filters: Filters,
});

export const ViewSessionsChartSchema = z.object({
    startDate: StartDate,
    endDate: EndDate,
    siteId: SiteId,
    projectName: ProjectName,
    filters: Filters,
});

export const ViewUserJourneySchema = z.object({
    startDate: StartDate,
    endDate: EndDate,
    siteId: SiteId,
    projectName: ProjectName,
    startPoint: z.string().optional().describe("URL path to start from, e.g. '/pricing'. Omit for the most popular paths."),
    filters: Filters,
});

export const ViewWebVitalsSchema = z.object({
    startDate: StartDate,
    endDate: EndDate,
    siteId: SiteId,
    projectName: ProjectName,
    filters: Filters,
});

export const ViewTableChartSchema = z.object({
    startDate: StartDate,
    endDate: EndDate,
    metricOf: z.string().describe("What to rank: LOCATION (pages), REQUEST, userBrowser, userCountry, userOs, userDevice"),
    siteId: SiteId,
    projectName: ProjectName,
    limit: z.number().optional().default(20),
    filters: Filters,
});

export const FunnelStepSchema = z.union([
    z.string().describe("URL path, shorthand for a LOCATION step"),
    z.object({
        type: z.string().describe("LOCATION, CLICK, INPUT, ISSUE, or a custom event name"),
        value: z.string().optional().describe("Matches urlPath (LOCATION), label (CLICK/INPUT) or issue type (ISSUE); ignored for custom events"),
        operator: z.enum(["is", "contains"]).optional().default("is"),
    }),
]);

export const ViewFunnelSchema = z.object({
    startDate: StartDate,
    endDate: EndDate,
    steps: z.array(FunnelStepSchema).min(2).describe("Ordered steps, e.g. ['/pricing', {type:'CLICK', value:'Subscribe'}, {type:'purchase_completed'}]"),
    siteId: SiteId,
    projectName: ProjectName,
    filters: Filters,
});

const SessionRef = {
    sessionId: z.string().describe("From an earlier session list, also when the user refers to one by position"),
    siteId: SiteId,
    projectName: ProjectName,
};

export const ViewSessionReplaySchema = z.object(SessionRef);

export const GetSessionDetailsSchema = z.object(SessionRef);

export const ProjectSchema = z.object({
    siteId: SiteId,
    projectName: ProjectName,
});

export const FetchEventsSchema = z.object({
    siteId: SiteId,
    projectName: ProjectName,
    startDate: z.string().optional().describe("ISO 8601 date. Defaults to 24 hours ago."),
    endDate: z.string().optional().describe("ISO 8601 date. Defaults to now."),
    limit: z.number().optional().default(50).describe("Max 200"),
    page: z.number().optional().default(1),
});

export const FetchUsersSchema = z.object({
    siteId: SiteId,
    projectName: ProjectName,
    startDate: z.string().optional().describe("ISO 8601 date. Defaults to 7 days ago."),
    endDate: z.string().optional().describe("ISO 8601 date. Defaults to now."),
    query: z.string().optional().default("").describe("Matches name, email or user ID"),
    limit: z.number().optional().default(50).describe("Max 200"),
    page: z.number().optional().default(1),
});

export const FetchChartDataSchema = z.object({
    endpoint: z.string().describe("API path, e.g. /v2/api/{siteId}/..."),
    params: z.looseRecord(z.string(), z.any()).optional().describe("Query parameters"),
    siteId: z.string().optional(),
});

export const SearchDocsSchema = z.object({
    query: z.string().optional().describe("Keywords or the user's question. Omit for the full docs index."),
});

export const ConfigureBackendSchema = z.object({
    appUrl: z.string().describe("Instance URL as opened in the browser, e.g. https://openreplay.your-company.com"),
});

export const LoginBrowserSchema = z.object({
    appUrl: z.string().optional().describe("Instance URL; defaults to the configured one"),
});

export const CompleteLoginSchema = z.object({
    state: z.string().optional().describe("State code from login_browser; defaults to the latest"),
    timeoutMs: z.number().optional().describe("How long to wait for approval. Default 60000."),
});

export const LoginJwtSchema = z.object({
    jwt: z.string(),
});

// Called by the UI only (registered app-only, hidden from the model).
export const RefreshReplayUrlsSchema = z.object({
    sessionId: z.string(),
    siteId: z.string().optional(),
});

export const FetchUrlSchema = z.object({
    url: z.string(),
});
