import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { exec } from "node:child_process";
import { z } from "zod";
import { state, savePersistedState, clearPersistedState, generateAuthCode } from "./state.js";
import { makeApiRequest, fetchRecentSessions, fetchProjects, getProjectIdByName, fetchSessionReplay, fetchSessionEvents, fetchSessionsTimeseries, fetchPathAnalysis, fetchWebVitals, fetchTableData, fetchFunnel, resolveFilters, getOrFetchFilters, fetchEvents, fetchUsers, fetchEventProperties, pollForAuth } from "./api.js";
import {
  ConfigureBackendSchema,
  LoginSchema,
  LoginBrowserSchema,
  FetchChartDataSchema,
  GetSessionReplaySchema,
  GetProjectIdSchema,
  GetSessionDetailsSchema,
  ViewSessionsChartSchema,
  ViewUserJourneySchema,
  ViewWebVitalsSchema,
  ViewTableChartSchema,
  ViewFunnelSchema,
  ViewSessionReplaySchema,
  FilterItemSchema,
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

// Register UI tools
export function registerUITools(server: McpServer, resourceUri: string) {
  // Tool 1: View Recent Sessions
  console.error("[SERVER] Registering view_recent_sessions tool with UI...");
  registerAppTool(
    server,
    "view_recent_sessions",
    {
      title: "OpenReplay Recent Sessions",
      description: "PREFERRED tool for fetching and displaying sessions. Always use this tool when the user asks to see, show, list, get, or fetch sessions. " +
        "Renders a rich interactive session list with user info, timing, device details, and play buttons. " +
        "You can specify one of the required parameters: project ID (siteId param) or its name (projectName param). " +
        "Supports filtering by user attributes (country, browser, OS, device, etc.). Call get_available_filters first to see what filters are available. " +
        "After showing the session list, let the user know they can (1) ask you to replay any session directly here using the built-in session player via view_session_replay, and (2) click the play button on any session in the list to open it in the full OpenReplay UI in their browser. Mention both options to the user. " +
        "TIP: Combine multiple data tools for comprehensive analysis. Use view_recent_sessions with the same filters to drill into sessions related to any chart data.",
      inputSchema: {
        siteId: z.string().optional().describe("Site ID (project ID). If not provided, will use projectName or default to 5."),
        projectName: z.string().optional().describe("Project name to look up. Will be resolved to project ID automatically."),
        limit: z.number().optional().default(10).describe("Number of sessions to fetch (default 10, max 50)"),
        filters: z.array(FilterItemSchema).optional().describe("Filters to apply. Use get_available_filters to discover valid filter names."),
      },
      _meta: {
        ui: {
          resourceUri,
          visibility: ["model"],
          csp: {
            connectDomains: ["foss.openreplay.com", "*.openreplay.com"],
          },
        },
        examples: [
          { description: "Show 20 sessions for project MyApp", input: { projectName: "MyApp", limit: 20 } },
          { description: "Sessions from Chrome users in France or Tunisia in project 1", input: { siteId: 1, filters: [{ name: "userBrowser", value: ["Chrome"], operator: "is" }, { name: "userCountry", value: ["France","Tunisia"], operator: "is" }] } },
          { description: "Show me sessions with errors", input: { projectName: "MyApp", filters: [{ name: "issueType", value: ["js_exception"], operator: "is" }] } },
          { description: "Last 5 sessions on serverless", input: { projectName: "serverless", limit: 5 } },
          { description: "Show me recent sessions of project serverless", input: { projectName: "serverless" } },
          { description: "Sessions of user tahay@asayer.io", input: {filters: [{name: "userId", value:["tahay@asayer.io"]}] } },
          { description: "Sessions where the user visited the signup page", input: { filters: [{name: "LOCATION", properties: [{name:"path",value: ["signup"], operator:"contains"}]}] } },
          { description: "Sessions where the user clicked on subscribe", input: { filters: [{name: "CLICK", properties: [{name:"label",value: ["subscribe"], operator:"is"}]}] } },
          { description: "Sessions longer than 20s", input: { filters: [{name: "duration", value: [20]}] } },
          { description: "Sessions shorter than 20s", input: { filters: [{name: "duration", value: [0,20]}] } },
          { description: "Sessions with failed requests to /api/users", input: { filters: [{name: "REQUEST", properties: [{name:"path",value: ["/api/users"], operator:"is"}, {name:"status",value: [400], operator:">"}]}] } },
          { description: "Sessions with metadata plan is free", input: { filters: [{name: "metadata_1", value:["free"], operator:"is"}]  }},
        ],
      },
    },
    async (args: any) => {
      console.error("[SERVER] view_recent_sessions tool CALLED!");
      console.error("[SERVER] Arguments:", JSON.stringify(args, null, 2));

      try {
        let siteId = args.siteId;

        // If projectName is provided, resolve it to projectId
        if (args.projectName && !siteId) {
          const resolvedId = getProjectIdByName(args.projectName);
          if (!resolvedId) {
            throw new Error(
              `Project "${args.projectName}" not found. Please call list_projects first to load available projects.`
            );
          }
          siteId = resolvedId;
        }

        const limit = Math.min(args.limit || 10, 50); // Cap at 50

        // Resolve filters if provided
        let resolvedFilters: any[] = [];
        if (args.filters?.length) {
          resolvedFilters = await resolveFilters(siteId, args.filters);
        }

        const sessions = await fetchRecentSessions(siteId, limit, resolvedFilters);

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
      description:
        "PREFERRED tool for showing session analytics charts. Use this when the user asks to see charts, graphs, " +
        "numbers, trends, or analytics about sessions over time. Examples: 'show me sessions chart for last week', " +
        "'how many sessions today', 'show me the trend for past 3 days'. " +
        "You MUST convert the user's time references into actual ISO date strings for startDate and endDate. " +
        "For example, if today is 2025-02-18 and the user says 'last week', use startDate='2025-02-10' and endDate='2025-02-18'. " +
        "Supports filtering by user attributes. Call get_available_filters to see available filters. " +
        "TIP: Combine multiple data tools for comprehensive analysis. Use view_recent_sessions with the same filters to drill into sessions related to any chart data.",
      inputSchema: {
        startDate: z.string().describe("Start date as ISO 8601 string (e.g. '2025-02-10' or '2025-02-10T00:00:00'). Convert relative time references to actual dates."),
        endDate: z.string().describe("End date as ISO 8601 string. If the user says 'until now' or doesn't specify, use today's date."),
        siteId: z.string().optional().describe("Site ID (project ID). If not provided, will use projectName."),
        projectName: z.string().optional().describe("Project name to look up. Will be resolved to project ID automatically."),
        filters: z.array(FilterItemSchema).optional().describe("Filters to apply. Use get_available_filters to discover valid filter names."),
      },
      _meta: {
        ui: {
          resourceUri,
          visibility: ["model"],
          csp: {
            connectDomains: ["foss.openreplay.com", "*.openreplay.com"],
          },
        },
        examples: [
          { description: "Show me sessions chart for last week", input: { startDate: "2026-04-03", endDate: "2026-04-11", projectName: "MyApp" } },
          { description: "How many sessions today on chrome or edge today", input: { startDate: "2026-04-10", endDate: "2026-04-11", projectName: "MyApp", filters:[{name: "userBrowser", value:["chrome","edge"], operator: "is"}] } },
          { description: "Session trend for the past 30 days from France", input: { startDate: "2026-03-11", endDate: "2026-04-10", projectName: "MyApp", filters:[{name: "userCountry", value:["France"], operator: "is"}] } },
          { description: "Chart of sessions from mobile users this month", input: { startDate: "2026-03-10", endDate: "2026-04-10", projectName: "MyApp", filters: [{ name: "userDevice", value: ["mobile"], operator: "is" }] } },
          { description: "Timeseries of people who visited signup page last week", input: { startDate: "2026-04-03", endDate: "2026-04-10", siteId: "1", filters: [{ name: "LOCATION", properties:[{name:"path", value: ["signup"], operator: "contains"}]}] } },
        ],
      },
    },
    async (args: any) => {
      console.error("[SERVER] view_chart tool CALLED!");
      console.error("[SERVER] Arguments:", JSON.stringify(args, null, 2));

      try {
        const parsed = ViewSessionsChartSchema.parse(args);

        let siteId = parsed.siteId;

        // If projectName is provided, resolve it to projectId
        if (parsed.projectName && !siteId) {
          const resolvedId = getProjectIdByName(parsed.projectName);
          if (!resolvedId) {
            if (state.projects.length === 0) {
              await fetchProjects();
              const retryResolvedId = getProjectIdByName(parsed.projectName);
              if (retryResolvedId) {
                siteId = retryResolvedId;
              }
            }
            if (!siteId) {
              const availableProjects = state.projects.map(p => p.name).join(", ");
              throw new Error(
                `Project "${parsed.projectName}" not found. Available projects: ${availableProjects}`
              );
            }
          } else {
            siteId = resolvedId;
          }
        }

        if (!siteId) {
          throw new Error("Either siteId or projectName must be provided");
        }

        // Parse dates to timestamps
        const startTs = new Date(parsed.startDate).getTime();
        const endTs = new Date(parsed.endDate).getTime();

        if (isNaN(startTs) || isNaN(endTs)) {
          throw new Error(`Invalid date format. startDate="${parsed.startDate}", endDate="${parsed.endDate}". Use ISO 8601 format like "2025-02-10".`);
        }

        if (startTs >= endTs) {
          throw new Error("startDate must be before endDate");
        }

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

        // Resolve filters if provided
        let resolvedFilters: any[] = [];
        if (parsed.filters?.length) {
          resolvedFilters = await resolveFilters(siteId, parsed.filters);
        }

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
      inputSchema: {
        startDate: z.string().describe("Start date as ISO 8601 string. Convert relative time references to actual dates."),
        endDate: z.string().describe("End date as ISO 8601 string. Use today's date if not specified."),
        siteId: z.string().optional().describe("Site ID (project ID). If not provided, will use projectName."),
        projectName: z.string().optional().describe("Project name to look up."),
        startPoint: z.string().optional().describe("URL path to start the journey from (e.g. '/pricing', '/articles/first'). Leave empty for general overview of most popular paths."),
        filters: z.array(FilterItemSchema).optional().describe("Filters to apply. Use get_available_filters to discover valid filter names."),
      },
      _meta: {
        ui: {
          resourceUri,
          visibility: ["model"],
          csp: {
            connectDomains: ["foss.openreplay.com", "*.openreplay.com"],
          },
        },
      },
    },
    async (args: any) => {
      console.error("[SERVER] view_user_journey tool CALLED!");
      console.error("[SERVER] Arguments:", JSON.stringify(args, null, 2));

      try {
        const parsed = ViewUserJourneySchema.parse(args);

        let siteId = parsed.siteId;

        if (parsed.projectName && !siteId) {
          const resolvedId = getProjectIdByName(parsed.projectName);
          if (!resolvedId) {
            if (state.projects.length === 0) {
              await fetchProjects();
              const retryResolvedId = getProjectIdByName(parsed.projectName);
              if (retryResolvedId) {
                siteId = retryResolvedId;
              }
            }
            if (!siteId) {
              const availableProjects = state.projects.map(p => p.name).join(", ");
              throw new Error(
                `Project "${parsed.projectName}" not found. Available projects: ${availableProjects}`
              );
            }
          } else {
            siteId = resolvedId;
          }
        }

        if (!siteId) {
          throw new Error("Either siteId or projectName must be provided");
        }

        const startTs = new Date(parsed.startDate).getTime();
        const endTs = new Date(parsed.endDate).getTime();

        if (isNaN(startTs) || isNaN(endTs)) {
          throw new Error(`Invalid date format. startDate="${parsed.startDate}", endDate="${parsed.endDate}". Use ISO 8601 format.`);
        }

        // Resolve filters if provided
        let resolvedFilters: any[] = [];
        if (parsed.filters?.length) {
          resolvedFilters = await resolveFilters(siteId, parsed.filters);
        }

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
      description:
        "PREFERRED tool for showing Web Vitals performance metrics. Displays 6 core metrics: " +
        "DOM Complete, TTFB (Time to First Byte), Speed Index, FCP (First Contentful Paint), " +
        "LCP (Largest Contentful Paint), CLS (Cumulative Layout Shift). " +
        "Use this when the user asks about performance, page speed, web vitals, loading times, " +
        "core web vitals, or site performance. Shows median (P50) values with good/medium/bad status. " +
        "You MUST convert time references to ISO date strings. " +
        "Supports filtering by user attributes. " +
        "TIP: Combine with view_chart for trends, view_table_chart for breakdowns, or view_funnel for conversion analysis. Use view_recent_sessions with the same filters to drill into related sessions.",
      inputSchema: {
        startDate: z.string().describe("Start date as ISO 8601 string. Convert relative time references to actual dates."),
        endDate: z.string().describe("End date as ISO 8601 string. Use today's date if not specified."),
        siteId: z.string().optional().describe("Site ID (project ID). If not provided, will use projectName."),
        projectName: z.string().optional().describe("Project name to look up."),
        filters: z.array(FilterItemSchema).optional().describe("Filters to apply. Use get_available_filters to discover valid filter names."),
      },
      _meta: {
        ui: {
          resourceUri,
          visibility: ["model"],
          csp: {
            connectDomains: ["foss.openreplay.com", "*.openreplay.com"],
          },
        },
        examples: [
          { description: "Show me web vitals for this week", input: { startDate: "2026-04-03", endDate: "2026-04-10", projectName: "MyApp" } },
          { description: "How is my site performance past month", input: { startDate: "2026-03-10", endDate: "2026-04-10", projectName: "MyApp" } },
          { description: "Core web vitals for mobile users", input: { startDate: "2026-04-01", endDate: "2026-04-10", projectName: "MyApp", filters: [{ name: "userDevice", value: ["mobile"], operator: "is" }] } },
          { description: "Web vitals for Safari users in Germany or France last 30 days", input: { startDate: "2026-03-11", endDate: "2026-04-10", siteId: "1", filters: [{ name: "userBrowser", value: ["Safari"], operator: "is" }, { name: "userCountry", value: ["Germany","France"], operator: "is" }] } },
          { description: "Performance metrics for Chrome on Windows of the user tahay@asyer.io", input: { startDate: "2026-04-01", endDate: "2026-04-10", projectName: "MyApp", filters: [{ name: "userBrowser", value: ["Chrome"], operator: "is" }, { name: "userOs", value: ["Windows"], operator: "is" }, { name: "userId", value: ["tahay@asayer.io"], operator: "is" }] } },
        ],
      },
    },
    async (args: any) => {
      console.error("[SERVER] view_web_vitals tool CALLED!");
      console.error("[SERVER] Arguments:", JSON.stringify(args, null, 2));

      try {
        const parsed = ViewWebVitalsSchema.parse(args);

        let siteId = parsed.siteId;

        if (parsed.projectName && !siteId) {
          const resolvedId = getProjectIdByName(parsed.projectName);
          if (!resolvedId) {
            if (state.projects.length === 0) {
              await fetchProjects();
              const retryResolvedId = getProjectIdByName(parsed.projectName);
              if (retryResolvedId) {
                siteId = retryResolvedId;
              }
            }
            if (!siteId) {
              const availableProjects = state.projects.map(p => p.name).join(", ");
              throw new Error(
                `Project "${parsed.projectName}" not found. Available projects: ${availableProjects}`
              );
            }
          } else {
            siteId = resolvedId;
          }
        }

        if (!siteId) {
          throw new Error("Either siteId or projectName must be provided");
        }

        const startTs = new Date(parsed.startDate).getTime();
        const endTs = new Date(parsed.endDate).getTime();

        if (isNaN(startTs) || isNaN(endTs)) {
          throw new Error(`Invalid date format. startDate="${parsed.startDate}", endDate="${parsed.endDate}". Use ISO 8601 format.`);
        }

        // Resolve filters if provided
        let resolvedFilters: any[] = [];
        if (parsed.filters?.length) {
          resolvedFilters = await resolveFilters(siteId, parsed.filters);
        }

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
      inputSchema: {
        startDate: z.string().describe("Start date as ISO 8601 string. Convert relative time references to actual dates."),
        endDate: z.string().describe("End date as ISO 8601 string. Use today's date if not specified."),
        metricOf: z.string().describe("What to rank/count. Values: 'LOCATION' (top pages), 'REQUEST' (top network requests), 'userBrowser' (top browsers), 'userCountry' (top countries), 'userOs' (top OS), 'userDevice' (top devices)."),
        siteId: z.string().optional().describe("Site ID (project ID). If not provided, will use projectName."),
        projectName: z.string().optional().describe("Project name to look up."),
        limit: z.number().optional().default(20).describe("Max items to return (default 20)."),
        filters: z.array(FilterItemSchema).optional().describe("Filters to apply. Use get_available_filters to discover valid filter names."),
      },
      _meta: {
        ui: {
          resourceUri,
          visibility: ["model"],
          csp: {
            connectDomains: ["foss.openreplay.com", "*.openreplay.com"],
          },
        },
        examples: [
          { description: "What are the top visited pages this week", input: { startDate: "2026-04-07", endDate: "2026-04-10", metricOf: "LOCATION", projectName: "MyApp" } },
          { description: "Show browser distribution this month", input: { startDate: "2026-04-01", endDate: "2026-04-10", metricOf: "userBrowser", projectName: "MyApp" } },
          { description: "Most popular countries last 30 days", input: { startDate: "2026-03-11", endDate: "2026-04-10", metricOf: "userCountry", projectName: "MyApp" } },
          { description: "Top 5 network requests today", input: { startDate: "2026-04-10", endDate: "2026-04-10", metricOf: "REQUEST", projectName: "MyApp", limit: 5 } },
          { description: "Top OS for mobile users", input: { startDate: "2026-04-01", endDate: "2026-04-10", metricOf: "userOs", projectName: "MyApp", filters: [{ name: "userDevice", value: ["mobile"], operator: "is" }] } },
          { description: "Device breakdown for Chrome users in the US", input: { startDate: "2026-04-01", endDate: "2026-04-10", metricOf: "userDevice", siteId: "1", filters: [{ name: "userBrowser", value: ["Chrome"], operator: "is" }, { name: "userCountry", value: ["United States"], operator: "is" }] } },
        ],
      },
    },
    async (args: any) => {
      console.error("[SERVER] view_table_chart tool CALLED!");
      console.error("[SERVER] Arguments:", JSON.stringify(args, null, 2));

      try {
        const parsed = ViewTableChartSchema.parse(args);

        let siteId = parsed.siteId;

        if (parsed.projectName && !siteId) {
          const resolvedId = getProjectIdByName(parsed.projectName);
          if (!resolvedId) {
            if (state.projects.length === 0) {
              await fetchProjects();
              const retryResolvedId = getProjectIdByName(parsed.projectName);
              if (retryResolvedId) {
                siteId = retryResolvedId;
              }
            }
            if (!siteId) {
              const availableProjects = state.projects.map(p => p.name).join(", ");
              throw new Error(
                `Project "${parsed.projectName}" not found. Available projects: ${availableProjects}`
              );
            }
          } else {
            siteId = resolvedId;
          }
        }

        if (!siteId) {
          throw new Error("Either siteId or projectName must be provided");
        }

        const startTs = new Date(parsed.startDate).getTime();
        const endTs = new Date(parsed.endDate).getTime();

        if (isNaN(startTs) || isNaN(endTs)) {
          throw new Error(`Invalid date format. startDate="${parsed.startDate}", endDate="${parsed.endDate}". Use ISO 8601 format.`);
        }

        // Resolve filters if provided
        let resolvedFilters: any[] = [];
        if (parsed.filters?.length) {
          resolvedFilters = await resolveFilters(siteId, parsed.filters);
        }

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
      description:
        "PREFERRED tool for showing step-by-step conversion funnels. " +
        "Use this when the user asks about conversion rates, drop-off between pages, " +
        "funnel analysis, or how many users complete a multi-step flow. Examples: " +
        "'show me the checkout funnel', 'what is the conversion from /pricing to /signup', " +
        "'how many users complete the onboarding flow'. " +
        "Provide an ordered list of URL paths as 'steps' (minimum 2). " +
        "You MUST convert time references to ISO date strings. " +
        "Supports filtering by user attributes. " +
        "TIP: Combine with view_user_journey to see where users actually go instead. " +
        "Use view_recent_sessions with the same filters to drill into related sessions.",
      inputSchema: {
        startDate: z.string().describe("Start date as ISO 8601 string. Convert relative time references to actual dates."),
        endDate: z.string().describe("End date as ISO 8601 string. Use today's date if not specified."),
        steps: z.array(z.string()).min(2).describe(
          "Ordered list of URL paths defining the funnel, e.g. ['/pricing', '/checkout', '/confirm']. Minimum 2 steps."
        ),
        siteId: z.string().optional().describe("Site ID (project ID). If not provided, will use projectName."),
        projectName: z.string().optional().describe("Project name to look up."),
        filters: z.array(FilterItemSchema).optional().describe("Filters to apply. Use get_available_filters to discover valid filter names."),
      },
      _meta: {
        ui: {
          resourceUri,
          visibility: ["model"],
          csp: {
            connectDomains: ["foss.openreplay.com", "*.openreplay.com"],
          },
        },
      },
    },
    async (args: any) => {
      console.error("[SERVER] view_funnel tool CALLED!");
      console.error("[SERVER] Arguments:", JSON.stringify(args, null, 2));

      try {
        const parsed = ViewFunnelSchema.parse(args);

        let siteId = parsed.siteId;

        if (parsed.projectName && !siteId) {
          const resolvedId = getProjectIdByName(parsed.projectName);
          if (!resolvedId) {
            if (state.projects.length === 0) {
              await fetchProjects();
              const retryResolvedId = getProjectIdByName(parsed.projectName);
              if (retryResolvedId) siteId = retryResolvedId;
            }
            if (!siteId) {
              const availableProjects = state.projects.map(p => p.name).join(", ");
              throw new Error(`Project "${parsed.projectName}" not found. Available projects: ${availableProjects}`);
            }
          } else {
            siteId = resolvedId;
          }
        }

        if (!siteId) {
          throw new Error("Either siteId or projectName must be provided");
        }

        const startTs = new Date(parsed.startDate).getTime();
        const endTs = new Date(parsed.endDate).getTime();

        if (isNaN(startTs) || isNaN(endTs)) {
          throw new Error(`Invalid date format. Use ISO 8601.`);
        }

        let resolvedFilters: any[] = [];
        if (parsed.filters?.length) {
          resolvedFilters = await resolveFilters(siteId, parsed.filters);
        }

        let data = await fetchFunnel(siteId, startTs, endTs, parsed.steps, resolvedFilters);

        // Unwrap new series format: { series: { "Series 1": { stages: [...] } } }
        if (data?.series && typeof data.series === "object" && !Array.isArray(data.series)) {
          const firstSeries = Object.values(data.series)[0] as any;
          if (firstSeries?.stages) {
            data = firstSeries;
          } else if (firstSeries?.$overall?.stages) {
            data = firstSeries.$overall;
          }
        }

        // Build textual summary from stages
        const stages = data?.stages || [];
        const firstCount = stages[0]?.count || 0;
        const summaryLines = stages.map((stage: any, i: number) => {
          const label = stage.value?.[0] || parsed.steps[i] || `Step ${i + 1}`;
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
      description:
        "View a session replay with full DOM reconstruction. " +
        "Provide a sessionId from a previous session list or search. " +
        "Use this when the user wants to watch or replay a specific session. " +
        "The user may refer to a session by its position in a previously fetched list. " +
        "After showing the replay, try to provide session analysis based on data you have and" +
        " let the user know they can also open this session directly in the full OpenReplay UI in their browser via a direct link.",
      inputSchema: {
        sessionId: z.string().describe("Session ID to replay. Pick from earlier results if user refers by position."),
        siteId: z.string().optional().describe("Site ID (project ID). Use the siteId from earlier session list."),
        projectName: z.string().optional().describe("Project name to look up."),
      },
      _meta: {
        ui: {
          resourceUri,
          visibility: ["model"],
        },
      },
    },
    async (args: any) => {
      console.error("[SERVER] view_session_replay tool CALLED!");
      console.error("[SERVER] Arguments:", JSON.stringify(args, null, 2));

      try {
        const parsed = ViewSessionReplaySchema.parse(args);

        if (!state.jwt) {
          return {
            content: [{ type: "text", text: JSON.stringify({ type: "error", error: "Not authenticated", isAuthError: true }) }],
            isError: true,
          };
        }

        let siteId = parsed.siteId;

        // Resolve project name to ID if needed
        if (parsed.projectName && !siteId) {
          if (state.projects.length === 0) {
            await fetchProjects();
          }
          const resolvedId = getProjectIdByName(parsed.projectName);
          if (!resolvedId) {
            return {
              content: [{ type: "text", text: JSON.stringify({ type: "error", error: `Project "${parsed.projectName}" not found` }) }],
              isError: true,
            };
          }
          siteId = resolvedId;
        }

        if (!siteId) {
          return {
            content: [{ type: "text", text: JSON.stringify({ type: "error", error: "Either siteId or projectName must be provided" }) }],
            isError: true,
          };
        }

        // Fetch session replay metadata
        console.error(`[SERVER] Fetching replay metadata for session ${parsed.sessionId}...`);
        const replay = await fetchSessionReplay(siteId, parsed.sessionId);

        // Determine mob file URLs
        const isMobile = replay.platform?.includes('ios') || replay.platform?.includes('android');
        const fileUrls: string[] = isMobile
          ? (replay.videoURL || [])
          : (replay.domURL || []);

        if (!fileUrls.length) {
          return {
            content: [{ type: "text", text: JSON.stringify({ type: "error", error: "No recording files found for this session" }) }],
            isError: true,
          };
        }

        console.error(`[SERVER] Found ${fileUrls.length} mob file(s), platform: ${replay.platform || 'web'}`);

        // Return metadata + mob file URLs — the UI will fetch and parse them directly
        const result = {
          type: "session_replay",
          sessionId: parsed.sessionId,
          siteId,
          duration: replay.duration,
          startTs: replay.startTs,
          fileUrls,
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
  server.registerTool(
    "_refresh_replay_urls",
    {
      description: "Re-fetch signed mob file URLs for a session replay (internal use by UI only)",
      inputSchema: {
        sessionId: z.string().describe("Session ID"),
        siteId: z.string().optional().describe("Site ID"),
      },
    },
    async (args: any) => {
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
        const isMobile = replay.platform?.includes('ios') || replay.platform?.includes('android');
        const fileUrls: string[] = isMobile
          ? (replay.videoURL || [])
          : (replay.domURL || []);
        if (!fileUrls.length) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "No recording files found" }) }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify({ fileUrls, startTs: replay.startTs, duration: replay.duration }) }],
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
  server.registerTool(
    "_fetch_mob_file",
    {
      description: "Fetch a mob file by URL and return base64 (internal use by UI only)",
      inputSchema: {
        url: z.string().describe("Mob file URL"),
      },
    },
    async (args: any) => {
      const url = args.url as string;
      console.error(`[SERVER] _fetch_mob_file: fetching ${url.slice(0, 80)}...`);
      try {
        const response = await fetch(url);
        if (!response.ok) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `HTTP ${response.status}` }) }],
            isError: true,
          };
        }
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        console.error(`[SERVER] _fetch_mob_file: fetched ${Math.floor(buffer.byteLength / 1024)}kb`);
        return {
          content: [{ type: "text", text: base64 }],
        };
      } catch (err: any) {
        console.error(`[SERVER] _fetch_mob_file error:`, err);
        return {
          content: [{ type: "text", text: JSON.stringify({ error: err.message }) }],
          isError: true,
        };
      }
    }
  );

  // Configure backend
  console.error("[SERVER] Registering configure_backend tool...");
  server.registerTool(
    "configure_backend",
    {
      description: "Configure the OpenReplay backend URL (for self-hosted instances)",
      inputSchema: {
        backendUrl: z.string().describe("OpenReplay backend API URL"),
      },
    },
    async (args) => {
      console.error("[SERVER] configure_backend called:", args);
      const parsed = ConfigureBackendSchema.parse(args);
      state.backendUrl = parsed.backendUrl;
      return {
        content: [
          {
            type: "text",
            text: `Backend URL configured: ${state.backendUrl}`,
          },
        ],
      };
    }
  );
  console.error("[SERVER] configure_backend tool registered");

  // Login with email/password
  console.error("[SERVER] Registering login tool...");
  server.registerTool(
    "login_email_password",
    {
      description: "Authenticate with OpenReplay using email and password. Only use this if the user explicitly provides email and password. Otherwise prefer login_browser.",
      inputSchema: {
        email: z.string().describe("Email address"),
        password: z.string().describe("Password"),
      },
    },
    async (args) => {
      const parsed = LoginSchema.parse(args);
      console.error("[SERVER] login called:", parsed.email);
      const response = await makeApiRequest("/api/v1/login", {
        method: "POST",
        body: JSON.stringify({
          email: parsed.email,
          password: parsed.password,
        }),
      });

      state.jwt = response.jwt || response.data?.jwt;
      state.userData = response.data || response;

      return {
        content: [
          {
            type: "text",
            text: `Successfully logged in as ${parsed.email}`,
          },
        ],
      };
    }
  );
  console.error("[SERVER] login_email_password tool registered");

  // Login via browser (OAuth-style)
  console.error("[SERVER] Registering login_browser tool...");
  server.registerTool(
    "login_browser",
    {
      description:
        "PREFERRED login method. Authenticate by opening a URL in the user's browser. " +
        "Always use this tool when the user needs to log in, unless they explicitly ask for email/password login. " +
        "Opens a browser tab for the user to approve access, then waits for approval (up to 5 minutes).",
      inputSchema: {
        backendUrl: z.string().optional().describe("OpenReplay backend URL (optional, uses current if already configured)"),
        frontendUrl: z.string().optional().describe("OpenReplay URL (optional, uses current if already configured)"),
      },
    },
    async (args) => {
      const parsed = LoginBrowserSchema.parse(args);
      const backendUrl = parsed.backendUrl || state.backendUrl;
      const frontendUrl = parsed.frontendUrl || state.frontendUrl;

      if (parsed.backendUrl) {
        state.backendUrl = parsed.backendUrl;
      }

      if (parsed.frontendUrl) {
        state.frontendUrl = parsed.frontendUrl;
      }

      const authCode = generateAuthCode();
      const authorizeUrl = `${frontendUrl}/mcp/authorize?state=${authCode}&client_id=${state.clientId}&app_name=${encodeURIComponent("OpenReplay MCP")}`;

      console.error(`[SERVER] login_browser: opening browser at ${authorizeUrl}`);

      // Send the URL as a log notification so the model can show it immediately
      server.server.sendLoggingMessage({
        level: "info",
        data: `Browser login started. If the browser didn't open automatically, visit this URL:\n${authorizeUrl}`,
      });

      // Open the URL in the user's default browser
      const openCmd = process.platform === "darwin"
        ? "open"
        : process.platform === "win32"
          ? "start"
          : "xdg-open";
      exec(`${openCmd} "${authorizeUrl}"`);

      // Poll until the user approves or the request expires
      const jwt = await pollForAuth(backendUrl, authCode, state.clientId!);

      if (!jwt) {
        // Generate a fresh auth code so the user can try manually
        const retryAuthCode = generateAuthCode();
        const retryUrl = `${frontendUrl}/mcp/authorize?state=${retryAuthCode}&client_id=${state.clientId}&app_name=${encodeURIComponent("OpenReplay MCP")}`;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                type: "error",
                error: "Browser login timed out or was denied. You can try again by opening this URL manually:",
                authorizeUrl: retryUrl,
              }),
            },
          ],
          isError: true,
        };
      }

      state.jwt = jwt;
      state.userData = { authenticated: true };
      await savePersistedState();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              type: "auth_success",
              message: "Successfully authenticated via browser.",
              authorizeUrl,
            }),
          },
        ],
      };
    }
  );
  console.error("[SERVER] login_browser tool registered");

  // Fetch chart data
  console.error("[SERVER] Registering fetch_chart_data tool...");
  server.registerTool(
    "fetch_chart_data",
    {
      description: "Fetch chart data from OpenReplay API",
      inputSchema: {
        endpoint: z.string().describe("API endpoint to fetch chart data from"),
        params: z.looseRecord(z.string(), z.any()).optional().describe("Query parameters"),
        siteId: z.string().optional().describe("Site ID (project ID)"),
      },
    },
    async (args) => {
      console.error("[SERVER] fetch_chart_data called:", args);
      const parsed = FetchChartDataSchema.parse(args);

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

  // Get session replay URL
  console.error("[SERVER] Registering get_session_replay tool...");
  server.registerTool(
    "get_session_replay",
    {
      description: "Get session replay URL",
      inputSchema: {
        sessionId: z.string().describe("Session ID to get replay URL for"),
        siteId: z.string().optional().describe("Site ID (project ID)"),
      },
    },
    async (args) => {
      console.error("[SERVER] get_session_replay called:", args);
      const parsed = GetSessionReplaySchema.parse(args);

      const baseUrl = state.backendUrl.replace("/api", "").replace("//api.", "//app.");
      const replayUrl = `${baseUrl}/session/${parsed.sessionId}`;

      return {
        content: [
          {
            type: "text",
            text: replayUrl,
          },
        ],
      };
    }
  );
  console.error("[SERVER] get_session_replay tool registered");

  // Get auth status
  console.error("[SERVER] Registering get_auth_status tool...");
  server.registerTool(
    "get_auth_status",
    {
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
              backendUrl: state.backendUrl,
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
      description: "Clear authentication and remove persisted token",
    },
    async () => {
      console.error("[SERVER] logout called");
      state.jwt = null;
      state.userData = null;

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

  // Get project ID by name
  console.error("[SERVER] Registering get_project_id tool...");
  server.registerTool(
    "get_project_id",
    {
      description: "Get the project ID for a given project name. Must call list_projects first to populate the project cache.",
      inputSchema: {
        projectName: z.string().describe("Project name to look up"),
      },
    },
    async (args) => {
      console.error("[SERVER] get_project_id called:", args);
      const parsed = GetProjectIdSchema.parse(args);

      if (state.projects.length === 0) {
        throw new Error("No projects loaded. Please call list_projects first.");
      }

      const projectId = getProjectIdByName(parsed.projectName);

      if (!projectId) {
        const availableProjects = state.projects.map(p => p.name).join(", ");
        throw new Error(
          `Project "${parsed.projectName}" not found. Available projects: ${availableProjects}`
        );
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              projectName: parsed.projectName,
              projectId,
            }, null, 2),
          },
        ],
      };
    }
  );
  console.error("[SERVER] get_project_id tool registered");

  // Fetch sessions by project name (internal tool - returns JSON data without UI)
  console.error("[SERVER] Registering fetch_sessions tool...");
  server.registerTool(
    "fetch_sessions",
    {
      description: "Internal tool: fetch sessions as raw JSON without UI. Only use this when you specifically need raw session data for processing, analysis, getting more data, or when the user explicitly asks for JSON output. " +
        "For normal session listing that you need to present to user, ALWAYS prefer view_recent_sessions instead which shows a rich interactive UI. " +
        "This tool automatically resolves project names to IDs. Supports filtering by user attributes.",
      inputSchema: {
        projectName: z.string().optional().describe("Project name to look up sessions for"),
        siteId: z.string().optional().describe("Site ID (project ID) - use this if you already know the ID"),
        limit: z.number().optional().default(10).describe("Number of sessions to fetch (default 10, max 50)"),
        filters: z.array(FilterItemSchema).optional().describe("Filters to apply. Use get_available_filters to discover valid filter names."),
      },
      _meta: {
        examples: [
          { description: "Fetch 20 sessions for project MyApp", input: { projectName: "MyApp", limit: 20 } },
          { description: "Get sessions from Chrome users in France or Tunisia", input: { siteId: "1", filters: [{ name: "userBrowser", value: ["Chrome"], operator: "is" }, { name: "userCountry", value: ["France", "Tunisia"], operator: "is" }] } },
          { description: "Fetch sessions with JS errors", input: { projectName: "MyApp", filters: [{ name: "issueType", value: ["js_exception"], operator: "is" }] } },
          { description: "Get sessions of a specific user", input: { filters: [{ name: "userId", value: ["tahay@asayer.io"] }] } },
          { description: "Sessions where user visited the signup page", input: { filters: [{ name: "LOCATION", properties: [{ name: "path", value: ["signup"], operator: "contains" }] }] } },
          { description: "Sessions where user clicked on subscribe", input: { filters: [{ name: "CLICK", properties: [{ name: "label", value: ["subscribe"], operator: "is" }] }] } },
          { description: "Sessions longer than 20s", input: { filters: [{ name: "duration", value: [20] }] } },
          { description: "Sessions shorter than 20s", input: { filters: [{ name: "duration", value: [0, 20] }] } },
          { description: "Sessions with failed requests to /api/users", input: { filters: [{ name: "REQUEST", properties: [{ name: "path", value: ["/api/users"], operator: "is" }, { name: "status", value: [400], operator: ">" }] }] } },
            { description: "Sessions with metadata plan is free ", input: { filters: [{name: "metadata_1", value:["free"], operator:"is"}]  }},
        ],
      },
    },
    async (args) => {
      console.error("[SERVER] fetch_sessions called:", args);

      if (!state.jwt) {
        throw new Error("Not authenticated. Please login first.");
      }

      let siteId = args.siteId;

      // If projectName is provided, resolve it to projectId
      if (args.projectName && !siteId) {
        const resolvedId = getProjectIdByName(args.projectName);
        if (!resolvedId) {
          // Try to fetch projects if not loaded
          if (state.projects.length === 0) {
            await fetchProjects();
            const retryResolvedId = getProjectIdByName(args.projectName);
            if (retryResolvedId) {
              siteId = retryResolvedId;
            }
          }
          if (!siteId) {
            const availableProjects = state.projects.map(p => p.name).join(", ");
            throw new Error(
              `Project "${args.projectName}" not found. Available projects: ${availableProjects}`
            );
          }
        } else {
          siteId = resolvedId;
        }
      }

      if (!siteId) {
        throw new Error("Either projectName or siteId must be provided");
      }

      const limit = Math.min(args.limit || 10, 50);

      // Resolve filters if provided
      let resolvedFilters: any[] = [];
      if (args.filters?.length) {
        resolvedFilters = await resolveFilters(siteId, args.filters);
      }

      const sessions = await fetchRecentSessions(siteId, limit, resolvedFilters);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              projectId: siteId,
              projectName: args.projectName,
              count: sessions.length,
              sessions: sessions.map((s: any) => ({
                sessionId: s.sessionId,
                userId: s.userId,
                userAnonymousId: s.userAnonymousId,
                startTs: s.startTs,
                duration: s.duration,
                eventsCount: s.eventsCount,
                errorsCount: s.errorsCount,
                replayUrl: s.replayUrl,
              })),
            }, null, 2),
          },
        ],
      };
    }
  );
  console.error("[SERVER] fetch_sessions tool registered");

  // Get detailed session information (replay metadata + events)
  console.error("[SERVER] Registering get_session_details tool...");
  server.registerTool(
    "get_session_details",
    {
      description:
        "Get detailed information about a specific session including metadata and events. " +
        "Fetches both session replay metadata (user info, device, location, timing) and session events " +
        "(errors, clicks, page visits, custom events, issues). " +
        "Use this after fetch_sessions or view_recent_sessions to investigate a particular session. " +
        "The user may refer to a session by its position in a previously fetched list " +
        "(e.g. 'tell me about the second session', 'details on the last one') — " +
        "in that case, pick the corresponding sessionId and siteId from the earlier results in context. " +
        "The user may also provide a sessionId directly. " +
        "Returns structured data with a summary section first, followed by full replay metadata and events breakdown.",
      inputSchema: {
        sessionId: z.string().describe("Session ID to get details for. Pick from earlier fetch_sessions/view_recent_sessions results if user refers to a session by position."),
        siteId: z.string().optional().describe("Site ID (project ID). Use the siteId from the earlier session list if available."),
        projectName: z.string().optional().describe("Project name to look up. Will be resolved to project ID automatically."),
      },
    },
    async (args) => {
      console.error("[SERVER] get_session_details called:", args);
      const parsed = GetSessionDetailsSchema.parse(args);

      if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
      }

      let siteId = parsed.siteId;

      // If projectName is provided, resolve it to projectId
      if (parsed.projectName && !siteId) {
        const resolvedId = getProjectIdByName(parsed.projectName);
        if (!resolvedId) {
          if (state.projects.length === 0) {
            await fetchProjects();
            const retryResolvedId = getProjectIdByName(parsed.projectName);
            if (retryResolvedId) {
              siteId = retryResolvedId;
            }
          }
          if (!siteId) {
            const availableProjects = state.projects.map(p => p.name).join(", ");
            throw new Error(
              `Project "${parsed.projectName}" not found. Available projects: ${availableProjects}`
            );
          }
        } else {
          siteId = resolvedId;
        }
      }

      if (!siteId) {
        throw new Error("Either siteId or projectName must be provided");
      }

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

      // Construct replay URL
      const baseUrl = state.backendUrl.replace("/api", "").replace("//api.", "//app.");
      const replayUrl = `${baseUrl}/${siteId}/session/${parsed.sessionId}?jwt=${encodeURIComponent(state.jwt!)}`;

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
      description:
        "Get the list of available filters for a project. Call this before applying filters to data tools " +
        "(view_recent_sessions, view_chart, view_user_journey, fetch_sessions) to discover valid filter names " +
        "and their possible values. Returns filter names, display names, data types, and sample values.",
      inputSchema: {
        siteId: z.string().optional().describe("Site ID (project ID)."),
        projectName: z.string().optional().describe("Project name to look up."),
      },
    },
    async (args) => {
      console.error("[SERVER] get_available_filters called:", args);

      if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
      }

      let siteId = args.siteId;

      if (args.projectName && !siteId) {
        const resolvedId = getProjectIdByName(args.projectName);
        if (!resolvedId) {
          if (state.projects.length === 0) {
            await fetchProjects();
            const retryResolvedId = getProjectIdByName(args.projectName);
            if (retryResolvedId) {
              siteId = retryResolvedId;
            }
          }
          if (!siteId) {
            const availableProjects = state.projects.map(p => p.name).join(", ");
            throw new Error(
              `Project "${args.projectName}" not found. Available projects: ${availableProjects}`
            );
          }
        } else {
          siteId = resolvedId;
        }
      }

      if (!siteId) {
        throw new Error("Either siteId or projectName must be provided");
      }

      const filterData = await getOrFetchFilters(siteId);

      if (!filterData) {
        throw new Error("Failed to fetch filters for this project");
      }

      // Flatten into a simple list for the model
      const filterList: any[] = [];
      for (const [categoryName, category] of Object.entries(filterData) as [string, any][]) {
        if (!category?.list) continue;
        for (const filter of category.list) {
          const entry: any = {
            name: filter.name,
            displayName: filter.displayName || filter.name,
            category: category.displayName || categoryName,
            dataType: filter.dataType,
          };
          if (filter.possibleValues?.length) {
            entry.possibleValues = filter.possibleValues.slice(0, 20);
            if (filter.possibleValues.length > 20) {
              entry.totalValues = filter.possibleValues.length;
            }
          }
          filterList.push(entry);
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              siteId,
              filtersCount: filterList.length,
              filters: filterList,
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
      description:
        "Fetch recent tracked events (pageviews, clicks, custom events, errors) from the analytics data pipeline. " +
        "Returns event name, timestamp, user ID, session ID, city, OS, and whether it was auto-captured. " +
        "Use this to understand what events are being tracked, investigate specific event types, " +
        "or get a feed of recent user activity. Supports date range and pagination.",
      inputSchema: {
        siteId: z.string().optional().describe("Site ID (project ID)."),
        projectName: z.string().optional().describe("Project name to look up."),
        startDate: z.string().optional().describe("Start date as ISO 8601 string. Defaults to last 24 hours."),
        endDate: z.string().optional().describe("End date as ISO 8601 string. Defaults to now."),
        limit: z.number().optional().default(50).describe("Number of events to fetch (default 50, max 200)."),
        page: z.number().optional().default(1).describe("Page number for pagination."),
      },
    },
    async (args) => {
      console.error("[SERVER] fetch_events called:", args);

      if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
      }

      let siteId = args.siteId;
      if (args.projectName && !siteId) {
        const resolvedId = getProjectIdByName(args.projectName);
        if (!resolvedId) {
          if (state.projects.length === 0) {
            await fetchProjects();
            const retryId = getProjectIdByName(args.projectName);
            if (retryId) siteId = retryId;
          }
          if (!siteId) {
            const available = state.projects.map(p => p.name).join(", ");
            throw new Error(`Project "${args.projectName}" not found. Available: ${available}`);
          }
        } else {
          siteId = resolvedId;
        }
      }

      if (!siteId) throw new Error("Either siteId or projectName must be provided");

      const now = Date.now();
      const startTs = args.startDate ? new Date(args.startDate).getTime() : now - 24 * 60 * 60 * 1000;
      const endTs = args.endDate ? new Date(args.endDate).getTime() : now;
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
      description:
        "Fetch tracked users from the analytics data pipeline. " +
        "Returns user ID, name, email, location, last seen, and custom properties. " +
        "Use this to understand who your users are, search for specific users, " +
        "or get a list of recently active users. Supports search query and pagination.",
      inputSchema: {
        siteId: z.string().optional().describe("Site ID (project ID)."),
        projectName: z.string().optional().describe("Project name to look up."),
        startDate: z.string().optional().describe("Start date as ISO 8601 string. Defaults to last 7 days."),
        endDate: z.string().optional().describe("End date as ISO 8601 string. Defaults to now."),
        query: z.string().optional().default("").describe("Search query to filter users by name, email, or user ID."),
        limit: z.number().optional().default(50).describe("Number of users to fetch (default 50, max 200)."),
        page: z.number().optional().default(1).describe("Page number for pagination."),
      },
    },
    async (args) => {
      console.error("[SERVER] fetch_users called:", args);

      if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
      }

      let siteId = args.siteId;
      if (args.projectName && !siteId) {
        const resolvedId = getProjectIdByName(args.projectName);
        if (!resolvedId) {
          if (state.projects.length === 0) {
            await fetchProjects();
            const retryId = getProjectIdByName(args.projectName);
            if (retryId) siteId = retryId;
          }
          if (!siteId) {
            const available = state.projects.map(p => p.name).join(", ");
            throw new Error(`Project "${args.projectName}" not found. Available: ${available}`);
          }
        } else {
          siteId = resolvedId;
        }
      }

      if (!siteId) throw new Error("Either siteId or projectName must be provided");

      const now = Date.now();
      const startTs = args.startDate ? new Date(args.startDate).getTime() : now - 7 * 24 * 60 * 60 * 1000;
      const endTs = args.endDate ? new Date(args.endDate).getTime() : now;
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

  // Fetch event definitions & user properties (data management)
  console.error("[SERVER] Registering fetch_event_definitions tool...");
  server.registerTool(
    "fetch_event_definitions",
    {
      description:
        "Fetch all tracked event definitions and user attribute definitions for a project. " +
        "Returns two lists: (1) events — custom and auto-captured event types being tracked, " +
        "(2) attributes — user properties and session attributes available for filtering. " +
        "Use this to understand what data is being collected, discover available event names " +
        "for filtering, or audit the tracking setup.",
      inputSchema: {
        siteId: z.string().optional().describe("Site ID (project ID)."),
        projectName: z.string().optional().describe("Project name to look up."),
      },
    },
    async (args) => {
      console.error("[SERVER] fetch_event_definitions called:", args);

      if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
      }

      let siteId = args.siteId;
      if (args.projectName && !siteId) {
        const resolvedId = getProjectIdByName(args.projectName);
        if (!resolvedId) {
          if (state.projects.length === 0) {
            await fetchProjects();
            const retryId = getProjectIdByName(args.projectName);
            if (retryId) siteId = retryId;
          }
          if (!siteId) {
            const available = state.projects.map(p => p.name).join(", ");
            throw new Error(`Project "${args.projectName}" not found. Available: ${available}`);
          }
        } else {
          siteId = resolvedId;
        }
      }

      if (!siteId) throw new Error("Either siteId or projectName must be provided");

      const data = await fetchEventProperties(siteId);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            siteId,
            eventsCount: data.events.length,
            attributesCount: data.attributes.length,
            events: data.events.map((e: any) => ({
              name: e.name,
              displayName: e.displayName,
              isEvent: e.isEvent,
              autoCaptured: e.autoCaptured,
            })),
            attributes: data.attributes.map((a: any) => ({
              name: a.name,
              displayName: a.displayName,
              dataType: a.dataType,
            })),
          }, null, 2),
        }],
      };
    }
  );
  console.error("[SERVER] fetch_event_definitions tool registered");
}
