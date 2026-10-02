import { McpServer } from "@modelcontextprotocol/server";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import net from "node:net";
import dns from "node:dns/promises";
import { state, savePersistedState, clearPersistedState, clearInstanceCaches, setAppUrl, generateAuthCode, assertHttpsUrl, allowMobUrls, isMobUrlAllowed } from "./state.js";
import { makeApiRequest, fetchRecentSessions, fetchProjects, fetchSessionReplay, fetchSessionEvents, fetchSessionsTimeseries, fetchPathAnalysis, fetchWebVitals, fetchTableData, fetchFunnel, resolveFilters, resolveFunnelSteps, parseDateRange, resolveSiteId, DAY_MS, getOrFetchFilters, fetchEvents, fetchUsers, pollForAuth } from "./api.js";
import {
  ConfigureBackendSchema,
  LoginJwtSchema,
  LoginBrowserSchema,
  CompleteLoginSchema,
  FetchChartDataSchema,
  GetSessionDetailsSchema,
  ViewRecentSessionsSchema,
  ViewSessionsChartSchema,
  ViewUserJourneySchema,
  ViewWebVitalsSchema,
  ViewTableChartSchema,
  ViewFunnelSchema,
  ViewSessionReplaySchema,
  ProjectSchema,
  FetchEventsSchema,
  FetchUsersSchema,
  SearchDocsSchema,
  RefreshReplayUrlsSchema,
  FetchUrlSchema,
} from "./schemas.js";

