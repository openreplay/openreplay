import { z } from "zod";

export const ConfigureBackendSchema = z.object({
  backendUrl: z.string().describe("OpenReplay backend API URL"),
});

export const LoginSchema = z.object({
  email: z.string().describe("Email address"),
  password: z.string().describe("Password"),
});

export const LoginJwtSchema = z.object({
  jwt: z.string().describe("JWT token for authentication"),
});

export const LoginBrowserSchema = z.object({
  backendUrl: z.string().optional().describe("OpenReplay backend URL (optional, uses current if already configured)"),
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

export const FilterItemSchema = z.object({
  name: z.string().describe("Filter name (e.g. 'userCountry', 'userBrowser', 'userOs', 'userDevice')"),
  value: z.array(z.string()).describe("Filter values. For countries use full name like 'France'."),
  operator: z.string().optional().default("is").describe("Operator: 'is', 'isNot', 'contains', etc."),
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

export const ViewFunnelSchema = z.object({
  startDate: z.string().describe("Start date as ISO 8601 string. Convert relative references to actual dates."),
  endDate: z.string().describe("End date as ISO 8601 string. Use today's date if not specified."),
  steps: z.array(z.string()).min(2).describe("Ordered list of URL paths defining the funnel steps, e.g. ['/pricing', '/checkout', '/confirm']. Minimum 2 steps required."),
  siteId: z.string().optional().describe("Site ID (project ID)"),
  projectName: z.string().optional().describe("Project name to look up"),
  filters: z.array(FilterItemSchema).optional().describe("Filters to apply."),
});

export const ViewSessionReplaySchema = z.object({
  sessionId: z.string().describe("Session ID to replay. Pick from earlier fetch_sessions/view_recent_sessions results."),
  siteId: z.string().optional().describe("Site ID (project ID). Use the siteId from the earlier session list if available."),
  projectName: z.string().optional().describe("Project name to look up. Will be resolved to project ID automatically."),
});