// Format timestamp for chart x-axis labels based on time range
function formatChartTimestamp(ts: number, rangeHours: number): string {
  const d = new Date(ts);
  if (rangeHours <= 48) {
    // Show hours: "Feb 18, 14:00"
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      ", " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  if (rangeHours <= 24 * 30) {
    // Show days: "Feb 18"
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  // Show month/day for longer ranges: "Feb 18"
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// In-memory cache for the OpenReplay docs index (llms-full.txt).
// File is small (~40 KB) and updates infrequently, so a 12h TTL is plenty.
const DOCS_INDEX_URL = "https://docs.openreplay.com/llms-full.txt";
const DOCS_CACHE_TTL_MS = 60 * 60 * 12 * 1000;
let docsCache: { content: string; fetchedAt: number } | null = null;

async function getOpenReplayDocsIndex(): Promise<string> {
  const now = Date.now();
  if (docsCache && now - docsCache.fetchedAt < DOCS_CACHE_TTL_MS) {
    return docsCache.content;
  }
  const response = await fetch(DOCS_INDEX_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenReplay docs index: HTTP ${response.status}`);
  }
  const content = await response.text();
  docsCache = { content, fetchedAt: now };
  return content;
}

// Stop-words that produce noisy matches when queries are phrased as questions.
const DOCS_STOP_WORDS = new Set([
  "the", "and", "for", "what", "how", "are", "can", "with", "from", "this",
  "that", "does", "openreplay", "open", "replay", "use", "using", "you", "your",
]);

// Validate a mob-file URL before fetching it server-side.
//
// Mob files (replay recordings) are served from blob storage whose host differs
// from the configured OpenReplay instance, so the host can't be pinned to
// state.appUrl. Instead we only fetch URLs this server itself minted from the
// authenticated /replay endpoint (see allowMobUrls). That makes the UI unable
// to steer the fetch anywhere, whatever it passes.
function assertFetchableMobUrl(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error(`Invalid mob file URL: ${raw}`);
  }
  if (u.protocol !== "https:") {
    throw new Error("Mob file URL must use https");
  }
  if (!isMobUrlAllowed(u.toString())) {
    throw new Error(
      "Refusing to fetch a URL this server did not issue. Mob file URLs come from view_session_replay."
    );
  }
  return u.toString();
}

// IPv4/IPv6 ranges that must never be reachable through the CSS proxy.
function isPrivateAddress(addr: string): boolean {
  const family = net.isIP(addr);
  if (family === 4) {
    const [a, b] = addr.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 192 && b === 0) return true; // 192.0.0.0/24 IETF protocol assignments
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
    if (a >= 224) return true; // multicast + reserved
    return false;
  }
  if (family === 6) {
    const lower = addr.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    // IPv4-mapped (::ffff:10.0.0.1) — test the embedded address
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    if (/^f[cd]/.test(lower)) return true; // fc00::/7 unique-local
    if (/^fe[89ab]/.test(lower)) return true; // fe80::/10 link-local
    if (lower.startsWith("ff")) return true; // multicast
    return false;
  }
  return true;
}

// Validate a stylesheet URL before the server fetches it on the UI's behalf.
//
// These hrefs come out of the *recorded page*, so they are attacker-influenced
// by whoever's site was recorded. Require https, reject IP literals, and reject
// hostnames that resolve into private space. A hostile DNS record could still
// flip between the check and the fetch; the size cap and the fact that only the
// stylesheet body (never credentials) is returned keep the blast radius small.
async function assertProxyableCssUrl(raw: string): Promise<string> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error(`Invalid stylesheet URL: ${raw}`);
  }
  if (u.protocol !== "https:") {
    throw new Error("Stylesheet URL must use https");
  }
  // Strip brackets from IPv6 literals (e.g. "[::1]") before testing.
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) !== 0) {
    throw new Error("Refusing to fetch a stylesheet from a raw IP address");
  }
  const resolved = await dns.lookup(host, { all: true });
  if (resolved.length === 0 || resolved.some((r) => isPrivateAddress(r.address))) {
    throw new Error(`Refusing to fetch a stylesheet from a non-public host: ${host}`);
  }
  return u.toString();
}

const MAX_MOB_FILE_BYTES = 128 * 1024 * 1024;
const MAX_CSS_BYTES = 5 * 1024 * 1024;

// Fetch with a hard ceiling on the response body. Without this a single large
// (or hostile) response is base64-encoded straight into a JSON-RPC frame.
async function fetchCapped(url: string, maxBytes: number): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new Error(`Response too large: ${declared} bytes (max ${maxBytes})`);
  }
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > maxBytes) {
    throw new Error(`Response too large: ${buffer.byteLength} bytes (max ${maxBytes})`);
  }
  return new Uint8Array(buffer);
}

// CSP connect-src for the UI resource. Derived from the configured instance so
// self-hosted deployments aren't pinned to the SaaS domain.
export function uiConnectDomains(): string[] {
  const domains = new Set<string>(["*.openreplay.com"]);
  try {
    const host = new URL(state.appUrl).hostname;
    domains.add(host);
    const parts = host.split(".");
    if (parts.length > 2) {
      domains.add(`*.${parts.slice(-2).join(".")}`);
    }
  } catch {
    // state.appUrl is validated on write; ignore anything unparseable
  }
  return Array.from(domains);
}

// Platforms the embedded engine can replay. Mobile recordings need
// IOSMessageManager and a video track, neither of which this app implements.
function isMobilePlatform(platform: unknown): boolean {
  return typeof platform === "string" && /ios|android/i.test(platform);
}

// Register UI tools
export function registerUITools(server: McpServer, resourceUri: string) {
  // Tool 1: View Recent Sessions
  console.error("[SERVER] Registering view_recent_sessions tool with UI...");
  registerAppTool(
    server,
    "view_recent_sessions",
    {
      title: "OpenReplay Recent Sessions",
      annotations: { readOnlyHint: true, openWorldHint: true },
      description: "PREFERRED tool for fetching and displaying sessions. Always use this tool when the user asks to see, show, list, get, or fetch sessions. " +
        "Renders a rich interactive session list with user info, timing, device details, and play buttons, and returns the sessions as compact JSON for analysis. " +
        "You can specify one of the required parameters: project ID (siteId param) or its name (projectName param). " +
        "Supports filtering by user attributes (country, browser, OS, device, etc.). Call get_available_filters first to see what filters are available. " +
        "Searches the last 24 hours unless startDate/endDate are given — pass a wider startDate when looking up a specific user's history or older sessions. " +
        "After showing the session list, let the user know they can (1) ask you to replay any session directly here using the built-in session player via view_session_replay, and (2) click the play button on any session in the list to open it in the full OpenReplay UI in their browser. Mention both options to the user. " +
        "TIP: Combine multiple data tools for comprehensive analysis. Use view_recent_sessions with the same filters to drill into sessions related to any chart data.",
      inputSchema: ViewRecentSessionsSchema,
      _meta: {
        ui: {
          resourceUri,
          visibility: ["model"],
          csp: {
            connectDomains: uiConnectDomains(),
          },
        },
        examples: [
          { description: "Show 20 sessions for project MyApp", input: { projectName: "MyApp", limit: 20 } },
          { description: "Sessions from Chrome users in France or Tunisia in project 1", input: { siteId: "1", filters: [{ name: "userBrowser", value: ["Chrome"], operator: "is" }, { name: "userCountry", value: ["France","Tunisia"], operator: "is" }] } },
          { description: "Show me sessions with errors", input: { projectName: "MyApp", filters: [{ name: "issue", value: ["js_exception"], operator: "is" }] } },
          { description: "Last 5 sessions on serverless", input: { projectName: "serverless", limit: 5 } },
          { description: "Show me recent sessions of project serverless", input: { projectName: "serverless" } },
          { description: "Sessions of user tahay@asayer.io", input: { projectName: "MyApp", filters: [{name: "userId", value:["tahay@asayer.io"]}] } },
          { description: "Sessions of user tahay@asayer.io over the last 30 days", input: { projectName: "MyApp", startDate: "2026-03-11", filters: [{name: "userId", value:["tahay@asayer.io"]}] } },
          { description: "Sessions where the user visited the signup page", input: { projectName: "MyApp", filters: [{name: "LOCATION", properties: [{name:"urlPath",value: ["signup"], operator:"contains"}]}] } },
          { description: "Sessions where the user clicked on subscribe", input: { projectName: "MyApp", filters: [{name: "CLICK", properties: [{name:"label",value: ["subscribe"], operator:"is"}]}] } },
          { description: "Sessions longer than 20 minutes", input: { projectName: "MyApp", filters: [{name: "duration", value: [20]}] } },
          { description: "Sessions shorter than 20 minutes", input: { projectName: "MyApp", filters: [{name: "duration", value: [0,20]}] } },
          { description: "Sessions with failed requests to /api/users", input: { projectName: "MyApp", filters: [{name: "REQUEST", properties: [{name:"urlPath",value: ["/api/users"], operator:"is"}, {name:"status",value: [400], operator:">="}]}] } },
          { description: "Sessions with metadata plan is free", input: { projectName: "MyApp", filters: [{name: "metadata_1", value:["free"], operator:"is"}]  }},
        ],
      },
    },
    async (args) => {
      console.error("[SERVER] view_recent_sessions tool CALLED!");
      console.error("[SERVER] Arguments:", JSON.stringify(args, null, 2));

      try {
        const siteId = await resolveSiteId(args);

        const limit = Math.min(args.limit || 10, 50); // Cap at 50
        const range = parseDateRange(args.startDate, args.endDate);
        const resolvedFilters = await resolveFilters(siteId, args.filters ?? []);

        const sessions = await fetchRecentSessions(siteId, limit, resolvedFilters, range);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                type: "session_list",
                sessions,
                siteId,
              }),
            },
          ],
        };
      } catch (error) {
        console.error("[SERVER] Error fetching sessions:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                type: "error",
                error: errorMessage,
                isAuthError: errorMessage.includes("AUTH_ERROR"),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );
  console.error("[SERVER] view_recent_sessions tool registered successfully");

  // Tool 2: View Sessions Chart (timeseries)
  console.error("[SERVER] Registering view_chart tool with UI...");
  registerAppTool(
    server,
    "view_chart",
    {
      title: "OpenReplay Sessions Chart",
      annotations: { readOnlyHint: true, openWorldHint: true },
      description:
        "PREFERRED tool for showing session analytics charts. Use this when the user asks to see charts, graphs, " +
        "numbers, trends, or analytics about sessions over time. Examples: 'show me sessions chart for last week', " +
        "'how many sessions today', 'show me the trend for past 3 days'. " +
        "You MUST convert the user's time references into actual ISO date strings for startDate and endDate. " +
        "For example, if today is 2025-02-18 and the user says 'last week', use startDate='2025-02-10' and endDate='2025-02-18'. " +
        "Supports filtering by user attributes. Call get_available_filters to see available filters. " +
        "TIP: Combine multiple data tools for comprehensive analysis. Use view_recent_sessions with the same filters to drill into sessions related to any chart data.",
      inputSchema: ViewSessionsChartSchema,
      _meta: {
        ui: {
          resourceUri,
          visibility: ["model"],
          csp: {
            connectDomains: uiConnectDomains(),
          },
        },
        examples: [
          { description: "Show me sessions chart for last week", input: { startDate: "2026-04-03", endDate: "2026-04-11", projectName: "MyApp" } },
          { description: "How many sessions today on chrome or edge today", input: { startDate: "2026-04-10", endDate: "2026-04-11", projectName: "MyApp", filters:[{name: "userBrowser", value:["Chrome","Edge"], operator: "is"}] } },
          { description: "Session trend for the past 30 days from France", input: { startDate: "2026-03-11", endDate: "2026-04-10", projectName: "MyApp", filters:[{name: "userCountry", value:["France"], operator: "is"}] } },
          { description: "Chart of sessions from mobile users this month", input: { startDate: "2026-03-10", endDate: "2026-04-10", projectName: "MyApp", filters: [{ name: "userDeviceType", value: ["mobile"], operator: "is" }] } },
          { description: "Timeseries of people who visited signup page last week", input: { startDate: "2026-04-03", endDate: "2026-04-10", siteId: "1", filters: [{ name: "LOCATION", properties:[{name:"urlPath", value: ["signup"], operator: "contains"}]}] } },
        ],
      },
    },
    async (parsed) => {
      console.error("[SERVER] view_chart tool CALLED!");
      console.error("[SERVER] Arguments:", JSON.stringify(parsed, null, 2));

      try {

        const siteId = await resolveSiteId(parsed);

        const { startTs, endTs } = parseDateRange(parsed.startDate, parsed.endDate);

        // Calculate density based on time range
        const rangeMs = endTs - startTs;
        const rangeHours = rangeMs / (1000 * 60 * 60);
        let density: number;
        if (rangeHours <= 48) {
          density = Math.max(Math.ceil(rangeHours), 12);
        } else if (rangeHours <= 24 * 14) {
          density = Math.ceil(rangeHours / 4);
        } else {
          density = Math.min(Math.ceil(rangeHours / 24), 90);
        }

        const resolvedFilters = await resolveFilters(siteId, parsed.filters ?? []);

        const rawData = await fetchSessionsTimeseries(siteId, startTs, endTs, density, resolvedFilters);

        // Transform API data for ChartView
        // New API format: { series: { "Series 1": { timestamp: value, ... } } }
        // Legacy format: [{ "Sessions": count, "timestamp": ms }, ...]
        // ChartView expects: { chart: [{ time, timestamp, ...values }], namesMap: [...] }
        let chartPoints: any[];
        let seriesNames: string[];

        if (rawData && rawData.series && typeof rawData.series === "object" && !Array.isArray(rawData.series)) {
          // New series format — convert { seriesName: { ts: val } } to flat array
          const seriesObj = rawData.series;
          const seriesKeys = Object.keys(seriesObj);
          const tsSet = new Set<string>();

          for (const key of seriesKeys) {
            const seriesContent = seriesObj[key];
            if (seriesContent && typeof seriesContent === "object") {
              for (const ts of Object.keys(seriesContent)) {
                if (ts !== "$overall") tsSet.add(ts);
              }
            }
          }

          const timestamps = Array.from(tsSet).sort((a, b) => Number(a) - Number(b));
          seriesNames = seriesKeys;

          chartPoints = timestamps.map(ts => {
            const point: any = { timestamp: Number(ts) };
            for (const key of seriesKeys) {
              point[key] = seriesObj[key]?.[ts] ?? 0;
            }
            return point;
          });
        } else if (Array.isArray(rawData)) {
          chartPoints = rawData;
          seriesNames = chartPoints.length > 0
            ? Object.keys(chartPoints[0]).filter((k: string) => k !== "timestamp")
            : ["Sessions"];
        } else {
          chartPoints = [];
          seriesNames = ["Sessions"];
        }

        const chart = chartPoints.map((point: any) => ({
          ...point,
          time: formatChartTimestamp(point.timestamp, rangeHours),
        }));

        const chartData = {
          type: "chart",
          siteId,
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          chart,
          namesMap: seriesNames,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(chartData),
            },
          ],
        };
      } catch (error) {
        console.error("[SERVER] Error fetching chart data:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                type: "error",
                error: errorMessage,
                isAuthError: errorMessage.includes("AUTH_ERROR"),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );
  console.error("[SERVER] view_chart tool registered successfully");

  // Tool 3: View User Journey (Sankey / Path Analysis)
  console.error("[SERVER] Registering view_user_journey tool with UI...");
  registerAppTool(
    server,
    "view_user_journey",
    {
      title: "OpenReplay User Journey",
      annotations: { readOnlyHint: true, openWorldHint: true },
      description:
        "PREFERRED tool for showing user journey / path analysis as a Sankey flow diagram. " +
        "Use this when the user asks about user journeys, navigation paths, drop-offs, funnels, " +
        "user flows, where users go, or page transitions. Examples: 'where do users drop off', " +
        "'show me user journeys', 'what pages do users visit after /pricing'. " +
        "You MUST convert time references to ISO date strings. " +
        "Optionally specify a startPoint URL path to analyze journeys from a specific page, " +
        "or leave it empty for the most common paths. " +
        "Supports filtering by user attributes. Call get_available_filters to see available filters. " +
        "TIP: Combine with view_table_chart, view_web_vitals, or view_funnel for deeper analysis. Use view_recent_sessions with the same filters to drill into related sessions.",
      inputSchema: ViewUserJourneySchema,
      _meta: {
        ui: {
          resourceUri,
          visibility: ["model"],
          csp: {
            connectDomains: uiConnectDomains(),
          },
        },
        examples: [
          { description: "Where do users drop off after the pricing page last week", input: { startDate: "2026-04-21", endDate: "2026-04-28", projectName: "MyApp", startPoint: "/pricing" } },
          { description: "Show me user journeys this month", input: { startDate: "2026-04-01", endDate: "2026-04-28", projectName: "MyApp" } },
          { description: "What pages do users visit after /signup", input: { startDate: "2026-04-21", endDate: "2026-04-28", projectName: "MyApp", startPoint: "/signup" } },
          { description: "Navigation paths for mobile users from France this week", input: { startDate: "2026-04-21", endDate: "2026-04-28", siteId: "1", filters: [{ name: "userDeviceType", value: ["mobile"], operator: "is" }, { name: "userCountry", value: ["France"], operator: "is" }] } },
          { description: "User flow from /home for Chrome users last 30 days", input: { startDate: "2026-03-29", endDate: "2026-04-28", projectName: "MyApp", startPoint: "/home", filters: [{ name: "userBrowser", value: ["Chrome"], operator: "is" }] } },
        ],
      },
    },
    async (parsed) => {
      console.error("[SERVER] view_user_journey tool CALLED!");
      console.error("[SERVER] Arguments:", JSON.stringify(parsed, null, 2));

      try {

        const siteId = await resolveSiteId(parsed);

        const { startTs, endTs } = parseDateRange(parsed.startDate, parsed.endDate);

        const resolvedFilters = await resolveFilters(siteId, parsed.filters ?? []);

        let data = await fetchPathAnalysis(siteId, startTs, endTs, parsed.startPoint, resolvedFilters);

        // Unwrap new series format if present
        if (data?.series && typeof data.series === "object" && !data.nodes) {
          const firstSeries = Object.values(data.series)[0] as any;
          if (firstSeries?.nodes) data = firstSeries;
        }

        // Build a textual summary for the model
        const nodes = data.nodes || [];
        const links = data.links || [];
        const startingNode = nodes.find((n: any) => n.startingNode);

        // Find the biggest drop-off link
        const dropLinks = links.filter((l: any) => {
          const target = nodes.find((n: any) => n.id === l.target);
          return target?.eventType === "DROP";
        }).sort((a: any, b: any) => b.sessionsCount - a.sessionsCount);

        // Find top destination pages (non-drop, non-other, depth 1)
        const depth1Links = links.filter((l: any) => {
          const target = nodes.find((n: any) => n.id === l.target);
          return target && target.depth === 1 && target.eventType === "LOCATION";
        }).sort((a: any, b: any) => b.sessionsCount - a.sessionsCount);

        const topDestinations = depth1Links.slice(0, 5).map((l: any) => {
          const target = nodes.find((n: any) => n.id === l.target);
          return { path: target?.name, sessions: l.sessionsCount, percentage: l.value };
        });

        const summary = {
          startPoint: startingNode?.name || parsed.startPoint || "auto (most popular)",
          totalNodes: nodes.length,
          totalLinks: links.length,
          topDropOff: dropLinks[0] ? {
            sessions: dropLinks[0].sessionsCount,
            percentage: dropLinks[0].value,
          } : null,
          topDestinations,
        };

        const response = {
          type: "user_journey",
          siteId,
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          startPoint: parsed.startPoint || null,
          summary,
          nodes,
          links,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response),
            },
          ],
        };
      } catch (error) {
        console.error("[SERVER] Error fetching path analysis:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                type: "error",
                error: errorMessage,
                isAuthError: errorMessage.includes("AUTH_ERROR"),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );
  console.error("[SERVER] view_user_journey tool registered successfully");

  // Tool 4: View Web Vitals
  console.error("[SERVER] Registering view_web_vitals tool with UI...");
  registerAppTool(
    server,
    "view_web_vitals",
    {
      title: "OpenReplay Web Vitals",
      annotations: { readOnlyHint: true, openWorldHint: true },
      description:
        "PREFERRED tool for showing Web Vitals performance metrics. Displays 6 core metrics: " +
        "DOM Complete, TTFB (Time to First Byte), Speed Index, FCP (First Contentful Paint), " +
        "LCP (Largest Contentful Paint), CLS (Cumulative Layout Shift). " +
        "Use this when the user asks about performance, page speed, web vitals, loading times, " +
        "core web vitals, or site performance. Shows median (P50) values with good/medium/bad status. " +
        "You MUST convert time references to ISO date strings. " +
        "Supports filtering by user attributes. " +
        "TIP: Combine with view_chart for trends, view_table_chart for breakdowns, or view_funnel for conversion analysis. Use view_recent_sessions with the same filters to drill into related sessions.",
      inputSchema: ViewWebVitalsSchema,
      _meta: {
        ui: {
          resourceUri,
          visibility: ["model"],
          csp: {
            connectDomains: uiConnectDomains(),
          },
        },
        examples: [
          { description: "Show me web vitals for this week", input: { startDate: "2026-04-03", endDate: "2026-04-10", projectName: "MyApp" } },
          { description: "How is my site performance past month", input: { startDate: "2026-03-10", endDate: "2026-04-10", projectName: "MyApp" } },
          { description: "Core web vitals for mobile users", input: { startDate: "2026-04-01", endDate: "2026-04-10", projectName: "MyApp", filters: [{ name: "userDeviceType", value: ["mobile"], operator: "is" }] } },
          { description: "Web vitals for Safari users in Germany or France last 30 days", input: { startDate: "2026-03-11", endDate: "2026-04-10", siteId: "1", filters: [{ name: "userBrowser", value: ["Safari"], operator: "is" }, { name: "userCountry", value: ["Germany","France"], operator: "is" }] } },
          { description: "Performance metrics for Chrome on Windows of the user tahay@asyer.io", input: { startDate: "2026-04-01", endDate: "2026-04-10", projectName: "MyApp", filters: [{ name: "userBrowser", value: ["Chrome"], operator: "is" }, { name: "userOs", value: ["Windows"], operator: "is" }, { name: "userId", value: ["tahay@asayer.io"], operator: "is" }] } },
        ],
      },
    },
    async (parsed) => {
      console.error("[SERVER] view_web_vitals tool CALLED!");
      console.error("[SERVER] Arguments:", JSON.stringify(parsed, null, 2));

      try {

        const siteId = await resolveSiteId(parsed);

        const { startTs, endTs } = parseDateRange(parsed.startDate, parsed.endDate);

        const resolvedFilters = await resolveFilters(siteId, parsed.filters ?? []);

        const data = await fetchWebVitals(siteId, startTs, endTs, resolvedFilters);

        // Build a textual summary for the model
        const metrics = ["domBuildingTime", "ttfb", "speedIndex", "firstContentfulPaintTime", "lcp", "cls"];
        const metricNames: Record<string, string> = {
          domBuildingTime: "DOM Complete",
          ttfb: "TTFB",
          speedIndex: "Speed Index",
          firstContentfulPaintTime: "FCP",
          lcp: "LCP",
          cls: "CLS",
        };
        const summaryLines = metrics.map(key => {
          const m = data?.[key];
          if (!m) return `${metricNames[key]}: no data`;
          return `${metricNames[key]}: P50=${m.P50} (${m.P50Status}), P75=${m.P75} (${m.P75Status}), Avg=${m.Avg?.toFixed(1)} (${m.AvgStatus})`;
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                type: "web_vitals",
                siteId,
                startDate: parsed.startDate,
                endDate: parsed.endDate,
                data,
                summary: summaryLines.join("\n"),
              }),
            },
          ],
        };
      } catch (error) {
        console.error("[SERVER] Error fetching web vitals:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                type: "error",
                error: errorMessage,
                isAuthError: errorMessage.includes("AUTH_ERROR"),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );
  console.error("[SERVER] view_web_vitals tool registered successfully");

  // Tool 5: View Table Chart (top pages, browsers, countries, requests, etc.)
  console.error("[SERVER] Registering view_table_chart tool with UI...");
  registerAppTool(
    server,
    "view_table_chart",
    {
      title: "OpenReplay Top Analytics",
      annotations: { readOnlyHint: true, openWorldHint: true },
      description:
        "PREFERRED tool for showing ranked table/bar chart for 'top X' analytics. " +
        "Use this when the user asks for top, most popular, distribution, or breakdown of any dimension. " +
        "Supported metricOf values: 'LOCATION' (top pages), 'REQUEST' (top network requests), 'userId' (top users), " +
        "'userBrowser' (top browsers), 'userCountry' (top countries), 'userOs' (top OS), 'userDevice' (top devices). " +
        "Examples: 'what are the top pages', 'show browser distribution', 'most popular countries'. " +
        "You MUST convert time references to ISO date strings. " +
        "Supports filtering by user attributes. " +
        "TIP: Call this tool multiple times with different metricOf values for a comprehensive breakdown. " +
        "Use view_recent_sessions with the same filters to drill into sessions related to this data.",
      inputSchema: ViewTableChartSchema,
      _meta: {
        ui: {
          resourceUri,
          visibility: ["model"],
          csp: {
            connectDomains: uiConnectDomains(),
          },
        },
        examples: [
          { description: "What are the top visited pages this week", input: { startDate: "2026-04-07", endDate: "2026-04-10", metricOf: "LOCATION", projectName: "MyApp" } },
          { description: "Show browser distribution this month", input: { startDate: "2026-04-01", endDate: "2026-04-10", metricOf: "userBrowser", projectName: "MyApp" } },
          { description: "Most popular countries last 30 days", input: { startDate: "2026-03-11", endDate: "2026-04-10", metricOf: "userCountry", projectName: "MyApp" } },
          { description: "Top 5 network requests today", input: { startDate: "2026-04-10", endDate: "2026-04-10", metricOf: "REQUEST", projectName: "MyApp", limit: 5 } },
          { description: "Top OS for mobile users", input: { startDate: "2026-04-01", endDate: "2026-04-10", metricOf: "userOs", projectName: "MyApp", filters: [{ name: "userDeviceType", value: ["mobile"], operator: "is" }] } },
          { description: "Device breakdown for Chrome users in the US", input: { startDate: "2026-04-01", endDate: "2026-04-10", metricOf: "userDevice", siteId: "1", filters: [{ name: "userBrowser", value: ["Chrome"], operator: "is" }, { name: "userCountry", value: ["United States"], operator: "is" }] } },
        ],
      },
    },
    async (parsed) => {
      console.error("[SERVER] view_table_chart tool CALLED!");
      console.error("[SERVER] Arguments:", JSON.stringify(parsed, null, 2));

      try {

        const siteId = await resolveSiteId(parsed);

        const { startTs, endTs } = parseDateRange(parsed.startDate, parsed.endDate);

        const resolvedFilters = await resolveFilters(siteId, parsed.filters ?? []);

        const data = await fetchTableData(siteId, startTs, endTs, parsed.metricOf, parsed.limit, resolvedFilters);

        // Derive a friendly title from metricOf
        const titleMap: Record<string, string> = {
          LOCATION: "Top Pages",
          REQUEST: "Top Network Requests",
          userBrowser: "Top Browsers",
          userCountry: "Top Countries",
          userOs: "Top Operating Systems",
          userDevice: "Top Devices",
        };
        const title = titleMap[parsed.metricOf] || `Top ${parsed.metricOf}`;

        // Build textual summary for the model
        const values = data?.values || [];
        const summaryLines = values.slice(0, 10).map((v: any, i: number) =>
          `${i + 1}. ${v.name}: ${v.total} sessions`
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                type: "table_chart",
                siteId,
                startDate: parsed.startDate,
                endDate: parsed.endDate,
                metricOf: parsed.metricOf,
                title,
                data,
                summary: summaryLines.join("\n"),
              }),
            },
          ],
        };
      } catch (error) {
        console.error("[SERVER] Error fetching table data:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                type: "error",
                error: errorMessage,
                isAuthError: errorMessage.includes("AUTH_ERROR"),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );
  console.error("[SERVER] view_table_chart tool registered successfully");

  // Tool 6: View Funnel
  console.error("[SERVER] Registering view_funnel tool with UI...");
  registerAppTool(
    server,
    "view_funnel",
    {
      title: "OpenReplay Funnel Analysis",
      annotations: { readOnlyHint: true, openWorldHint: true },
      description:
        "PREFERRED tool for showing step-by-step conversion funnels. " +
        "Use this when the user asks about conversion rates, drop-off, funnel analysis, " +
        "or how many users complete a multi-step flow. " +
        "Steps can be URL paths (shorthand for LOCATION page-views), or any event from the project's events list — " +
        "built-in autoCaptured events: LOCATION (page view), CLICK, INPUT (text input), ISSUE; or custom events (autoCaptured=false). " +
        "For LOCATION the value is matched against urlPath; for CLICK/INPUT against label; for ISSUE against issue type id. " +
        "Custom events are matched by event name only — no value needed. " +
        "Discover available events via get_available_filters. Minimum 2 steps. " +
        "You MUST convert time references to ISO date strings. " +
        "TIP: Combine with view_user_journey to see where users actually go instead. " +
        "Use view_recent_sessions with the same filters to drill into related sessions.",
      inputSchema: ViewFunnelSchema,
      _meta: {
        ui: {
          resourceUri,
          visibility: ["model"],
          csp: {
            connectDomains: uiConnectDomains(),
          },
        },
        examples: [
          { description: "Show me the checkout funnel last week", input: { startDate: "2026-04-21", endDate: "2026-04-28", steps: ["/cart", "/checkout", "/confirm"], projectName: "MyApp" } },
          { description: "Conversion from /pricing to /signup", input: { startDate: "2026-04-21", endDate: "2026-04-28", steps: ["/pricing", "/signup"], projectName: "MyApp" } },
          { description: "Onboarding funnel for mobile users this month", input: { startDate: "2026-04-01", endDate: "2026-04-28", steps: ["/welcome", "/profile", "/setup", "/dashboard"], projectName: "MyApp", filters: [{ name: "userDeviceType", value: ["mobile"], operator: "is" }] } },
          { description: "Visited /pricing then clicked Subscribe", input: { startDate: "2026-04-01", endDate: "2026-04-28", steps: ["/pricing", { type: "CLICK", value: "Subscribe" }], projectName: "MyApp" } },
          { description: "Sign-up flow ending in custom 'dashboard_list_viewed' event", input: { startDate: "2026-04-01", endDate: "2026-04-28", steps: ["/sessions", { type: "dashboard_list_viewed" }], projectName: "MyApp" } },
          { description: "Search input then click Result", input: { startDate: "2026-04-01", endDate: "2026-04-28", steps: [{ type: "INPUT", value: "Search", operator: "contains" }, { type: "CLICK", value: "Result" }], projectName: "MyApp" } },
          { description: "Page view followed by JS exception", input: { startDate: "2026-04-01", endDate: "2026-04-28", steps: ["/checkout", { type: "ISSUE", value: "js_exception" }], projectName: "MyApp" } },
        ],
      },
    },
    async (parsed) => {
      console.error("[SERVER] view_funnel tool CALLED!");
      console.error("[SERVER] Arguments:", JSON.stringify(parsed, null, 2));

      try {

        const siteId = await resolveSiteId(parsed);

        const { startTs, endTs } = parseDateRange(parsed.startDate, parsed.endDate);

        const resolvedFilters = await resolveFilters(siteId, parsed.filters ?? []);

        const stepFilters = await resolveFunnelSteps(siteId, parsed.steps);
        let data = await fetchFunnel(siteId, startTs, endTs, stepFilters, resolvedFilters);

        // Unwrap new series format: { series: { "Series 1": { stages: [...] } } }
        if (data?.series && typeof data.series === "object" && !Array.isArray(data.series)) {
          const firstSeries = Object.values(data.series)[0] as any;
          if (firstSeries?.stages) {
            data = firstSeries;
          } else if (firstSeries?.$overall?.stages) {
            data = firstSeries.$overall;
          }
        }

        // Render a step descriptor as a short label for the summary line.
        const stepLabel = (s: typeof parsed.steps[number]): string => {
          if (typeof s === "string") return s;
          return s.value ? `${s.type} "${s.value}"` : s.type;
        };

        // Build textual summary from stages
        const stages = data?.stages || [];
        const firstCount = stages[0]?.count || 0;
        const summaryLines = stages.map((stage: any, i: number) => {
          const label = stage.value?.[0] || stepLabel(parsed.steps[i]) || `Step ${i + 1}`;
          const pctOfFirst = firstCount > 0 ? ((stage.count / firstCount) * 100).toFixed(1) : "0";
          const dropInfo = stage.dropPct != null ? ` (${stage.dropPct.toFixed(1)}% dropped)` : '';
          return `Step ${i + 1} "${label}": ${stage.count} sessions (${pctOfFirst}% of start)${dropInfo}`;
        });

        const lastCount = stages[stages.length - 1]?.count || 0;
        const overallConversion = firstCount > 0 ? ((lastCount / firstCount) * 100).toFixed(1) : "0";
        summaryLines.push(`Overall conversion: ${overallConversion}% (${lastCount} of ${firstCount})`);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                type: "funnel",
                siteId,
                startDate: parsed.startDate,
                endDate: parsed.endDate,
                steps: parsed.steps,
                data,
                summary: summaryLines.join("\n"),
              }),
            },
          ],
        };
      } catch (error) {
        console.error("[SERVER] Error fetching funnel:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                type: "error",
                error: errorMessage,
                isAuthError: errorMessage.includes("AUTH_ERROR"),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );
  console.error("[SERVER] view_funnel tool registered successfully");

  // View session replay (mob-file parsing with server-side DOM reconstruction)
  console.error("[SERVER] Registering view_session_replay tool...");
  registerAppTool(
    server,
    "view_session_replay",
    {
      title: "Session Replay",
      annotations: { readOnlyHint: true, openWorldHint: true },
      description:
        "View a session replay with full DOM reconstruction. " +
        "Provide a sessionId from a previous session list or search. " +
        "Use this when the user wants to watch or replay a specific session. " +
        "The user may refer to a session by its position in a previously fetched list. " +
        "After showing the replay, try to provide session analysis based on data you have and" +
        " let the user know they can also open this session directly in the full OpenReplay UI in their browser via a direct link.",
      inputSchema: ViewSessionReplaySchema,
      _meta: {
        ui: {
          resourceUri,
          visibility: ["model", "app"],
        },
        examples: [
          { description: "Replay a session by ID in MyApp", input: { sessionId: "7891234567890", projectName: "MyApp" } },
          { description: "Show me the replay of the second session (use sessionId from previous list)", input: { sessionId: "7891234567890", siteId: "1" } },
          { description: "Watch the last session shown in the list", input: { sessionId: "7891234567890", siteId: "1" } },
        ],
      },
    },
    async (parsed) => {
      console.error("[SERVER] view_session_replay tool CALLED!");
      console.error("[SERVER] Arguments:", JSON.stringify(parsed, null, 2));

      try {

        if (!state.jwt) {
          return {
            content: [{ type: "text", text: JSON.stringify({ type: "error", error: "Not authenticated", isAuthError: true }) }],
            isError: true,
          };
        }

        const siteId = await resolveSiteId(parsed);

        // Fetch session replay metadata
        console.error(`[SERVER] Fetching replay metadata for session ${parsed.sessionId}...`);
        const replay = await fetchSessionReplay(siteId, parsed.sessionId);

        // Mobile recordings are a different format (message stream + video
        // track, replayed by IOSMessageManager). Feeding videoURL to the web
        // parser yields garbage, so say so instead of rendering a broken player.
        if (isMobilePlatform(replay.platform)) {
          const sessionUrl = `${state.appUrl}/${siteId}/session/${parsed.sessionId}`;
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                type: "error",
                error: `This is a ${replay.platform} session. The embedded player only supports web recordings — open it in the OpenReplay UI instead: ${sessionUrl}`,
              }),
            }],
            isError: true,
          };
        }

        const fileUrls: string[] = replay.domURL || [];

        if (!fileUrls.length) {
          return {
            content: [{ type: "text", text: JSON.stringify({ type: "error", error: "No recording files found for this session" }) }],
            isError: true,
          };
        }

        console.error(`[SERVER] Found ${fileUrls.length} mob file(s), platform: ${replay.platform || 'web'}`);

        // Only these URLs may be fetched back through _fetch_mob_file
        allowMobUrls(fileUrls);

        // Return metadata + mob file URLs — the UI will fetch and parse them directly
        const result = {
          type: "session_replay",
          sessionId: parsed.sessionId,
          siteId,
          duration: replay.duration,
          startTs: replay.startTs,
          fileUrls,
          // Present when the instance has file encryption enabled; the UI needs
          // it to decrypt each mob file before parsing.
          fileKey: replay.fileKey,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      } catch (err: any) {
        console.error("[SERVER] view_session_replay error:", err);
        const isAuthError = err.message?.includes("AUTH_ERROR");
        return {
          content: [{ type: "text", text: JSON.stringify({ type: "error", error: err.message || "Unknown error", isAuthError }) }],
          isError: true,
        };
      }
    }
  );
  console.error("[SERVER] view_session_replay tool registered");
}

// Register internal tools
export function registerInternalTools(server: McpServer) {

  // Refresh replay URLs (called by UI when signed URLs expire)
  registerAppTool(
    server,
    "_refresh_replay_urls",
    {
      annotations: { readOnlyHint: true, openWorldHint: true },
      description: "Re-fetch signed mob file URLs for a session replay (internal use by UI only)",
      inputSchema: RefreshReplayUrlsSchema,
      _meta: { ui: { visibility: ["app"] } },
    },
    async (args) => {
      try {
        if (!state.jwt) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "Not authenticated" }) }],
            isError: true,
          };
        }
        const sessionId = args.sessionId as string;
        let siteId = args.siteId as string | undefined;
        if (!siteId) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "No siteId available" }) }],
            isError: true,
          };
        }
        console.error(`[SERVER] _refresh_replay_urls: fetching for session ${sessionId}...`);
        const replay = await fetchSessionReplay(siteId, sessionId);
        if (isMobilePlatform(replay.platform)) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Unsupported platform for embedded replay: ${replay.platform}` }) }],
            isError: true,
          };
        }
        const fileUrls: string[] = replay.domURL || [];
        if (!fileUrls.length) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "No recording files found" }) }],
            isError: true,
          };
        }
        allowMobUrls(fileUrls);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              fileUrls,
              startTs: replay.startTs,
              duration: replay.duration,
              fileKey: replay.fileKey,
            }),
          }],
        };
      } catch (err: any) {
        console.error(`[SERVER] _refresh_replay_urls error:`, err);
        return {
          content: [{ type: "text", text: JSON.stringify({ error: err.message }) }],
          isError: true,
        };
      }
    }
  );

  // Proxy mob file fetches for the UI (sandbox CSP blocks direct fetch)
  registerAppTool(
    server,
    "_fetch_mob_file",
    {
      annotations: { readOnlyHint: true, openWorldHint: true },
      description: "Fetch a mob file by URL and return base64 (internal use by UI only)",
      inputSchema: FetchUrlSchema,
      _meta: { ui: { visibility: ["app"] } },
    },
    async (args) => {
      let url: string;
      try {
        url = assertFetchableMobUrl(args.url as string);
      } catch (err: any) {
        return {
          content: [{ type: "text", text: JSON.stringify({ code: "invalid_url", error: err.message }) }],
          isError: true,
        };
      }
      console.error(`[SERVER] _fetch_mob_file: fetching ${url.slice(0, 80)}...`);
      try {
        const bytes = await fetchCapped(url, MAX_MOB_FILE_BYTES);
        console.error(`[SERVER] _fetch_mob_file: fetched ${Math.floor(bytes.byteLength / 1024)}kb`);
        return {
          content: [{ type: "text", text: Buffer.from(bytes).toString("base64") }],
        };
      } catch (err: any) {
        console.error(`[SERVER] _fetch_mob_file error:`, err);
        // Signed mob URLs expire; the UI re-requests fresh ones on `expired`
        // rather than string-matching the message.
        const expired = /HTTP 40[13]/.test(err.message ?? "");
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ code: expired ? "expired" : "fetch_failed", error: err.message }),
          }],
          isError: true,
        };
      }
    }
  );

  // Proxy external stylesheet fetches for the replay iframe. Separate from
  // _fetch_mob_file because these URLs come from the recorded page, not from
  // this server — see assertProxyableCssUrl.
  registerAppTool(
    server,
    "_fetch_css",
    {
      annotations: { readOnlyHint: true, openWorldHint: true },
      description: "Fetch an external stylesheet by URL and return base64 (internal use by UI only)",
      inputSchema: FetchUrlSchema,
      _meta: { ui: { visibility: ["app"] } },
    },
    async (args) => {
      let url: string;
      try {
        url = await assertProxyableCssUrl(args.url as string);
      } catch (err: any) {
        return {
          content: [{ type: "text", text: JSON.stringify({ code: "invalid_url", error: err.message }) }],
          isError: true,
        };
      }
      try {
        const bytes = await fetchCapped(url, MAX_CSS_BYTES);
        return {
          content: [{ type: "text", text: Buffer.from(bytes).toString("base64") }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: JSON.stringify({ code: "fetch_failed", error: err.message }) }],
          isError: true,
        };
      }
    }
  );

  // Configure the OpenReplay instance URL (one URL — UI host; API host is derived).
  console.error("[SERVER] Registering configure_backend tool...");
  server.registerTool(
    "configure_backend",
    {
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
      description: "Configure the OpenReplay instance URL. Pass the URL the user types into their browser; the API host is derived automatically (api.openreplay.com for SaaS, <host>/api otherwise).",
      inputSchema: ConfigureBackendSchema,
      _meta: {
        examples: [
          { description: "Use OpenReplay Cloud", input: { appUrl: "https://app.openreplay.com" } },
          { description: "Use a self-hosted instance", input: { appUrl: "https://openreplay.mycompany.com" } },
        ],
      },
    },
    async (parsed) => {
      console.error("[SERVER] configure_backend called:", parsed);
      const switched = await setAppUrl(assertHttpsUrl(parsed.appUrl));
      return {
        content: [
          {
            type: "text",
            text: `OpenReplay URL configured: ${state.appUrl}` +
              (switched ? ". Signed out of the previous instance — log in again with login_browser." : ""),
          },
        ],
      };
    }
  );
  console.error("[SERVER] configure_backend tool registered");

  // Login with a raw JWT (testing / service-account flow)
  console.error("[SERVER] Registering login_jwt tool...");
  server.registerTool(
    "login_jwt",
    {
      annotations: { readOnlyHint: false, openWorldHint: false },
      description: "Authenticate with OpenReplay using a JWT token (for testing).",
      inputSchema: LoginJwtSchema,
    },
    async (parsed) => {
      console.error("[SERVER] login_jwt called");
      state.jwt = parsed.jwt;
      state.userData = { authenticated: true };
      clearInstanceCaches();

      await savePersistedState();

      return {
        content: [
          {
            type: "text",
            text: "Successfully authenticated with JWT token",
          },
        ],
      };
    }
  );
  console.error("[SERVER] login_jwt tool registered");

  // Login via browser (OAuth-style) — returns the URL immediately. The model
  // should show the URL to the user and then call complete_login.
  console.error("[SERVER] Registering login_browser tool...");
  server.registerTool(
    "login_browser",
    {
      annotations: { readOnlyHint: false, openWorldHint: false },
      description:
        "PREFERRED login method. RETURNS IMMEDIATELY with an authorize URL — show the URL to the user " +
        "and ask them to open it in their browser and click 'Authorize' in the OpenReplay tab, " +
        "then call complete_login to finish the flow. " +
        "Use this whenever the user needs to log in. The only alternative is login_jwt for a raw token.",
      inputSchema: LoginBrowserSchema,
      _meta: {
        examples: [
          { description: "Log me in (use already-configured instance)", input: {} },
          { description: "Log in to a self-hosted OpenReplay", input: { appUrl: "https://openreplay.mycompany.com" } },
        ],
      },
    },
    async (parsed) => {
      // Validate any model-supplied URL up front; reject non-https before it
      // ever reaches an authorize link or API request.
      if (parsed.appUrl) {
        await setAppUrl(assertHttpsUrl(parsed.appUrl));
      }
      const appUrl = assertHttpsUrl(state.appUrl);

      const authCode = generateAuthCode();
      state.pendingAuthCode = authCode;
      const authorizeUrl = `${appUrl}/mcp/authorize?state=${authCode}&client_id=${state.clientId}&app_name=${encodeURIComponent("OpenReplay MCP")}`;

      // The authorize URL is built from the validated instance host, so it is
      // guaranteed same-origin with the configured backend.
      console.error(`[SERVER] login_browser: authorize URL ${authorizeUrl}`);

      // We do NOT launch a browser process here — instead we hand the URL back
      // for the user to open. (Spawning a shell to "open" a model-influenced URL
      // is an injection risk and unnecessary.)
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              type: "auth_pending",
              authorizeUrl,
              state: authCode,
              appUrl,
              message:
                "Share this authorize URL with the user and ask them to open it in their browser " +
                "and click 'Authorize'. Then call complete_login to finish.",
            }),
          },
        ],
      };
    }
  );
  console.error("[SERVER] login_browser tool registered");

  // Complete the browser-based login by polling auth-status
  console.error("[SERVER] Registering complete_login tool...");
  server.registerTool(
    "complete_login",
    {
      annotations: { readOnlyHint: false, openWorldHint: true },
      description:
        "Finalize browser-based login started by login_browser. Polls OpenReplay for approval. " +
        "Call this AFTER the user confirms they clicked 'Authorize' in the browser. " +
        "Returns auth_success on approval, or auth_pending if not yet approved (call again to keep waiting).",
      inputSchema: CompleteLoginSchema,
    },
    async (parsed) => {
      const authCode = parsed.state || state.pendingAuthCode;

      if (!authCode) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                type: "error",
                error: "No pending login. Call login_browser first to start the flow.",
              }),
            },
          ],
          isError: true,
        };
      }

      const timeoutMs = parsed.timeoutMs ?? 60_000;
      console.error(`[SERVER] complete_login: polling for state=${authCode} timeoutMs=${timeoutMs}`);

      const result = await pollForAuth(state.appUrl, authCode, state.clientId!, timeoutMs);

      if (!result.jwt) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                type: "auth_pending",
                state: authCode,
                statusUrl: result.statusUrl,
                durationMs: result.durationMs,
                aborted: result.aborted,
                timedOut: result.timedOut,
                summary: result.summary,
                message:
                  "Still waiting for approval. summary.statusCounts shows the HTTP statuses observed across all polls. " +
                  "If every attempt is 4xx/5xx, the backend isn't storing the authorization — check the OpenReplay UI's " +
                  "network tab when clicking 'Authorize'. Otherwise call complete_login again to keep waiting.",
              }),
            },
          ],
        };
      }

      state.jwt = result.jwt;
      state.userData = { authenticated: true };
      state.pendingAuthCode = null;
      clearInstanceCaches();
      await savePersistedState();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              type: "auth_success",
              message: "Successfully authenticated via browser.",
              attempts: result.summary.totalAttempts,
              durationMs: result.durationMs,
            }),
          },
        ],
      };
    }
  );
  console.error("[SERVER] complete_login tool registered");

  // Fetch chart data
  console.error("[SERVER] Registering fetch_chart_data tool...");
  server.registerTool(
    "fetch_chart_data",
    {
      annotations: { readOnlyHint: true, openWorldHint: true },
      description: "Fetch chart data from OpenReplay API",
      inputSchema: FetchChartDataSchema,
    },
    async (parsed) => {
      console.error("[SERVER] fetch_chart_data called:", parsed);

      if (!state.jwt) {
        throw new Error("Not authenticated. Please login first.");
      }

      let endpoint = parsed.endpoint;
      if (parsed.params) {
        const entries: [string, string][] = Object.entries(parsed.params).map(
          ([key, value]) => [key, String(value)]
        );
        const queryString = new URLSearchParams(entries).toString();
        endpoint += `?${queryString}`;
      }

      const data = await makeApiRequest(endpoint);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );
  console.error("[SERVER] fetch_chart_data tool registered");


  // Get auth status
  console.error("[SERVER] Registering get_auth_status tool...");
  server.registerTool(
    "get_auth_status",
    {
      annotations: { readOnlyHint: true, openWorldHint: false },
      description: "Check current authentication status",
    },
    async () => {
      console.error("[SERVER] get_auth_status called");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              authenticated: !!state.jwt,
              appUrl: state.appUrl,
              user: state.userData,
            }, null, 2),
          },
        ],
      };
    }
  );
  console.error("[SERVER] get_auth_status tool registered");

  // Logout
  console.error("[SERVER] Registering logout tool...");
  server.registerTool(
    "logout",
    {
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
      description: "Clear authentication and remove persisted token",
    },
    async () => {
      console.error("[SERVER] logout called");
      state.jwt = null;
      state.userData = null;
      clearInstanceCaches();

      // Clear persisted state
      await clearPersistedState();

      return {
        content: [
          {
            type: "text",
            text: "Successfully logged out",
          },
        ],
      };
    }
  );
  console.error("[SERVER] logout tool registered");

  // List projects
  console.error("[SERVER] Registering list_projects tool...");
  server.registerTool(
    "list_projects",
    {
      annotations: { readOnlyHint: true, openWorldHint: true },
      description: "Fetch and list all available OpenReplay projects. This saves the projects to context so you can reference them by name in subsequent requests.",
    },
    async () => {
      console.error("[SERVER] list_projects called");

      if (!state.jwt) {
        throw new Error("Not authenticated. Please login first.");
      }

      const projects = await fetchProjects();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              count: projects.length,
              projects: projects.map(p => ({
                name: p.name,
                projectId: p.projectId,
              })),
            }, null, 2),
          },
        ],
      };
    }
  );
  console.error("[SERVER] list_projects tool registered");



  // Get detailed session information (replay metadata + events)
  console.error("[SERVER] Registering get_session_details tool...");
  server.registerTool(
    "get_session_details",
    {
      annotations: { readOnlyHint: true, openWorldHint: true },
      description:
        "Get detailed information about a specific session including metadata and events. " +
        "Fetches both session replay metadata (user info, device, location, timing) and session events " +
        "(errors, clicks, page visits, custom events, issues). " +
        "Use this after view_recent_sessions to investigate a particular session. " +
        "The user may refer to a session by its position in a previously fetched list " +
        "(e.g. 'tell me about the second session', 'details on the last one') — " +
        "in that case, pick the corresponding sessionId and siteId from the earlier results in context. " +
        "The user may also provide a sessionId directly. " +
        "Returns structured data with a summary section first, followed by full replay metadata and events breakdown.",
      inputSchema: GetSessionDetailsSchema,
      _meta: {
        examples: [
          { description: "Tell me about this session ID in MyApp", input: { sessionId: "7891234567890", projectName: "MyApp" } },
          { description: "Details on the second session from previous list (use sessionId from list)", input: { sessionId: "7891234567890", siteId: "1" } },
          { description: "What happened in the last session", input: { sessionId: "7891234567890", siteId: "1" } },
        ],
      },
    },
    async (parsed) => {
      console.error("[SERVER] get_session_details called:", parsed);

      if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
      }

      const siteId = await resolveSiteId(parsed);

      // Fetch both endpoints in parallel
      const [replay, events] = await Promise.all([
        fetchSessionReplay(siteId, parsed.sessionId),
        fetchSessionEvents(siteId, parsed.sessionId),
      ]);

      // Build summary counts for events
      const eventsSummary = {
        errors: Array.isArray(events.errors) ? events.errors.length : 0,
        events: Array.isArray(events.events) ? events.events.length : 0,
        incidents: Array.isArray(events.incidents) ? events.incidents.length : 0,
        issues: Array.isArray(events.issues) ? events.issues.length : 0,
        userEvents: Array.isArray(events.userEvents) ? events.userEvents.length : 0,
      };

      // Construct replay URL — use the UI URL directly. No JWT in the URL;
      // the user's existing OpenReplay browser session authenticates the link.
      const baseUrl = state.appUrl.replace(/\/+$/, '');
      const replayUrl = `${baseUrl}/${siteId}/session/${parsed.sessionId}`;

      // Structure response with summary first (for large data pattern)
      const response = {
        type: "session_details",
        summary: {
          sessionId: parsed.sessionId,
          siteId,
          userId: replay.userId || replay.userUuid || "Anonymous",
          duration: replay.duration,
          platform: replay.platform,
          userBrowser: replay.userBrowser,
          userOs: replay.userOs,
          userCountry: replay.userCountry,
          userCity: replay.userCity,
          pagesCount: replay.pagesCount,
          eventsCount: replay.eventsCount,
          issueTypes: replay.issueTypes,
          live: replay.live,
          replayUrl,
          eventsCounts: eventsSummary,
        },
        replay,
        events,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    }
  );
  console.error("[SERVER] get_session_details tool registered");

  // Get available filters for a project
  console.error("[SERVER] Registering get_available_filters tool...");
  server.registerTool(
    "get_available_filters",
    {
      annotations: { readOnlyHint: true, openWorldHint: true },
      description:
        "Get the list of available filters for a project. Call this before applying filters to data tools " +
        "(view_recent_sessions, view_chart, view_user_journey, view_funnel, ...) to discover valid filter names " +
        "and their possible values. Returns filter names, display names, data types, and sample values. " +
        "Filters are split into: 'events' (e.g. CLICK, LOCATION, REQUEST — these accept 'properties' sub-filters), " +
        "'eventProperties' (valid 'name' values inside an event filter's 'properties' array, e.g. urlPath, label, status), " +
        "'attributes' (flat session/user filters like userCountry, userBrowser), " +
        "'segments' (saved user segments) and 'features' (tagged elements), which are used by name alone. " +
        "Country values can be full names ('France'); numeric properties (status, duration) take numbers.",
      inputSchema: ProjectSchema,
      _meta: {
        examples: [
          { description: "What filters are available for MyApp", input: { projectName: "MyApp" } },
          { description: "List filters for project 1", input: { siteId: "1" } },
        ],
      },
    },
    async (args) => {
      console.error("[SERVER] get_available_filters called:", args);

      if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
      }

      const siteId = await resolveSiteId(args);

      const filterData = await getOrFetchFilters(siteId);

      // Group by role: events (accept properties), eventProperties (sub-filter names),
      // and flat attributes (session/user filters). This shape mirrors how the
      // filters get used: top-level `name` comes from events+attributes, while
      // `properties[].name` inside an event must come from eventProperties.
      const events: any[] = [];
      const eventProperties: any[] = [];
      const attributes: any[] = [];
      const segments: any[] = [];
      const features: any[] = [];

      const buildEntry = (filter: any, categoryDisplayName: string) => {
        const entry: any = {
          name: filter.name,
          displayName: filter.displayName || filter.name,
          category: categoryDisplayName,
          dataType: filter.dataType,
        };
        if (filter.possibleValues?.length) {
          entry.possibleValues = filter.possibleValues.slice(0, 20);
          if (filter.possibleValues.length > 20) {
            entry.totalValues = filter.possibleValues.length;
          }
        }
        return entry;
      };

      for (const [categoryName, category] of Object.entries(filterData) as [string, any][]) {
        if (!category?.list) continue;
        const categoryDisplayName = category.displayName || categoryName;
        const bucket =
          categoryName === "events" ? events :
          categoryName === "event" ? eventProperties :
          categoryName === "segments" ? segments :
          categoryName === "features" ? features :
          attributes;
        for (const filter of category.list) {
          bucket.push(buildEntry(filter, categoryDisplayName));
        }
      }

      const totalCount = events.length + eventProperties.length + attributes.length + segments.length + features.length;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              siteId,
              totalCount,
              usage: "Use 'events' names as top-level filter `name` (with optional `properties` sub-filters drawn from 'eventProperties'). Use 'attributes' names as flat filters with a `value` array. " +
                "Use a 'segments' (saved user segment) or 'features' (tagged element) name as a filter `name` on its own, with no `value`.",
              events,
              eventProperties,
              attributes,
              segments,
              features,
            }, null, 2),
          },
        ],
      };
    }
  );
  console.error("[SERVER] get_available_filters tool registered");

  // Fetch recent events (data management)
  console.error("[SERVER] Registering fetch_events tool...");
  server.registerTool(
    "fetch_events",
    {
      annotations: { readOnlyHint: true, openWorldHint: true },
      description:
        "Fetch recent tracked events (pageviews, clicks, custom events, errors) from the analytics data pipeline. " +
        "Returns event name, timestamp, user ID, session ID, city, OS, and whether it was auto-captured. " +
        "Use this to understand what events are being tracked, investigate specific event types, " +
        "or get a feed of recent user activity. Supports date range and pagination.",
      inputSchema: FetchEventsSchema,
      _meta: {
        examples: [
          { description: "Recent events for MyApp (last 24h, default)", input: { projectName: "MyApp" } },
          { description: "Events from yesterday", input: { projectName: "MyApp", startDate: "2026-04-27", endDate: "2026-04-28" } },
          { description: "Last 100 events this week", input: { projectName: "MyApp", startDate: "2026-04-21", endDate: "2026-04-28", limit: 100 } },
          { description: "Page 2 of recent events", input: { projectName: "MyApp", page: 2 } },
        ],
      },
    },
    async (args) => {
      console.error("[SERVER] fetch_events called:", args);

      if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
      }

      const siteId = await resolveSiteId(args);

      const { startTs, endTs } = parseDateRange(args.startDate, args.endDate, DAY_MS);
      const limit = Math.min(args.limit || 50, 200);

      const data = await fetchEvents(siteId, startTs, endTs, limit, args.page || 1);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            siteId,
            total: data.total,
            page: args.page || 1,
            limit,
            events: data.events,
          }, null, 2),
        }],
      };
    }
  );
  console.error("[SERVER] fetch_events tool registered");

  // Fetch users (data management)
  console.error("[SERVER] Registering fetch_users tool...");
  server.registerTool(
    "fetch_users",
    {
      annotations: { readOnlyHint: true, openWorldHint: true },
      description:
        "Fetch tracked users from the analytics data pipeline. " +
        "Returns user ID, name, email, location, last seen, and custom properties. " +
        "Use this to understand who your users are, search for specific users, " +
        "or get a list of recently active users. Supports search query and pagination.",
      inputSchema: FetchUsersSchema,
      _meta: {
        examples: [
          { description: "List recent users for MyApp", input: { projectName: "MyApp" } },
          { description: "Find users with email containing 'tahay'", input: { projectName: "MyApp", query: "tahay" } },
          { description: "Users active in the last 30 days", input: { projectName: "MyApp", startDate: "2026-03-29", endDate: "2026-04-28" } },
          { description: "Search for users named John, 100 per page", input: { projectName: "MyApp", query: "John", limit: 100 } },
        ],
      },
    },
    async (args) => {
      console.error("[SERVER] fetch_users called:", args);

      if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
      }

      const siteId = await resolveSiteId(args);

      const { startTs, endTs } = parseDateRange(args.startDate, args.endDate, 7 * DAY_MS);
      const limit = Math.min(args.limit || 50, 200);

      const data = await fetchUsers(siteId, startTs, endTs, limit, args.page || 1, args.query || "");

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            siteId,
            total: data.total,
            page: args.page || 1,
            limit,
            users: data.users,
          }, null, 2),
        }],
      };
    }
  );
  console.error("[SERVER] fetch_users tool registered");


  // Search OpenReplay documentation
  console.error("[SERVER] Registering search_docs tool...");
  server.registerTool(
    "search_docs",
    {
      annotations: { readOnlyHint: true, openWorldHint: true },
      description:
        "ALWAYS use this tool when the user asks any question about OpenReplay itself — " +
        "how features work, SDK setup and methods, deployment, integrations, plugins, configuration, " +
        "data sanitization/privacy, troubleshooting, plans/pricing, billing, or anything else covered by " +
        "the public OpenReplay documentation. Examples: 'how do I install the React SDK', " +
        "'what's the difference between cloud and self-hosted', 'how do I redact sensitive data', " +
        "'how do I deploy on Kubernetes', 'how do funnels work'. " +
        "Pass the user's question or relevant keywords as `query`. Returns matching sections from the " +
        "OpenReplay docs (sourced from llms-full.txt), each containing a description and a link to the " +
        "corresponding page on docs.openreplay.com that you can cite to the user.",
      inputSchema: SearchDocsSchema,
      _meta: {
        examples: [
          { description: "How do I install the React SDK", input: { query: "react sdk install" } },
          { description: "How do I deploy on AWS", input: { query: "deploy aws ec2" } },
          { description: "How to redact sensitive data", input: { query: "data sanitization privacy redact" } },
          { description: "What is the difference between cloud and self-hosted", input: { query: "cloud self-hosted difference" } },
          { description: "How do funnels work in product analytics", input: { query: "funnels conversion product analytics" } },
        ],
      },
    },
    async (args) => {
      console.error("[SERVER] search_docs called:", args);
      const query: string | undefined = args.query;

      let indexContent: string;
      try {
        indexContent = await getOpenReplayDocsIndex();
      } catch (err: any) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: err.message || "Failed to fetch docs index" }) }],
          isError: true,
        };
      }

      if (!query) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              type: "docs_index",
              hint: "Pass a `query` to filter to relevant sections.",
              content: indexContent,
            }),
          }],
        };
      }

      // Split into sections by `## ` heading (lookahead keeps the heading attached)
      const sections = indexContent.split(/(?=^## )/m).filter(s => s.trim().length > 0);
      const queryTerms = query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(t => t.length > 2 && !DOCS_STOP_WORDS.has(t));
      const allTerms = queryTerms.length > 0 ? queryTerms : [query.toLowerCase()];

      const scored = sections
        .map(section => {
          const lower = section.toLowerCase();
          let score = 0;
          for (const term of allTerms) {
            score += lower.split(term).length - 1;
          }
          return { section, score };
        })
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score);

      const top = scored.slice(0, 6).map(x => x.section);
      const result = top.length > 0 ? top.join("\n\n") : indexContent;

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            type: "docs_search",
            query,
            matchedSections: scored.length,
            returnedSections: top.length,
            hint: top.length === 0
              ? "No section matched the query; returning the full docs index. Try a more specific query or cite the index links directly."
              : "Each section includes a docs.openreplay.com link you can cite to the user.",
            content: result.slice(0, 40000),
          }),
        }],
      };
    }
  );
  console.error("[SERVER] search_docs tool registered");
}
