// server-http.ts
import http from "node:http";
import crypto3 from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  createMcpHandler,
  getOAuthProtectedResourceMetadataUrl,
  requireBearerAuth
} from "@modelcontextprotocol/server";

// lib/server.ts
import { McpServer } from "@modelcontextprotocol/server";
import { registerAppResource, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import fs2 from "node:fs/promises";
import path3 from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";

// lib/version.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
function readVersion() {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(path.join(here, "..", "package.json"), "utf-8"));
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}
var APP_VERSION = readVersion();

// lib/tools.ts
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import net from "node:net";
import dns from "node:dns/promises";

// lib/state.ts
import fs from "node:fs/promises";
import path2 from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
var CONFIG_DIR = path2.join(os.homedir(), ".openreplay-mcp");
var CONFIG_FILE = path2.join(CONFIG_DIR, "config.json");
var MOB_URL_ALLOWLIST_MAX = 256;
function allowMobUrls(urls) {
  const allowed = state.mobUrls;
  for (const url of urls) {
    if (allowed.size >= MOB_URL_ALLOWLIST_MAX) {
      const oldest = allowed.values().next().value;
      if (oldest !== void 0) allowed.delete(oldest);
    }
    allowed.add(url);
  }
}
function isMobUrlAllowed(url) {
  return state.mobUrls.has(url);
}
var pollAbortController = null;
function createPollAbortController() {
  if (pollAbortController) {
    pollAbortController.abort();
  }
  pollAbortController = new AbortController();
  return pollAbortController;
}
var ENV_APP_URL_RAW = process.env.OPENREPLAY_URL || process.env.OPENREPLAY_BACKEND_URL || null;
var ENV_APP_URL = ENV_APP_URL_RAW && /^https?:\/\//.test(ENV_APP_URL_RAW) ? ENV_APP_URL_RAW : null;
var DEFAULT_URL = "https://app.openreplay.com";
function createState(init = {}) {
  return {
    clientId: null,
    appUrl: ENV_APP_URL || DEFAULT_URL,
    jwt: null,
    userData: null,
    projects: [],
    projectFilters: {},
    pendingAuthCode: null,
    mobUrls: /* @__PURE__ */ new Set(),
    ...init
  };
}
var processState = createState();
var requestState = new AsyncLocalStorage();
var state = new Proxy({}, {
  get: (_, key) => Reflect.get(requestState.getStore() ?? processState, key),
  set: (_, key, value) => Reflect.set(requestState.getStore() ?? processState, key, value)
});
function runWithState(store, fn) {
  return requestState.run(store, fn);
}
function clearInstanceCaches() {
  state.projects = [];
  state.projectFilters = {};
}
function normalizeUrl(raw) {
  try {
    return new URL(raw).href.replace(/\/+$/, "");
  } catch {
    return raw.replace(/\/+$/, "");
  }
}
async function setAppUrl(appUrl2) {
  if (normalizeUrl(appUrl2) === normalizeUrl(state.appUrl)) return false;
  console.error(`[SERVER] setAppUrl ${state.appUrl} -> ${appUrl2}`);
  state.appUrl = appUrl2;
  state.jwt = null;
  state.userData = null;
  clearInstanceCaches();
  await savePersistedState();
  return true;
}
async function savePersistedState() {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 448 });
    await fs.writeFile(
      CONFIG_FILE,
      JSON.stringify({
        clientId: state.clientId,
        jwt: state.jwt,
        appUrl: state.appUrl,
        userData: state.userData
      }, null, 2),
      { mode: 384 }
    );
    await fs.chmod(CONFIG_FILE, 384);
    console.error("[SERVER] Saved authentication to disk");
  } catch (err) {
    console.error("[SERVER] Failed to save state:", err);
  }
}
function generateAuthCode() {
  return crypto.randomBytes(32).toString("hex");
}
function assertHttpsUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }
  if (u.protocol !== "https:") {
    throw new Error(`OpenReplay URL must use https (got "${u.protocol}//" in ${raw})`);
  }
  return u.toString().replace(/\/+$/, "");
}
async function clearPersistedState() {
  try {
    await fs.unlink(CONFIG_FILE);
    console.error("[SERVER] Cleared persisted authentication");
  } catch (err) {
  }
}

// lib/countriesList.ts
var countries = {
  AC: "Ascension Island",
  AD: "Andorra",
  AE: "United Arab Emirates",
  AF: "Afghanistan",
  AG: "Antigua And Barbuda",
  AI: "Anguilla",
  AL: "Albania",
  AM: "Armenia",
  AN: "Netherlands Antilles",
  AO: "Angola",
  AQ: "Antarctica",
  AR: "Argentina",
  AS: "American Samoa",
  AT: "Austria",
  AU: "Australia",
  AW: "Aruba",
  AX: "\xC5land Islands",
  AZ: "Azerbaijan",
  BA: "Bosnia & Herzegovina",
  BB: "Barbados",
  BD: "Bangladesh",
  BE: "Belgium",
  BF: "Burkina Faso",
  BG: "Bulgaria",
  BH: "Bahrain",
  BI: "Burundi",
  BJ: "Benin",
  BL: "Saint Barth\xE9lemy",
  BM: "Bermuda",
  BN: "Brunei Darussalam",
  BO: "Bolivia",
  BQ: "Bonaire, Saint Eustatius And Saba",
  BR: "Brazil",
  BS: "Bahamas",
  BT: "Bhutan",
  BU: "Burma",
  BV: "Bouvet Island",
  BW: "Botswana",
  BY: "Belarus",
  BZ: "Belize",
  CA: "Canada",
  CC: "Cocos Islands",
  CD: "Congo",
  CF: "Central African Republic",
  CG: "Congo",
  CH: "Switzerland",
  CI: "C\xF4te d'Ivoire",
  CK: "Cook Islands",
  CL: "Chile",
  CM: "Cameroon",
  CN: "China",
  CO: "Colombia",
  CP: "Clipperton Island",
  CR: "Costa Rica",
  CS: "Serbia and Montenegro",
  CT: "Canton and Enderbury Islands",
  CU: "Cuba",
  CV: "Cabo Verde",
  CW: "Curacao",
  CX: "Christmas Island",
  CY: "Cyprus",
  CZ: "Czech Republic",
  DE: "Germany",
  DG: "Diego Garcia",
  DJ: "Djibouti",
  DK: "Denmark",
  DM: "Dominica",
  DO: "Dominican Republic",
  DY: "Dahomey",
  DZ: "Algeria",
  EA: "Ceuta, Mulilla",
  EC: "Ecuador",
  EE: "Estonia",
  EG: "Egypt",
  EH: "Western Sahara",
  ER: "Eritrea",
  ES: "Spain",
  ET: "Ethiopia",
  FI: "Finland",
  FJ: "Fiji",
  FK: "Falkland Islands",
  FM: "Micronesia",
  FO: "Faroe Islands",
  FQ: "French Southern and Antarctic Territories",
  FR: "France",
  FX: "France, Metropolitan",
  GA: "Gabon",
  GB: "United Kingdom",
  GD: "Grenada",
  GE: "Georgia",
  GF: "French Guiana",
  GG: "Guernsey",
  GH: "Ghana",
  GI: "Gibraltar",
  GL: "Greenland",
  GM: "Gambia",
  GN: "Guinea",
  GP: "Guadeloupe",
  GQ: "Equatorial Guinea",
  GR: "Greece",
  GS: "South Georgia And The South Sandwich Islands",
  GT: "Guatemala",
  GU: "Guam",
  GW: "Guinea-bissau",
  GY: "Guyana",
  HK: "Hong Kong",
  HM: "Heard Island And McDonald Islands",
  HN: "Honduras",
  HR: "Croatia",
  HT: "Haiti",
  HU: "Hungary",
  HV: "Upper Volta",
  IC: "Canary Islands",
  ID: "Indonesia",
  IE: "Ireland",
  IL: "Israel",
  IM: "Isle Of Man",
  IN: "India",
  IO: "British Indian Ocean Territory",
  IQ: "Iraq",
  IR: "Iran",
  IS: "Iceland",
  IT: "Italy",
  JE: "Jersey",
  JM: "Jamaica",
  JO: "Jordan",
  JP: "Japan",
  JT: "Johnston Island",
  KE: "Kenya",
  KG: "Kyrgyzstan",
  KH: "Cambodia",
  KI: "Kiribati",
  KM: "Comoros",
  KN: "Saint Kitts And Nevis",
  KP: "Korea",
  KR: "Korea",
  KW: "Kuwait",
  KY: "Cayman Islands",
  KZ: "Kazakhstan",
  LA: "Laos",
  LB: "Lebanon",
  LC: "Saint Lucia",
  LI: "Liechtenstein",
  LK: "Sri Lanka",
  LR: "Liberia",
  LS: "Lesotho",
  LT: "Lithuania",
  LU: "Luxembourg",
  LV: "Latvia",
  LY: "Libya",
  MA: "Morocco",
  MC: "Monaco",
  MD: "Moldova",
  ME: "Montenegro",
  MF: "Saint Martin",
  MG: "Madagascar",
  MH: "Marshall Islands",
  MI: "Midway Islands",
  MK: "Macedonia",
  ML: "Mali",
  MM: "Myanmar",
  MN: "Mongolia",
  MO: "Macao",
  MP: "Northern Mariana Islands",
  MQ: "Martinique",
  MR: "Mauritania",
  MS: "Montserrat",
  MT: "Malta",
  MU: "Mauritius",
  MV: "Maldives",
  MW: "Malawi",
  MX: "Mexico",
  MY: "Malaysia",
  MZ: "Mozambique",
  NA: "Namibia",
  NC: "New Caledonia",
  NE: "Niger",
  NF: "Norfolk Island",
  NG: "Nigeria",
  NH: "New Hebrides",
  NI: "Nicaragua",
  NL: "Netherlands",
  NO: "Norway",
  NP: "Nepal",
  NQ: "Dronning Maud Land",
  NR: "Nauru",
  NT: "Neutral Zone",
  NU: "Niue",
  NZ: "New Zealand",
  OM: "Oman",
  PA: "Panama",
  PC: "Pacific Islands",
  PE: "Peru",
  PF: "French Polynesia",
  PG: "Papua New Guinea",
  PH: "Philippines",
  PK: "Pakistan",
  PL: "Poland",
  PM: "Saint Pierre And Miquelon",
  PN: "Pitcairn",
  PR: "Puerto Rico",
  PS: "Palestine",
  PT: "Portugal",
  PU: "U.S. Miscellaneous Pacific Islands",
  PW: "Palau",
  PY: "Paraguay",
  PZ: "Panama Canal Zone",
  QA: "Qatar",
  RE: "Reunion",
  RH: "Southern Rhodesia",
  RO: "Romania",
  RS: "Serbia",
  RU: "Russian Federation",
  RW: "Rwanda",
  SA: "Saudi Arabia",
  SB: "Solomon Islands",
  SC: "Seychelles",
  SD: "Sudan",
  SE: "Sweden",
  SG: "Singapore",
  SH: "Saint Helena, Ascension And Tristan Da Cunha",
  SI: "Slovenia",
  SJ: "Svalbard And Jan Mayen",
  SK: "Slovakia",
  SL: "Sierra Leone",
  SM: "San Marino",
  SN: "Senegal",
  SO: "Somalia",
  SR: "Suriname",
  SS: "South Sudan",
  ST: "Sao Tome and Principe",
  SU: "USSR",
  SV: "El Salvador",
  SX: "Sint Maarten",
  SY: "Syrian Arab Republic",
  SZ: "Swaziland",
  TA: "Tristan de Cunha",
  TC: "Turks And Caicos Islands",
  TD: "Chad",
  TF: "French Southern Territories",
  TG: "Togo",
  TH: "Thailand",
  TJ: "Tajikistan",
  TK: "Tokelau",
  TL: "Timor-Leste",
  TM: "Turkmenistan",
  TN: "Tunisia",
  TO: "Tonga",
  TP: "East Timor",
  TR: "Turkey",
  TT: "Trinidad And Tobago",
  TV: "Tuvalu",
  TW: "Taiwan",
  TZ: "Tanzania",
  UA: "Ukraine",
  UG: "Uganda",
  UM: "United States Minor Outlying Islands",
  US: "United States",
  UY: "Uruguay",
  UZ: "Uzbekistan",
  VA: "Vatican City State",
  VC: "Saint Vincent And The Grenadines",
  VD: "VietNam",
  VE: "Venezuela",
  VG: "Virgin Islands (British)",
  VI: "Virgin Islands (US)",
  VN: "VietNam",
  VU: "Vanuatu",
  WF: "Wallis And Futuna",
  WK: "Wake Island",
  WS: "Samoa",
  XK: "Kosovo",
  YD: "Yemen",
  YE: "Yemen",
  YT: "Mayotte",
  YU: "Yugoslavia",
  ZA: "South Africa",
  ZM: "Zambia",
  ZR: "Zaire",
  ZW: "Zimbabwe"
};

// lib/countries.ts
function resolveCountryValue(input) {
  const upper = input.trim().toUpperCase();
  if (upper.length === 2 && countries[upper]) {
    return upper;
  }
  const lower = input.trim().toLowerCase();
  for (const [code, name] of Object.entries(countries)) {
    if (name.toLowerCase() === lower) {
      return code;
    }
  }
  return input;
}

// lib/api.ts
function buildApiUrl(appUrl2, endpoint) {
  if (!endpoint.startsWith("/") || endpoint.startsWith("//")) {
    throw new Error(`Invalid API endpoint "${endpoint}": must be a path starting with a single "/"`);
  }
  const trimmed = appUrl2.replace(/\/+$/, "");
  let isSaas = false;
  let host = trimmed;
  try {
    const u = new URL(trimmed);
    if (u.hostname === "app.openreplay.com") {
      isSaas = true;
      host = `${u.protocol}//api.openreplay.com`;
    }
  } catch {
  }
  let url;
  if (isSaas) {
    const path4 = endpoint.replace(/^\/v2\/api\//, "/v2/").replace(/^\/api\//, "/");
    url = `${host}${path4}`;
  } else if (endpoint.startsWith("/v2/api/") || endpoint.startsWith("/api/") || endpoint.startsWith("/v2/smart-issues/")) {
    url = `${host}${endpoint}`;
  } else {
    url = `${host}/api${endpoint}`;
  }
  if (new URL(url).host !== new URL(host).host) {
    throw new Error(`Invalid API endpoint "${endpoint}": resolves outside ${new URL(host).host}`);
  }
  return url;
}
async function makeApiRequest(endpoint, options = {}) {
  const url = buildApiUrl(state.appUrl, endpoint);
  const headers = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    ...state.jwt ? { "Authorization": `Bearer ${state.jwt}` } : {},
    ...options.headers
  };
  console.error(`[SERVER] Making API request to: ${url}`);
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const error = await response.text();
    console.error(`[SERVER] API request failed: ${response.status} ${response.statusText}`);
    if (response.status === 401 || response.status === 403) {
      throw new Error(`AUTH_ERROR: ${response.status} ${response.statusText}`);
    }
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${error}`);
  }
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("json")) {
    if (response.redirected) {
      throw new Error(`API request to ${url} was redirected to ${response.url} (${contentType || "no content type"}) \u2014 the instance sits behind a login proxy this server can't authenticate with`);
    }
    throw new Error(`API request to ${url} returned ${contentType || "no content type"} instead of JSON \u2014 the endpoint does not exist on this instance`);
  }
  return response.json();
}
async function fetchFilters(siteId) {
  console.error(`[SERVER] Fetching filters for site ${siteId}...`);
  if (!state.jwt) {
    throw new Error("AUTH_ERROR: Not authenticated");
  }
  const { data } = await makeApiRequest(`/v2/api/${siteId}/filters`);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`Unexpected filters response for project ${siteId}: expected an object keyed by category`);
  }
  state.projectFilters[siteId] = data;
  console.error(`[SERVER] Cached filters for site ${siteId}`);
  return data;
}
async function getOrFetchFilters(siteId) {
  if (state.projectFilters[siteId]) {
    return state.projectFilters[siteId];
  }
  try {
    return await fetchFilters(siteId);
  } catch (err) {
    console.error(`[SERVER] Failed to fetch filters for site ${siteId}:`, err);
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not load filter definitions for project ${siteId}: ${reason}`);
  }
}
async function getFiltersForQuery(siteId) {
  try {
    return await getOrFetchFilters(siteId);
  } catch (err) {
    throw new Error(`${err.message}. The query was not run, since it can't be built correctly without them.`);
  }
}
function resolveValues(name, value) {
  if (!value) return [];
  if (name === "userCountry") {
    return value.map((v) => typeof v === "string" ? resolveCountryValue(v) : v);
  }
  return value;
}
async function resolveFilters(siteId, modelFilters) {
  if (modelFilters.length === 0) return [];
  const filterDefs = await getFiltersForQuery(siteId);
  const defsByName = {};
  for (const [categoryName, category] of Object.entries(filterDefs)) {
    if (!category?.list) continue;
    for (const def of category.list) {
      if (!defsByName[def.name]) {
        defsByName[def.name] = { def, category: categoryName };
      }
    }
  }
  const eventPropertyDefs = {};
  const eventCategory = filterDefs.event;
  if (eventCategory?.list) {
    for (const def of eventCategory.list) {
      eventPropertyDefs[def.name] = def;
    }
  }
  const buildPropertyFilter = (sf) => {
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
      isSegment: false
    };
  };
  return modelFilters.map((mf) => {
    const lookup = defsByName[mf.name];
    const def = lookup?.def;
    const isEvent = lookup?.category === "events";
    if (lookup?.category === "segments") {
      return {
        value: [String(def.searchId)],
        operator: "is",
        dataType: "string",
        propertyOrder: "and",
        filters: [],
        isEvent: true,
        name: def.name,
        autoCaptured: false,
        isSegment: true,
        searchId: String(def.searchId)
      };
    }
    if (lookup?.category === "features") {
      return {
        value: [String(def.tagId)],
        operator: "is",
        dataType: "string",
        propertyOrder: "and",
        filters: [],
        isEvent: true,
        name: "TAG_TRIGGER",
        autoCaptured: false,
        isSegment: false
      };
    }
    const subFilters = (mf.properties || []).map(buildPropertyFilter);
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
      isSegment: false
    };
  });
}
var DAY_MS = 24 * 60 * 60 * 1e3;
function parseDateBound(value, isEnd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return new Date(value).getTime();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + (isEnd ? 1 : 0)).getTime();
}
function parseDateRange(startDate, endDate, defaultSpanMs = DAY_MS) {
  const now2 = Date.now();
  const endTs = Math.min(endDate ? parseDateBound(endDate, true) : now2, now2);
  const startTs = startDate ? parseDateBound(startDate, false) : endTs - defaultSpanMs;
  if (isNaN(startTs) || isNaN(endTs)) {
    throw new Error(`Invalid date format. startDate="${startDate}", endDate="${endDate}". Use ISO 8601 format like "2025-02-10".`);
  }
  if (startTs >= endTs) {
    throw new Error("startDate must be before endDate (and not in the future)");
  }
  return { startTs, endTs, custom: Boolean(startDate || endDate) };
}
async function resolveSiteId(args) {
  if (args.siteId) return args.siteId;
  if (!args.projectName) {
    throw new Error("Either siteId or projectName must be provided");
  }
  let projectId = getProjectIdByName(args.projectName);
  if (!projectId) {
    await fetchProjects();
    projectId = getProjectIdByName(args.projectName);
  }
  if (!projectId) {
    const available = state.projects.map((p) => p.name).join(", ");
    throw new Error(`Project "${args.projectName}" not found. Available projects: ${available}`);
  }
  return projectId;
}
var SESSION_FIELDS = [
  "sessionId",
  "userId",
  "userAnonymousId",
  "startTs",
  "duration",
  "eventsCount",
  "errorsCount",
  "pagesCount",
  "issueTypes",
  "userBrowser",
  "userOs",
  "userDeviceType",
  "userCountry",
  "userCity",
  "metadata"
];
async function fetchRecentSessions(siteId, limit, filters, range) {
  console.error(`[SERVER] Fetching recent sessions for site ${siteId}...`);
  if (!state.jwt) {
    throw new Error("AUTH_ERROR: Not authenticated");
  }
  const { startTs, endTs } = range;
  const searchPayload = {
    filters,
    rangeValue: range.custom ? "CUSTOM_RANGE" : "LAST_24_HOURS",
    startDate: startTs,
    endDate: endTs,
    sort: "startTs",
    order: "desc",
    viewed: false,
    eventsOrder: "then",
    limit,
    startTimestamp: Math.floor(startTs / 1e3) * 1e3,
    endTimestamp: Math.floor(endTs / 1e3) * 1e3,
    page: 1
  };
  const { data } = await makeApiRequest(`/v2/api/${siteId}/sessions/search`, {
    method: "POST",
    body: JSON.stringify(searchPayload)
  });
  console.error(`[SERVER] Found ${data.sessions?.length || 0} sessions`);
  if (!data.sessions || data.sessions.length === 0) {
    console.error("Used params", siteId, searchPayload, "\n data", data);
    const span = range.custom ? `between ${new Date(startTs).toISOString()} and ${new Date(endTs).toISOString()}` : "in the last 24 hours (pass startDate to search further back)";
    throw new Error(`No sessions found ${span}`);
  }
  const baseUrl = state.appUrl.replace(/\/+$/, "");
  const sessions2 = data.sessions.map((session) => ({
    ...Object.fromEntries(SESSION_FIELDS.filter((k) => session[k] !== void 0).map((k) => [k, session[k]])),
    replayUrl: `${baseUrl}/${siteId}/session/${session.sessionId}`
  }));
  console.error(`[SERVER] Returning ${sessions2.length} sessions`);
  return sessions2;
}
async function fetchProjects() {
  console.error("[SERVER] Fetching projects...");
  if (!state.jwt) {
    throw new Error("AUTH_ERROR: Not authenticated");
  }
  let data;
  try {
    ({ data } = await makeApiRequest("/v2/api/projects"));
  } catch (error) {
    const message = String(error);
    if (!message.includes("failed: 404 ") && !message.includes("instead of JSON")) {
      throw error;
    }
    console.error(`[SERVER] /v2/api/projects not found, falling back to /projects: ${error}`);
    ({ data } = await makeApiRequest("/projects"));
  }
  console.error(`[SERVER] Found ${data.length || 0} projects`);
  state.projects = data.map((project) => ({
    projectId: String(project.projectId),
    name: project.name
  }));
  return state.projects;
}
async function fetchSessionsTimeseries(siteId, startTimestamp, endTimestamp, density = 24, filters = []) {
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
          filters,
          excludes: [],
          eventsOrder: "then",
          startTimestamp: 0,
          endTimestamp: 0,
          page: 1,
          limit: 10
        }
      }
    ],
    page: 1,
    limit: 20,
    sortOrder: "desc"
  };
  const { data } = await makeApiRequest(`/v2/api/${siteId}/cards/try`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  console.error(`[SERVER] Got ${data?.length || 0} timeseries data points`);
  return data;
}
async function fetchPathAnalysis(siteId, startTimestamp, endTimestamp, startPoint, filters = []) {
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
          filters,
          excludes: [],
          eventsOrder: "then",
          startTimestamp: 0,
          endTimestamp: 0,
          page: 1,
          limit: 10
        }
      }
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
        autoCaptured: true
      }
    ],
    excludes: []
  };
  const { data } = await makeApiRequest(`/v2/api/${siteId}/cards/try`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  console.error(`[SERVER] Got path analysis: ${data?.nodes?.length || 0} nodes, ${data?.links?.length || 0} links`);
  return data;
}
async function fetchWebVitals(siteId, startTimestamp, endTimestamp, filters = []) {
  console.error(`[SERVER] Fetching web vitals for site ${siteId}...`);
  if (!state.jwt) {
    throw new Error("AUTH_ERROR: Not authenticated");
  }
  const locationFilter = {
    value: [],
    operator: "is",
    dataType: "string",
    propertyOrder: "and",
    filters: [],
    isEvent: true,
    name: "LOCATION",
    autoCaptured: true
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
          limit: 10
        }
      }
    ],
    page: 1,
    limit: 20,
    sortOrder: "desc"
  };
  const { data } = await makeApiRequest(`/v2/api/${siteId}/cards/try`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  console.error(`[SERVER] Got web vitals data: ${Object.keys(data || {}).join(", ")}`);
  return data;
}
async function fetchTableData(siteId, startTimestamp, endTimestamp, metricOf, limit = 20, filters = []) {
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
          filters,
          excludes: [],
          eventsOrder: "and",
          startTimestamp: 0,
          endTimestamp: 0,
          page: 1,
          limit: 10
        }
      }
    ],
    page: 1,
    rows: 5,
    limit,
    sortOrder: "desc"
  };
  const { data } = await makeApiRequest(`/v2/api/${siteId}/cards/try`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  console.error(`[SERVER] Got table data: ${data?.values?.length || 0} values, total=${data?.total || 0}`);
  return data;
}
function buildPropertySubFilter(name, value, operator) {
  return {
    value: [value],
    operator,
    dataType: "string",
    propertyOrder: "and",
    filters: [],
    isEvent: false,
    name,
    autoCaptured: true,
    isSegment: false
  };
}
var FUNNEL_STEP_PROPERTY = {
  LOCATION: "urlPath",
  CLICK: "label",
  INPUT: "label"
};
var BUILTIN_EVENTS = /* @__PURE__ */ new Set(["LOCATION", "CLICK", "INPUT", "ISSUE", "ERROR", "REQUEST", "PERFORMANCE"]);
async function resolveFunnelSteps(siteId, steps) {
  const needsDefs = steps.some((step) => typeof step !== "string" && !BUILTIN_EVENTS.has(step.type));
  const filterDefs = needsDefs ? await getFiltersForQuery(siteId) : null;
  const eventDefs = {};
  const eventCategory = filterDefs?.events;
  if (eventCategory?.list) {
    for (const def of eventCategory.list) {
      eventDefs[def.name] = def;
    }
  }
  return steps.map((step) => {
    const isShorthand = typeof step === "string";
    const eventName = isShorthand ? "LOCATION" : step.type;
    const value = isShorthand ? step : step.value;
    const operator = isShorthand ? "is" : step.operator || "is";
    const def = eventDefs[eventName];
    const autoCaptured = def?.autoCaptured ?? true;
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
        isSegment: false
      };
    }
    const propertyName = FUNNEL_STEP_PROPERTY[eventName];
    const subFilters = propertyName && value ? [buildPropertySubFilter(propertyName, value, operator)] : [];
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
      isSegment: false
    };
  });
}
async function fetchFunnel(siteId, startTimestamp, endTimestamp, stepFilters, filters = []) {
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
          limit: 10
        }
      }
    ],
    page: 1,
    limit: 20,
    sortOrder: "desc"
  };
  const { data } = await makeApiRequest(`/v2/api/${siteId}/cards/try`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  console.error(`[SERVER] Got funnel data: ${data?.stages?.length || 0} stages`);
  return data;
}
async function fetchSessionReplay(siteId, sessionId) {
  console.error(`[SERVER] Fetching session replay for ${sessionId} in site ${siteId}...`);
  if (!state.jwt) {
    throw new Error("AUTH_ERROR: Not authenticated");
  }
  const { data } = await makeApiRequest(`/v2/api/${siteId}/sessions/${sessionId}/replay`);
  return data;
}
async function fetchSessionEvents(siteId, sessionId) {
  console.error(`[SERVER] Fetching session events for ${sessionId} in site ${siteId}...`);
  if (!state.jwt) {
    throw new Error("AUTH_ERROR: Not authenticated");
  }
  const { data } = await makeApiRequest(`/v2/api/${siteId}/sessions/${sessionId}/events`);
  return data;
}
async function fetchEvents(siteId, startTimestamp, endTimestamp, limit = 50, page2 = 1, filters = []) {
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
    page: page2,
    filters
  };
  const { data } = await makeApiRequest(`/v2/api/${siteId}/events`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  console.error(`[SERVER] Got ${data?.events?.length || 0} events (total: ${data?.total || 0})`);
  return data;
}
async function fetchUsers(siteId, startTimestamp, endTimestamp, limit = 50, page2 = 1, query = "", filters = []) {
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
    page: page2,
    filters,
    query
  };
  const { data } = await makeApiRequest(`/v2/api/${siteId}/users`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  console.error(`[SERVER] Got ${data?.users?.length || 0} users (total: ${data?.total || 0})`);
  return data;
}
function summarize(trace) {
  const statusCounts = {};
  let lastStatus = null;
  let lastBody = "";
  let firstError;
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
    firstError
  };
}
async function pollForAuth(appUrl2, authCode, clientId, timeoutMs = 6e4, intervalMs = 2e3) {
  const abortController = createPollAbortController();
  const startedAt = Date.now();
  const deadline = startedAt + timeoutMs;
  const statusUrl = `${buildApiUrl(appUrl2, "/v1/mcp/auth-status")}?state=${authCode}&client_id=${clientId}`;
  const trace = [];
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
      const res = await fetch(statusUrl, { signal: abortController.signal });
      const elapsedMs = Date.now() - attemptStart;
      const bodyText = await res.text().catch(() => "");
      const remaining = Math.max(0, deadline - Date.now());
      const truncatedBody = bodyText.length > 200 ? bodyText.slice(0, 200) + "...(truncated)" : bodyText;
      console.error(
        `[POLL] [#${attempt}] status=${res.status} elapsed=${elapsedMs}ms remaining=${remaining}ms body=${truncatedBody || "<empty>"}`
      );
      trace.push({ attempt, status: res.status, elapsedMs, body: truncatedBody });
      if (res.ok) {
        let parsed = null;
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
    } catch (err) {
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
        r(void 0);
      }, { once: true });
    });
  }
  const summary = summarize(trace);
  console.error(
    `[POLL] timed out after ${attempt} attempt(s) (~${timeoutMs}ms) statusCounts=${JSON.stringify(summary.statusCounts)} lastStatus=${summary.lastStatus} lastBody=${summary.lastBody || "<empty>"}`
  );
  return { jwt: null, statusUrl, summary, durationMs: Date.now() - startedAt, aborted: false, timedOut: true };
}
function getProjectIdByName(projectName) {
  const project = state.projects.find(
    (p) => p.name.toLowerCase() === projectName.toLowerCase()
  );
  return project ? project.projectId : null;
}

// lib/schemas.ts
import { z } from "zod";
var SiteId = z.string().optional().describe("Project ID. Either siteId or projectName is required.");
var ProjectName = z.string().optional().describe("Project name, resolved to its ID automatically.");
var StartDate = z.string().describe("ISO 8601 date, e.g. '2026-02-10'. Convert relative references ('last week') to dates.");
var EndDate = z.string().describe("ISO 8601 date. A bare date includes that whole day; use today for 'until now'.");
var Operator = z.enum(["is", "isNot", "isAny", "isUndefined", "contains", "notContains", "startsWith", "endsWith", "regex", "=", "<", ">", "<=", ">="]).optional().default("is");
var FilterPropertySchema = z.object({
  name: z.string().describe("Event property from get_available_filters 'eventProperties', e.g. urlPath, label, status"),
  value: z.array(z.union([z.string(), z.number()])),
  operator: Operator
});
var FilterItemSchema = z.object({
  name: z.string().describe("A name from get_available_filters: attribute (userCountry, userId), event (LOCATION, CLICK), segment or feature"),
  value: z.array(z.union([z.string(), z.number()])).optional().describe("Omit for events narrowed by properties, and for segments/features"),
  operator: Operator,
  properties: z.array(FilterPropertySchema).optional().describe("Events only, e.g. LOCATION with [{name:'urlPath', value:['/signup'], operator:'contains'}]")
});
var Filters = z.array(FilterItemSchema).optional();
var ViewRecentSessionsSchema = z.object({
  siteId: SiteId,
  projectName: ProjectName,
  limit: z.number().optional().default(10).describe("Max 50"),
  startDate: StartDate.optional().describe("ISO 8601 date. Defaults to 24 hours before endDate."),
  endDate: EndDate.optional().describe("ISO 8601 date, a bare date includes that day. Defaults to now."),
  filters: Filters
});
var ViewSessionsChartSchema = z.object({
  startDate: StartDate,
  endDate: EndDate,
  siteId: SiteId,
  projectName: ProjectName,
  filters: Filters
});
var ViewUserJourneySchema = z.object({
  startDate: StartDate,
  endDate: EndDate,
  siteId: SiteId,
  projectName: ProjectName,
  startPoint: z.string().optional().describe("URL path to start from, e.g. '/pricing'. Omit for the most popular paths."),
  filters: Filters
});
var ViewWebVitalsSchema = z.object({
  startDate: StartDate,
  endDate: EndDate,
  siteId: SiteId,
  projectName: ProjectName,
  filters: Filters
});
var ViewTableChartSchema = z.object({
  startDate: StartDate,
  endDate: EndDate,
  metricOf: z.string().describe("What to rank: LOCATION (pages), REQUEST, userBrowser, userCountry, userOs, userDevice"),
  siteId: SiteId,
  projectName: ProjectName,
  limit: z.number().optional().default(20),
  filters: Filters
});
var FunnelStepSchema = z.union([
  z.string().describe("URL path, shorthand for a LOCATION step"),
  z.object({
    type: z.string().describe("LOCATION, CLICK, INPUT, ISSUE, or a custom event name"),
    value: z.string().optional().describe("Matches urlPath (LOCATION), label (CLICK/INPUT) or issue type (ISSUE); ignored for custom events"),
    operator: z.enum(["is", "contains"]).optional().default("is")
  })
]);
var ViewFunnelSchema = z.object({
  startDate: StartDate,
  endDate: EndDate,
  steps: z.array(FunnelStepSchema).min(2).describe("Ordered steps, e.g. ['/pricing', {type:'CLICK', value:'Subscribe'}, {type:'purchase_completed'}]"),
  siteId: SiteId,
  projectName: ProjectName,
  filters: Filters
});
var SessionRef = {
  sessionId: z.string().describe("From an earlier session list, also when the user refers to one by position"),
  siteId: SiteId,
  projectName: ProjectName
};
var ViewSessionReplaySchema = z.object(SessionRef);
var GetSessionDetailsSchema = z.object(SessionRef);
var ProjectSchema = z.object({
  siteId: SiteId,
  projectName: ProjectName
});
var FetchEventsSchema = z.object({
  siteId: SiteId,
  projectName: ProjectName,
  startDate: z.string().optional().describe("ISO 8601 date. Defaults to 24 hours ago."),
  endDate: z.string().optional().describe("ISO 8601 date. Defaults to now."),
  limit: z.number().optional().default(50).describe("Max 200"),
  page: z.number().optional().default(1)
});
var FetchUsersSchema = z.object({
  siteId: SiteId,
  projectName: ProjectName,
  startDate: z.string().optional().describe("ISO 8601 date. Defaults to 7 days ago."),
  endDate: z.string().optional().describe("ISO 8601 date. Defaults to now."),
  query: z.string().optional().default("").describe("Matches name, email or user ID"),
  limit: z.number().optional().default(50).describe("Max 200"),
  page: z.number().optional().default(1)
});
var FetchChartDataSchema = z.object({
  endpoint: z.string().describe("API path, e.g. /v2/api/{siteId}/..."),
  params: z.looseRecord(z.string(), z.any()).optional().describe("Query parameters"),
  siteId: z.string().optional()
});
var SearchDocsSchema = z.object({
  query: z.string().optional().describe("Keywords or the user's question. Omit for the full docs index.")
});
var ConfigureBackendSchema = z.object({
  appUrl: z.string().describe("Instance URL as opened in the browser, e.g. https://openreplay.your-company.com")
});
var CompleteLoginSchema = z.object({
  state: z.string().optional().describe("State code from login_browser; defaults to the latest"),
  timeoutMs: z.number().optional().describe("How long to wait for approval. Default 60000.")
});
var LoginJwtSchema = z.object({
  jwt: z.string()
});
var RefreshReplayUrlsSchema = z.object({
  sessionId: z.string(),
  siteId: z.string().optional()
});
var FetchUrlSchema = z.object({
  url: z.string()
});
var AgentStartDate = z.string().optional().describe("ISO 8601 date. Defaults to 7 days before endDate.");
var AgentEndDate = z.string().optional().describe("ISO 8601 date, a bare date includes that day. Defaults to now.");
var ListSmartIssuesSchema = z.object({
  siteId: SiteId,
  projectName: ProjectName,
  startDate: AgentStartDate,
  endDate: AgentEndDate,
  query: z.string().optional().describe("Matches issue names"),
  category: z.enum(["Errors", "UI/UX", "Slowness"]).optional(),
  critical: z.boolean().optional().describe("Only issues flagged critical"),
  sortBy: z.enum(["impact", "count", "recency", "firstSeen"]).optional().default("impact"),
  visibility: z.enum(["active", "hidden", "all"]).optional().default("active"),
  limit: z.number().optional().default(20).describe("Max 100"),
  page: z.number().optional().default(1)
});
var GetSmartIssueSchema = z.object({
  issueId: z.string().describe("From list_smart_issues"),
  siteId: SiteId,
  projectName: ProjectName,
  startDate: AgentStartDate,
  endDate: AgentEndDate,
  sessionsLimit: z.number().optional().default(10).describe("Example sessions to include, max 50"),
  sessionQuery: z.string().optional().describe("Rank example sessions by relevance to this text (AI search); omit for newest first")
});
var TestStatus = z.enum(["draft", "approved", "rejected", "active", "paused"]);
var RunStatus = z.enum(["dispatched", "running", "passed", "failed", "error", "timeout"]);
var ListSmartTestsSchema = z.object({
  siteId: SiteId,
  projectName: ProjectName,
  name: z.string().optional().describe("Matches test names"),
  status: TestStatus.optional(),
  tags: z.array(z.string()).optional().describe("Tests having any of these tags"),
  needsReview: z.boolean().optional().describe("true: only tests with a runner-proposed change awaiting review"),
  limit: z.number().optional().default(25).describe("Max 100"),
  page: z.number().optional().default(1)
});
var TestRef = {
  testId: z.string().describe("From list_smart_tests"),
  siteId: SiteId,
  projectName: ProjectName
};
var GetSmartTestSchema = z.object({
  ...TestRef,
  runsLimit: z.number().optional().default(5).describe("Recent runs to include, max 50")
});
var TriggerSmartTestRunSchema = z.object(TestRef);
var ListSmartTestRunsSchema = z.object({
  siteId: SiteId,
  projectName: ProjectName,
  testId: z.string().optional().describe("Only runs of this test"),
  status: z.array(RunStatus).optional().describe("Any of these, e.g. ['failed','error','timeout'] for all failures"),
  name: z.string().optional().describe("Matches test names"),
  startDate: z.string().optional().describe("ISO 8601 date; bounds run start. Omit both dates for all time."),
  endDate: z.string().optional().describe("ISO 8601 date, a bare date includes that day"),
  limit: z.number().optional().default(25).describe("Max 100"),
  page: z.number().optional().default(1)
});
var GetSmartTestRunSchema = z.object({
  runId: z.string().describe("From list_smart_test_runs or get_smart_test"),
  siteId: SiteId,
  projectName: ProjectName
});

// lib/agents.ts
var enc = encodeURIComponent;
function requireAuth() {
  if (!state.jwt) {
    throw new Error("AUTH_ERROR: Not authenticated");
  }
}
function withQuery(endpoint, params) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== void 0 && value !== "") qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `${endpoint}?${s}` : endpoint;
}
var appBase = () => state.appUrl.replace(/\/+$/, "");
var isoOrNull = (ms) => ms ? new Date(ms).toISOString() : null;
var clip = (s, max = 500) => !s ? void 0 : s.length > max ? `${s.slice(0, max)}\u2026` : s;
var issuesBase = (siteId) => `/v2/smart-issues/${enc(siteId)}`;
var LABEL_RATIO_MIN = 70;
var strongLabels = (labels) => (labels ?? []).filter((l) => (l.ratio ?? 0) >= LABEL_RATIO_MIN).map((l) => l.name);
var labelNames = (labels) => (labels ?? []).map((l) => typeof l === "string" ? l : l?.name).filter(Boolean);
var impactLevel = (v) => v >= 45 ? "high" : v >= 25 ? "medium" : "low";
function compactIssue(siteId, d) {
  return {
    issueId: d.issueId,
    name: d.issueName,
    description: d.issueDescription || void 0,
    category: d.category || d.categories?.[0],
    impact: d.impact ?? 0,
    impactLevel: impactLevel(d.impact ?? 0),
    severity: d.level || void 0,
    critical: Boolean(d.critical),
    hidden: Boolean(d.hidden),
    deleted: d.deleted || void 0,
    impactedSessions: d.impactedSessions ?? 0,
    occurrences: d.count ?? 0,
    firstSeen: isoOrNull(d.firstSeen),
    lastSeen: isoOrNull(d.lastSeen),
    issueLabels: strongLabels(d.issueLabels),
    journeyLabels: strongLabels(d.journeyLabels),
    url: `${appBase()}/${siteId}/smart-issues/${d.issueId}`
  };
}
function compactIssueSession(siteId, issueId, s) {
  const ts = s.issueTimestamp;
  const duration = s.duration ?? 0;
  const issueAtMs = ts ? Math.max(duration && ts > duration ? ts - (s.startTs ?? 0) : ts, 0) : void 0;
  return {
    sessionId: String(s.sessionId),
    startedAt: isoOrNull(s.startTs),
    durationMs: s.duration ?? void 0,
    userId: s.userId || void 0,
    userBrowser: s.userBrowser,
    userOs: s.userOs,
    userDeviceType: s.userDeviceType,
    userCountry: s.userCountry,
    userCity: s.userCity || void 0,
    summary: s.journeySummary || void 0,
    description: clip(s.description, 1e3),
    journeyLabels: labelNames(s.journeyLabels),
    issueAtMs,
    journeySteps: (s.journeySteps ?? []).map((st) => ({ name: st.name, atMs: st.relativeTimestamp })),
    replayUrl: `${appBase()}/${siteId}/smart-issues/${issueId}/session/${s.sessionId}`
  };
}
async function fetchSmartIssues(siteId, opts) {
  requireAuth();
  const json2 = await makeApiRequest(issuesBase(siteId), {
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
      ...opts.category ? { category: opts.category } : {},
      ...opts.critical ? { critical: true } : {}
    })
  });
  const rows = json2.data ?? [];
  return {
    total: json2.total ?? rows.length,
    categoryCounts: json2.categoryCounts ?? void 0,
    issues: rows.map((d) => compactIssue(siteId, d))
  };
}
async function fetchSmartIssue(siteId, issueId, range, sessions2) {
  requireAuth();
  const [issueJson, sessionsJson] = await Promise.all([
    makeApiRequest(withQuery(`${issuesBase(siteId)}/issue`, { id: issueId, startMs: range[0], endMs: range[1] })),
    makeApiRequest(`${issuesBase(siteId)}/search`, {
      method: "POST",
      body: JSON.stringify({
        issueId,
        // a non-null query switches the backend to vector search + LLM re-rank
        query: sessions2.query || null,
        issueLabels: [],
        journeyLabels: [],
        journeyLabelsMatch: "and",
        sortBy: "time",
        sortDir: "desc",
        range,
        limit: sessions2.limit,
        page: 1
      })
    })
  ]);
  if (!issueJson.data) {
    throw new Error(`Smart issue ${issueId} not found in project ${siteId}`);
  }
  const rows = sessionsJson.data ?? [];
  return {
    issue: compactIssue(siteId, issueJson.data),
    sessionsTotal: sessionsJson.total ?? rows.length,
    sessions: rows.map((s) => compactIssueSession(siteId, issueId, s))
  };
}
var testsBase = (siteId) => `/v2/api/${enc(siteId)}/browser-tests`;
async function fetchEnvironments(siteId) {
  try {
    const json2 = await makeApiRequest(withQuery(`${testsBase(siteId)}/environments`, { limit: 100 }));
    return new Map((json2.items ?? []).map((e) => [e.environmentId, { name: e.name, baseUrl: e.baseUrl }]));
  } catch (err) {
    console.error(`[SERVER] Could not load test environments for site ${siteId}:`, err);
    return /* @__PURE__ */ new Map();
  }
}
var testUrl = (siteId, testId) => `${appBase()}/${siteId}/test-agents?tab=tests&test=${enc(testId)}`;
var runUrl = (siteId, runId) => `${appBase()}/${siteId}/test-agents?tab=runs&run=${enc(runId)}`;
var stepLines = (steps) => {
  if (!steps) return [];
  if (Array.isArray(steps)) return steps.map((s) => typeof s === "string" ? s : JSON.stringify(s));
  if (typeof steps === "string") return steps.split("\n").filter((l) => l.trim() !== "");
  return [JSON.stringify(steps)];
};
var stringList = (v) => Array.isArray(v) ? v.filter((x) => typeof x === "string") : void 0;
function compactTest(siteId, t, envs) {
  return {
    testId: t.testId,
    name: t.name,
    status: t.status,
    needsReview: t.needsReview || void 0,
    pendingVersion: t.suggestion?.version,
    tags: t.tags?.length ? t.tags : void 0,
    schedule: t.cron || null,
    environments: (t.environments ?? []).map((id) => envs.get(id)?.name ?? id),
    resolutions: stringList(t.config?.resolutions),
    regions: stringList(t.config?.regions),
    hasSideEffects: t.hasSideEffects || void 0,
    lastRunAt: t.lastRunAt ?? null,
    nextRunAt: t.nextRunAt ?? null,
    url: testUrl(siteId, t.testId)
  };
}
function compactRun(siteId, r, envs) {
  return {
    runId: r.runId,
    testId: r.testId,
    testName: r.testName,
    status: r.status,
    startedAt: r.startedAt ?? null,
    finishedAt: r.finishedAt ?? null,
    durationMs: r.durationMs || void 0,
    version: r.version ?? void 0,
    screenType: r.screenType,
    region: r.region ?? void 0,
    environment: r.environmentId ? envs.get(r.environmentId)?.name ?? r.environmentId : void 0,
    tags: r.tags?.length ? r.tags : void 0,
    batchId: r.batchId ?? void 0,
    url: runUrl(siteId, r.runId)
  };
}
async function fetchSmartTests(siteId, opts) {
  requireAuth();
  const [json2, envs] = await Promise.all([
    makeApiRequest(withQuery(`${testsBase(siteId)}/tests`, {
      limit: opts.limit,
      page: opts.page,
      sortField: "updated_at",
      sortOrder: "desc",
      name: opts.name,
      status: opts.status,
      tags: opts.tags?.join(","),
      needsReview: opts.needsReview
    })),
    fetchEnvironments(siteId)
  ]);
  const items = json2.items ?? [];
  return {
    total: json2.total ?? items.length,
    tests: items.map((t) => compactTest(siteId, t, envs))
  };
}
async function fetchSmartTest(siteId, testId, runsLimit) {
  requireAuth();
  const base = testsBase(siteId);
  const [t, runs, envs] = await Promise.all([
    makeApiRequest(`${base}/tests/${enc(testId)}`),
    makeApiRequest(withQuery(`${base}/tests/${enc(testId)}/runs`, {
      limit: runsLimit,
      sortField: "started_at",
      sortOrder: "desc"
    })),
    fetchEnvironments(siteId)
  ]);
  return {
    test: {
      ...compactTest(siteId, t, envs),
      scenario: t.scenario || void 0,
      steps: stepLines(t.steps),
      expectedResult: t.expectedResult || void 0,
      environments: (t.environments ?? []).map((id) => envs.get(id) ?? { name: id }),
      timeoutSecs: t.timeoutSecs,
      activeVersion: t.activeVersion ?? void 0,
      latestVersion: t.latestVersion ?? void 0,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    },
    runsTotal: runs.total ?? 0,
    recentRuns: (runs.items ?? []).map((r) => compactRun(siteId, r, envs))
  };
}
async function fetchSmartTestRuns(siteId, opts) {
  requireAuth();
  const [json2, envs] = await Promise.all([
    makeApiRequest(withQuery(`${testsBase(siteId)}/runs`, {
      limit: opts.limit,
      page: opts.page,
      sortField: "started_at",
      sortOrder: "desc",
      testId: opts.testId,
      status: opts.status?.join(","),
      name: opts.name,
      from: opts.from,
      to: opts.to
    })),
    fetchEnvironments(siteId)
  ]);
  const items = json2.items ?? [];
  return {
    total: json2.total ?? items.length,
    runs: items.map((r) => compactRun(siteId, r, envs))
  };
}
var compactAction = (a) => ({
  action: clip(a.action),
  status: a.status,
  durationMs: a.duration_ms,
  error: clip(a.error)
});
function runSteps(results) {
  const agentSteps = Array.isArray(results?.agent_steps) ? results.agent_steps : [];
  if (Array.isArray(results?.user_steps) && results.user_steps.length) {
    return results.user_steps.map((us) => ({
      step: us.description,
      status: us.status,
      error: clip(us.error),
      actions: (us.agent_steps ?? []).map((i) => agentSteps[i]).filter(Boolean).map(compactAction)
    }));
  }
  const groups = /* @__PURE__ */ new Map();
  agentSteps.forEach((a, i) => {
    const key = a.user_step_index ?? `agent-${i}`;
    groups.set(key, [...groups.get(key) ?? [], a]);
  });
  return [...groups.values()].map((actions) => ({
    step: actions[0].user_step_text || actions[0].action,
    status: actions.find((a) => a.status === "failed" || a.status === "error")?.status ?? actions[0].status,
    actions: actions.map(compactAction)
  }));
}
var MAX_FAILED_REQUESTS = 20;
function failedRequests(results) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const a of results?.agent_steps ?? []) {
    for (const r of a.failed_requests ?? []) {
      const key = `${r.method} ${r.url} ${r.status}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ method: r.method, url: clip(r.url, 300), status: r.status });
    }
  }
  return { total: out.length, requests: out.slice(0, MAX_FAILED_REQUESTS) };
}
async function fetchSmartTestRun(siteId, runId) {
  requireAuth();
  const [d, envs] = await Promise.all([
    makeApiRequest(`${testsBase(siteId)}/runs/${enc(runId)}`),
    fetchEnvironments(siteId)
  ]);
  const results = d.results ?? null;
  const failed = failedRequests(results);
  return {
    ...compactRun(siteId, d, envs),
    durationMs: d.durationMs || results?.duration_ms || void 0,
    summary: results?.final_result,
    error: clip(results?.failed_step_error, 2e3) || (results?.errors?.length ? clip(results.errors.join("\n"), 2e3) : void 0),
    failedStep: typeof results?.failed_step_index === "number" ? { index: results.failed_step_index, step: results.failed_step_text } : void 0,
    steps: results ? runSteps(results) : [],
    jsErrors: (results?.js_errors ?? []).slice(0, 20).map((e) => clip(e)),
    failedRequests: failed.total ? failed : void 0,
    resultsMissing: results ? void 0 : true
  };
}
async function triggerSmartTestRun(siteId, testId) {
  requireAuth();
  return makeApiRequest(`${testsBase(siteId)}/tests/${enc(testId)}/trigger`, {
    method: "POST",
    body: "{}"
  });
}

// lib/tools.ts
function formatChartTimestamp(ts, rangeHours) {
  const d = new Date(ts);
  if (rangeHours <= 48) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  if (rangeHours <= 24 * 30) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
var DOCS_INDEX_URL = "https://docs.openreplay.com/llms-full.txt";
var DOCS_CACHE_TTL_MS = 60 * 60 * 12 * 1e3;
var docsCache = null;
async function getOpenReplayDocsIndex() {
  const now2 = Date.now();
  if (docsCache && now2 - docsCache.fetchedAt < DOCS_CACHE_TTL_MS) {
    return docsCache.content;
  }
  const response = await fetch(DOCS_INDEX_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenReplay docs index: HTTP ${response.status}`);
  }
  const content = await response.text();
  docsCache = { content, fetchedAt: now2 };
  return content;
}
var DOCS_STOP_WORDS = /* @__PURE__ */ new Set([
  "the",
  "and",
  "for",
  "what",
  "how",
  "are",
  "can",
  "with",
  "from",
  "this",
  "that",
  "does",
  "openreplay",
  "open",
  "replay",
  "use",
  "using",
  "you",
  "your"
]);
function assertFetchableMobUrl(raw) {
  let u;
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
function isPrivateAddress(addr) {
  const family = net.isIP(addr);
  if (family === 4) {
    const [a, b] = addr.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 192 && b === 0) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a >= 224) return true;
    return false;
  }
  if (family === 6) {
    const lower = addr.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    if (/^f[cd]/.test(lower)) return true;
    if (/^fe[89ab]/.test(lower)) return true;
    if (lower.startsWith("ff")) return true;
    return false;
  }
  return true;
}
async function assertProxyableCssUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new Error(`Invalid stylesheet URL: ${raw}`);
  }
  if (u.protocol !== "https:") {
    throw new Error("Stylesheet URL must use https");
  }
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
var MAX_MOB_FILE_BYTES = 128 * 1024 * 1024;
var MAX_CSS_BYTES = 5 * 1024 * 1024;
async function fetchCapped(url, maxBytes) {
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
function uiConnectDomains() {
  const domains = /* @__PURE__ */ new Set(["*.openreplay.com"]);
  try {
    const host = new URL(state.appUrl).hostname;
    domains.add(host);
    const parts = host.split(".");
    if (parts.length > 2) {
      domains.add(`*.${parts.slice(-2).join(".")}`);
    }
  } catch {
  }
  return Array.from(domains);
}
function isMobilePlatform(platform) {
  return typeof platform === "string" && /ios|android/i.test(platform);
}
function registerUITools(server, resourceUri) {
  registerAppTool(
    server,
    "view_recent_sessions",
    {
      title: "OpenReplay Recent Sessions",
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      description: "PREFERRED tool for fetching and displaying sessions. Always use this tool when the user asks to see, show, list, get, or fetch sessions. Renders a rich interactive session list with user info, timing, device details, and play buttons, and returns the sessions as compact JSON for analysis. You can specify one of the required parameters: project ID (siteId param) or its name (projectName param). Supports filtering by user attributes (country, browser, OS, device, etc.). Call get_available_filters first to see what filters are available. Searches the last 24 hours unless startDate/endDate are given \u2014 pass a wider startDate when looking up a specific user's history or older sessions. After showing the session list, let the user know they can (1) ask you to replay any session directly here using the built-in session player via view_session_replay, and (2) click the play button on any session in the list to open it in the full OpenReplay UI in their browser. Mention both options to the user. TIP: Combine multiple data tools for comprehensive analysis. Use view_recent_sessions with the same filters to drill into sessions related to any chart data.",
      inputSchema: ViewRecentSessionsSchema,
      _meta: {
        ui: {
          resourceUri,
          visibility: ["model"],
          csp: {
            connectDomains: uiConnectDomains()
          }
        },
        examples: [
          { description: "Show 20 sessions for project MyApp", input: { projectName: "MyApp", limit: 20 } },
          { description: "Sessions from Chrome users in France or Tunisia in project 1", input: { siteId: "1", filters: [{ name: "userBrowser", value: ["Chrome"], operator: "is" }, { name: "userCountry", value: ["France", "Tunisia"], operator: "is" }] } },
          { description: "Show me sessions with errors", input: { projectName: "MyApp", filters: [{ name: "issue", value: ["js_exception"], operator: "is" }] } },
          { description: "Last 5 sessions on serverless", input: { projectName: "serverless", limit: 5 } },
          { description: "Show me recent sessions of project serverless", input: { projectName: "serverless" } },
          { description: "Sessions of user tahay@asayer.io", input: { projectName: "MyApp", filters: [{ name: "userId", value: ["tahay@asayer.io"] }] } },
          { description: "Sessions of user tahay@asayer.io over the last 30 days", input: { projectName: "MyApp", startDate: "2026-03-11", filters: [{ name: "userId", value: ["tahay@asayer.io"] }] } },
          { description: "Sessions where the user visited the signup page", input: { projectName: "MyApp", filters: [{ name: "LOCATION", properties: [{ name: "urlPath", value: ["signup"], operator: "contains" }] }] } },
          { description: "Sessions where the user clicked on subscribe", input: { projectName: "MyApp", filters: [{ name: "CLICK", properties: [{ name: "label", value: ["subscribe"], operator: "is" }] }] } },
          { description: "Sessions longer than 20 minutes", input: { projectName: "MyApp", filters: [{ name: "duration", value: [20] }] } },
          { description: "Sessions shorter than 20 minutes", input: { projectName: "MyApp", filters: [{ name: "duration", value: [0, 20] }] } },
          { description: "Sessions with failed requests to /api/users", input: { projectName: "MyApp", filters: [{ name: "REQUEST", properties: [{ name: "urlPath", value: ["/api/users"], operator: "is" }, { name: "status", value: [400], operator: ">=" }] }] } },
          { description: "Sessions with metadata plan is free", input: { projectName: "MyApp", filters: [{ name: "metadata_1", value: ["free"], operator: "is" }] } }
        ]
      }
    },
    async (args) => {
      console.error("[SERVER] view_recent_sessions tool CALLED!");
      console.error("[SERVER] Arguments:", JSON.stringify(args, null, 2));
      try {
        const siteId = await resolveSiteId(args);
        const limit = Math.min(args.limit || 10, 50);
        const range = parseDateRange(args.startDate, args.endDate);
        const resolvedFilters = await resolveFilters(siteId, args.filters ?? []);
        const sessions2 = await fetchRecentSessions(siteId, limit, resolvedFilters, range);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                type: "session_list",
                sessions: sessions2,
                siteId
              })
            }
          ]
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
                isAuthError: errorMessage.includes("AUTH_ERROR")
              })
            }
          ],
          isError: true
        };
      }
    }
  );
  registerAppTool(
    server,
    "view_chart",
    {
      title: "OpenReplay Sessions Chart",
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      description: "PREFERRED tool for showing session analytics charts. Use this when the user asks to see charts, graphs, numbers, trends, or analytics about sessions over time. Examples: 'show me sessions chart for last week', 'how many sessions today', 'show me the trend for past 3 days'. You MUST convert the user's time references into actual ISO date strings for startDate and endDate. For example, if today is 2025-02-18 and the user says 'last week', use startDate='2025-02-10' and endDate='2025-02-18'. Supports filtering by user attributes. Call get_available_filters to see available filters. TIP: Combine multiple data tools for comprehensive analysis. Use view_recent_sessions with the same filters to drill into sessions related to any chart data.",
      inputSchema: ViewSessionsChartSchema,
      _meta: {
        ui: {
          resourceUri,
          visibility: ["model"],
          csp: {
            connectDomains: uiConnectDomains()
          }
        },
        examples: [
          { description: "Show me sessions chart for last week", input: { startDate: "2026-04-03", endDate: "2026-04-11", projectName: "MyApp" } },
          { description: "How many sessions today on chrome or edge today", input: { startDate: "2026-04-10", endDate: "2026-04-11", projectName: "MyApp", filters: [{ name: "userBrowser", value: ["Chrome", "Edge"], operator: "is" }] } },
          { description: "Session trend for the past 30 days from France", input: { startDate: "2026-03-11", endDate: "2026-04-10", projectName: "MyApp", filters: [{ name: "userCountry", value: ["France"], operator: "is" }] } },
          { description: "Chart of sessions from mobile users this month", input: { startDate: "2026-03-10", endDate: "2026-04-10", projectName: "MyApp", filters: [{ name: "userDeviceType", value: ["mobile"], operator: "is" }] } },
          { description: "Timeseries of people who visited signup page last week", input: { startDate: "2026-04-03", endDate: "2026-04-10", siteId: "1", filters: [{ name: "LOCATION", properties: [{ name: "urlPath", value: ["signup"], operator: "contains" }] }] } }
        ]
      }
    },
    async (parsed) => {
      console.error("[SERVER] view_chart tool CALLED!");
      console.error("[SERVER] Arguments:", JSON.stringify(parsed, null, 2));
      try {
        const siteId = await resolveSiteId(parsed);
        const { startTs, endTs } = parseDateRange(parsed.startDate, parsed.endDate);
        const rangeMs = endTs - startTs;
        const rangeHours = rangeMs / (1e3 * 60 * 60);
        let density;
        if (rangeHours <= 48) {
          density = Math.max(Math.ceil(rangeHours), 12);
        } else if (rangeHours <= 24 * 14) {
          density = Math.ceil(rangeHours / 4);
        } else {
          density = Math.min(Math.ceil(rangeHours / 24), 90);
        }
        const resolvedFilters = await resolveFilters(siteId, parsed.filters ?? []);
        const rawData = await fetchSessionsTimeseries(siteId, startTs, endTs, density, resolvedFilters);
        let chartPoints;
        let seriesNames;
        if (rawData && rawData.series && typeof rawData.series === "object" && !Array.isArray(rawData.series)) {
          const seriesObj = rawData.series;
          const seriesKeys = Object.keys(seriesObj);
          const tsSet = /* @__PURE__ */ new Set();
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
          chartPoints = timestamps.map((ts) => {
            const point = { timestamp: Number(ts) };
            for (const key of seriesKeys) {
              point[key] = seriesObj[key]?.[ts] ?? 0;
            }
            return point;
          });
        } else if (Array.isArray(rawData)) {
          chartPoints = rawData;
          seriesNames = chartPoints.length > 0 ? Object.keys(chartPoints[0]).filter((k) => k !== "timestamp") : ["Sessions"];
        } else {
          chartPoints = [];
          seriesNames = ["Sessions"];
        }
        const chart = chartPoints.map((point) => ({
          ...point,
          time: formatChartTimestamp(point.timestamp, rangeHours)
        }));
        const chartData = {
          type: "chart",
          siteId,
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          chart,
          namesMap: seriesNames
        };
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(chartData)
            }
          ]
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
                isAuthError: errorMessage.includes("AUTH_ERROR")
              })
            }
          ],
          isError: true
        };
      }
    }
  );
  registerAppTool(
    server,
    "view_user_journey",
    {
      title: "OpenReplay User Journey",
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      description: "PREFERRED tool for showing user journey / path analysis as a Sankey flow diagram. Use this when the user asks about user journeys, navigation paths, drop-offs, funnels, user flows, where users go, or page transitions. Examples: 'where do users drop off', 'show me user journeys', 'what pages do users visit after /pricing'. You MUST convert time references to ISO date strings. Optionally specify a startPoint URL path to analyze journeys from a specific page, or leave it empty for the most common paths. Supports filtering by user attributes. Call get_available_filters to see available filters. TIP: Combine with view_table_chart, view_web_vitals, or view_funnel for deeper analysis. Use view_recent_sessions with the same filters to drill into related sessions.",
      inputSchema: ViewUserJourneySchema,
      _meta: {
        ui: {
          resourceUri,
          visibility: ["model"],
          csp: {
            connectDomains: uiConnectDomains()
          }
        },
        examples: [
          { description: "Where do users drop off after the pricing page last week", input: { startDate: "2026-04-21", endDate: "2026-04-28", projectName: "MyApp", startPoint: "/pricing" } },
          { description: "Show me user journeys this month", input: { startDate: "2026-04-01", endDate: "2026-04-28", projectName: "MyApp" } },
          { description: "What pages do users visit after /signup", input: { startDate: "2026-04-21", endDate: "2026-04-28", projectName: "MyApp", startPoint: "/signup" } },
          { description: "Navigation paths for mobile users from France this week", input: { startDate: "2026-04-21", endDate: "2026-04-28", siteId: "1", filters: [{ name: "userDeviceType", value: ["mobile"], operator: "is" }, { name: "userCountry", value: ["France"], operator: "is" }] } },
          { description: "User flow from /home for Chrome users last 30 days", input: { startDate: "2026-03-29", endDate: "2026-04-28", projectName: "MyApp", startPoint: "/home", filters: [{ name: "userBrowser", value: ["Chrome"], operator: "is" }] } }
        ]
      }
    },
    async (parsed) => {
      console.error("[SERVER] view_user_journey tool CALLED!");
      console.error("[SERVER] Arguments:", JSON.stringify(parsed, null, 2));
      try {
        const siteId = await resolveSiteId(parsed);
        const { startTs, endTs } = parseDateRange(parsed.startDate, parsed.endDate);
        const resolvedFilters = await resolveFilters(siteId, parsed.filters ?? []);
        let data = await fetchPathAnalysis(siteId, startTs, endTs, parsed.startPoint, resolvedFilters);
        if (data?.series && typeof data.series === "object" && !data.nodes) {
          const firstSeries = Object.values(data.series)[0];
          if (firstSeries?.nodes) data = firstSeries;
        }
        const nodes = data.nodes || [];
        const links = data.links || [];
        const startingNode = nodes.find((n) => n.startingNode);
        const dropLinks = links.filter((l) => {
          const target = nodes.find((n) => n.id === l.target);
          return target?.eventType === "DROP";
        }).sort((a, b) => b.sessionsCount - a.sessionsCount);
        const depth1Links = links.filter((l) => {
          const target = nodes.find((n) => n.id === l.target);
          return target && target.depth === 1 && target.eventType === "LOCATION";
        }).sort((a, b) => b.sessionsCount - a.sessionsCount);
        const topDestinations = depth1Links.slice(0, 5).map((l) => {
          const target = nodes.find((n) => n.id === l.target);
          return { path: target?.name, sessions: l.sessionsCount, percentage: l.value };
        });
        const summary = {
          startPoint: startingNode?.name || parsed.startPoint || "auto (most popular)",
          totalNodes: nodes.length,
          totalLinks: links.length,
          topDropOff: dropLinks[0] ? {
            sessions: dropLinks[0].sessionsCount,
            percentage: dropLinks[0].value
          } : null,
          topDestinations
        };
        const response = {
          type: "user_journey",
          siteId,
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          startPoint: parsed.startPoint || null,
          summary,
          nodes,
          links
        };
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response)
            }
          ]
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
                isAuthError: errorMessage.includes("AUTH_ERROR")
              })
            }
          ],
          isError: true
        };
      }
    }
  );
  registerAppTool(
    server,
    "view_web_vitals",
    {
      title: "OpenReplay Web Vitals",
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      description: "PREFERRED tool for showing Web Vitals performance metrics. Displays 6 core metrics: DOM Complete, TTFB (Time to First Byte), Speed Index, FCP (First Contentful Paint), LCP (Largest Contentful Paint), CLS (Cumulative Layout Shift). Use this when the user asks about performance, page speed, web vitals, loading times, core web vitals, or site performance. Shows median (P50) values with good/medium/bad status. You MUST convert time references to ISO date strings. Supports filtering by user attributes. TIP: Combine with view_chart for trends, view_table_chart for breakdowns, or view_funnel for conversion analysis. Use view_recent_sessions with the same filters to drill into related sessions.",
      inputSchema: ViewWebVitalsSchema,
      _meta: {
        ui: {
          resourceUri,
          visibility: ["model"],
          csp: {
            connectDomains: uiConnectDomains()
          }
        },
        examples: [
          { description: "Show me web vitals for this week", input: { startDate: "2026-04-03", endDate: "2026-04-10", projectName: "MyApp" } },
          { description: "How is my site performance past month", input: { startDate: "2026-03-10", endDate: "2026-04-10", projectName: "MyApp" } },
          { description: "Core web vitals for mobile users", input: { startDate: "2026-04-01", endDate: "2026-04-10", projectName: "MyApp", filters: [{ name: "userDeviceType", value: ["mobile"], operator: "is" }] } },
          { description: "Web vitals for Safari users in Germany or France last 30 days", input: { startDate: "2026-03-11", endDate: "2026-04-10", siteId: "1", filters: [{ name: "userBrowser", value: ["Safari"], operator: "is" }, { name: "userCountry", value: ["Germany", "France"], operator: "is" }] } },
          { description: "Performance metrics for Chrome on Windows of the user tahay@asyer.io", input: { startDate: "2026-04-01", endDate: "2026-04-10", projectName: "MyApp", filters: [{ name: "userBrowser", value: ["Chrome"], operator: "is" }, { name: "userOs", value: ["Windows"], operator: "is" }, { name: "userId", value: ["tahay@asayer.io"], operator: "is" }] } }
        ]
      }
    },
    async (parsed) => {
      console.error("[SERVER] view_web_vitals tool CALLED!");
      console.error("[SERVER] Arguments:", JSON.stringify(parsed, null, 2));
      try {
        const siteId = await resolveSiteId(parsed);
        const { startTs, endTs } = parseDateRange(parsed.startDate, parsed.endDate);
        const resolvedFilters = await resolveFilters(siteId, parsed.filters ?? []);
        const data = await fetchWebVitals(siteId, startTs, endTs, resolvedFilters);
        const metrics = ["domBuildingTime", "ttfb", "speedIndex", "firstContentfulPaintTime", "lcp", "cls"];
        const metricNames = {
          domBuildingTime: "DOM Complete",
          ttfb: "TTFB",
          speedIndex: "Speed Index",
          firstContentfulPaintTime: "FCP",
          lcp: "LCP",
          cls: "CLS"
        };
        const summaryLines = metrics.map((key) => {
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
                summary: summaryLines.join("\n")
              })
            }
          ]
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
                isAuthError: errorMessage.includes("AUTH_ERROR")
              })
            }
          ],
          isError: true
        };
      }
    }
  );
  registerAppTool(
    server,
    "view_table_chart",
    {
      title: "OpenReplay Top Analytics",
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      description: "PREFERRED tool for showing ranked table/bar chart for 'top X' analytics. Use this when the user asks for top, most popular, distribution, or breakdown of any dimension. Supported metricOf values: 'LOCATION' (top pages), 'REQUEST' (top network requests), 'userId' (top users), 'userBrowser' (top browsers), 'userCountry' (top countries), 'userOs' (top OS), 'userDevice' (top devices). Examples: 'what are the top pages', 'show browser distribution', 'most popular countries'. You MUST convert time references to ISO date strings. Supports filtering by user attributes. TIP: Call this tool multiple times with different metricOf values for a comprehensive breakdown. Use view_recent_sessions with the same filters to drill into sessions related to this data.",
      inputSchema: ViewTableChartSchema,
      _meta: {
        ui: {
          resourceUri,
          visibility: ["model"],
          csp: {
            connectDomains: uiConnectDomains()
          }
        },
        examples: [
          { description: "What are the top visited pages this week", input: { startDate: "2026-04-07", endDate: "2026-04-10", metricOf: "LOCATION", projectName: "MyApp" } },
          { description: "Show browser distribution this month", input: { startDate: "2026-04-01", endDate: "2026-04-10", metricOf: "userBrowser", projectName: "MyApp" } },
          { description: "Most popular countries last 30 days", input: { startDate: "2026-03-11", endDate: "2026-04-10", metricOf: "userCountry", projectName: "MyApp" } },
          { description: "Top 5 network requests today", input: { startDate: "2026-04-10", endDate: "2026-04-10", metricOf: "REQUEST", projectName: "MyApp", limit: 5 } },
          { description: "Top OS for mobile users", input: { startDate: "2026-04-01", endDate: "2026-04-10", metricOf: "userOs", projectName: "MyApp", filters: [{ name: "userDeviceType", value: ["mobile"], operator: "is" }] } },
          { description: "Device breakdown for Chrome users in the US", input: { startDate: "2026-04-01", endDate: "2026-04-10", metricOf: "userDevice", siteId: "1", filters: [{ name: "userBrowser", value: ["Chrome"], operator: "is" }, { name: "userCountry", value: ["United States"], operator: "is" }] } }
        ]
      }
    },
    async (parsed) => {
      console.error("[SERVER] view_table_chart tool CALLED!");
      console.error("[SERVER] Arguments:", JSON.stringify(parsed, null, 2));
      try {
        const siteId = await resolveSiteId(parsed);
        const { startTs, endTs } = parseDateRange(parsed.startDate, parsed.endDate);
        const resolvedFilters = await resolveFilters(siteId, parsed.filters ?? []);
        const data = await fetchTableData(siteId, startTs, endTs, parsed.metricOf, parsed.limit, resolvedFilters);
        const titleMap = {
          LOCATION: "Top Pages",
          REQUEST: "Top Network Requests",
          userBrowser: "Top Browsers",
          userCountry: "Top Countries",
          userOs: "Top Operating Systems",
          userDevice: "Top Devices"
        };
        const title = titleMap[parsed.metricOf] || `Top ${parsed.metricOf}`;
        const values = data?.values || [];
        const summaryLines = values.slice(0, 10).map(
          (v, i) => `${i + 1}. ${v.name}: ${v.total} sessions`
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
                summary: summaryLines.join("\n")
              })
            }
          ]
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
                isAuthError: errorMessage.includes("AUTH_ERROR")
              })
            }
          ],
          isError: true
        };
      }
    }
  );
  registerAppTool(
    server,
    "view_funnel",
    {
      title: "OpenReplay Funnel Analysis",
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      description: "PREFERRED tool for showing step-by-step conversion funnels. Use this when the user asks about conversion rates, drop-off, funnel analysis, or how many users complete a multi-step flow. Steps can be URL paths (shorthand for LOCATION page-views), or any event from the project's events list \u2014 built-in autoCaptured events: LOCATION (page view), CLICK, INPUT (text input), ISSUE; or custom events (autoCaptured=false). For LOCATION the value is matched against urlPath; for CLICK/INPUT against label; for ISSUE against issue type id. Custom events are matched by event name only \u2014 no value needed. Discover available events via get_available_filters. Minimum 2 steps. You MUST convert time references to ISO date strings. TIP: Combine with view_user_journey to see where users actually go instead. Use view_recent_sessions with the same filters to drill into related sessions.",
      inputSchema: ViewFunnelSchema,
      _meta: {
        ui: {
          resourceUri,
          visibility: ["model"],
          csp: {
            connectDomains: uiConnectDomains()
          }
        },
        examples: [
          { description: "Show me the checkout funnel last week", input: { startDate: "2026-04-21", endDate: "2026-04-28", steps: ["/cart", "/checkout", "/confirm"], projectName: "MyApp" } },
          { description: "Conversion from /pricing to /signup", input: { startDate: "2026-04-21", endDate: "2026-04-28", steps: ["/pricing", "/signup"], projectName: "MyApp" } },
          { description: "Onboarding funnel for mobile users this month", input: { startDate: "2026-04-01", endDate: "2026-04-28", steps: ["/welcome", "/profile", "/setup", "/dashboard"], projectName: "MyApp", filters: [{ name: "userDeviceType", value: ["mobile"], operator: "is" }] } },
          { description: "Visited /pricing then clicked Subscribe", input: { startDate: "2026-04-01", endDate: "2026-04-28", steps: ["/pricing", { type: "CLICK", value: "Subscribe" }], projectName: "MyApp" } },
          { description: "Sign-up flow ending in custom 'dashboard_list_viewed' event", input: { startDate: "2026-04-01", endDate: "2026-04-28", steps: ["/sessions", { type: "dashboard_list_viewed" }], projectName: "MyApp" } },
          { description: "Search input then click Result", input: { startDate: "2026-04-01", endDate: "2026-04-28", steps: [{ type: "INPUT", value: "Search", operator: "contains" }, { type: "CLICK", value: "Result" }], projectName: "MyApp" } },
          { description: "Page view followed by JS exception", input: { startDate: "2026-04-01", endDate: "2026-04-28", steps: ["/checkout", { type: "ISSUE", value: "js_exception" }], projectName: "MyApp" } }
        ]
      }
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
        if (data?.series && typeof data.series === "object" && !Array.isArray(data.series)) {
          const firstSeries = Object.values(data.series)[0];
          if (firstSeries?.stages) {
            data = firstSeries;
          } else if (firstSeries?.$overall?.stages) {
            data = firstSeries.$overall;
          }
        }
        const stepLabel = (s) => {
          if (typeof s === "string") return s;
          return s.value ? `${s.type} "${s.value}"` : s.type;
        };
        const stages = data?.stages || [];
        const firstCount = stages[0]?.count || 0;
        const summaryLines = stages.map((stage, i) => {
          const label = stage.value?.[0] || stepLabel(parsed.steps[i]) || `Step ${i + 1}`;
          const pctOfFirst = firstCount > 0 ? (stage.count / firstCount * 100).toFixed(1) : "0";
          const dropInfo = stage.dropPct != null ? ` (${stage.dropPct.toFixed(1)}% dropped)` : "";
          return `Step ${i + 1} "${label}": ${stage.count} sessions (${pctOfFirst}% of start)${dropInfo}`;
        });
        const lastCount = stages[stages.length - 1]?.count || 0;
        const overallConversion = firstCount > 0 ? (lastCount / firstCount * 100).toFixed(1) : "0";
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
                summary: summaryLines.join("\n")
              })
            }
          ]
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
                isAuthError: errorMessage.includes("AUTH_ERROR")
              })
            }
          ],
          isError: true
        };
      }
    }
  );
  registerAppTool(
    server,
    "view_session_replay",
    {
      title: "Session Replay",
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      description: "View a session replay with full DOM reconstruction. Provide a sessionId from a previous session list or search. Use this when the user wants to watch or replay a specific session. The user may refer to a session by its position in a previously fetched list. After showing the replay, try to provide session analysis based on data you have and let the user know they can also open this session directly in the full OpenReplay UI in their browser via a direct link.",
      inputSchema: ViewSessionReplaySchema,
      _meta: {
        ui: {
          resourceUri,
          visibility: ["model", "app"]
        },
        examples: [
          { description: "Replay a session by ID in MyApp", input: { sessionId: "7891234567890", projectName: "MyApp" } },
          { description: "Show me the replay of the second session (use sessionId from previous list)", input: { sessionId: "7891234567890", siteId: "1" } },
          { description: "Watch the last session shown in the list", input: { sessionId: "7891234567890", siteId: "1" } }
        ]
      }
    },
    async (parsed) => {
      console.error("[SERVER] view_session_replay tool CALLED!");
      console.error("[SERVER] Arguments:", JSON.stringify(parsed, null, 2));
      try {
        if (!state.jwt) {
          return {
            content: [{ type: "text", text: JSON.stringify({ type: "error", error: "Not authenticated", isAuthError: true }) }],
            isError: true
          };
        }
        const siteId = await resolveSiteId(parsed);
        console.error(`[SERVER] Fetching replay metadata for session ${parsed.sessionId}...`);
        const replay = await fetchSessionReplay(siteId, parsed.sessionId);
        if (isMobilePlatform(replay.platform)) {
          const sessionUrl = `${state.appUrl}/${siteId}/session/${parsed.sessionId}`;
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                type: "error",
                error: `This is a ${replay.platform} session. The embedded player only supports web recordings \u2014 open it in the OpenReplay UI instead: ${sessionUrl}`
              })
            }],
            isError: true
          };
        }
        const fileUrls = replay.domURL || [];
        if (!fileUrls.length) {
          return {
            content: [{ type: "text", text: JSON.stringify({ type: "error", error: "No recording files found for this session" }) }],
            isError: true
          };
        }
        console.error(`[SERVER] Found ${fileUrls.length} mob file(s), platform: ${replay.platform || "web"}`);
        allowMobUrls(fileUrls);
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
          trackerVersion: replay.trackerVersion
        };
        return {
          content: [{ type: "text", text: JSON.stringify(result) }]
        };
      } catch (err) {
        console.error("[SERVER] view_session_replay error:", err);
        const isAuthError = err.message?.includes("AUTH_ERROR");
        return {
          content: [{ type: "text", text: JSON.stringify({ type: "error", error: err.message || "Unknown error", isAuthError }) }],
          isError: true
        };
      }
    }
  );
}
function registerInternalTools(server) {
  registerAppTool(
    server,
    "_refresh_replay_urls",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      description: "Re-fetch signed mob file URLs for a session replay (internal use by UI only)",
      inputSchema: RefreshReplayUrlsSchema,
      _meta: { ui: { visibility: ["app"] } }
    },
    async (args) => {
      try {
        if (!state.jwt) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "Not authenticated" }) }],
            isError: true
          };
        }
        const sessionId = args.sessionId;
        let siteId = args.siteId;
        if (!siteId) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "No siteId available" }) }],
            isError: true
          };
        }
        console.error(`[SERVER] _refresh_replay_urls: fetching for session ${sessionId}...`);
        const replay = await fetchSessionReplay(siteId, sessionId);
        if (isMobilePlatform(replay.platform)) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Unsupported platform for embedded replay: ${replay.platform}` }) }],
            isError: true
          };
        }
        const fileUrls = replay.domURL || [];
        if (!fileUrls.length) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "No recording files found" }) }],
            isError: true
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
              trackerVersion: replay.trackerVersion
            })
          }]
        };
      } catch (err) {
        console.error(`[SERVER] _refresh_replay_urls error:`, err);
        return {
          content: [{ type: "text", text: JSON.stringify({ error: err.message }) }],
          isError: true
        };
      }
    }
  );
  registerAppTool(
    server,
    "_fetch_mob_file",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      description: "Fetch a mob file by URL and return base64 (internal use by UI only)",
      inputSchema: FetchUrlSchema,
      _meta: { ui: { visibility: ["app"] } }
    },
    async (args) => {
      let url;
      try {
        url = assertFetchableMobUrl(args.url);
      } catch (err) {
        return {
          content: [{ type: "text", text: JSON.stringify({ code: "invalid_url", error: err.message }) }],
          isError: true
        };
      }
      console.error(`[SERVER] _fetch_mob_file: fetching ${url.slice(0, 80)}...`);
      try {
        const bytes = await fetchCapped(url, MAX_MOB_FILE_BYTES);
        console.error(`[SERVER] _fetch_mob_file: fetched ${Math.floor(bytes.byteLength / 1024)}kb`);
        return {
          content: [{ type: "text", text: Buffer.from(bytes).toString("base64") }]
        };
      } catch (err) {
        console.error(`[SERVER] _fetch_mob_file error:`, err);
        const expired = /HTTP 40[13]/.test(err.message ?? "");
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ code: expired ? "expired" : "fetch_failed", error: err.message })
          }],
          isError: true
        };
      }
    }
  );
  registerAppTool(
    server,
    "_fetch_css",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
      description: "Fetch an external stylesheet by URL and return base64 (internal use by UI only)",
      inputSchema: FetchUrlSchema,
      _meta: { ui: { visibility: ["app"] } }
    },
    async (args) => {
      let url;
      try {
        url = await assertProxyableCssUrl(args.url);
      } catch (err) {
        return {
          content: [{ type: "text", text: JSON.stringify({ code: "invalid_url", error: err.message }) }],
          isError: true
        };
      }
      try {
        const bytes = await fetchCapped(url, MAX_CSS_BYTES);
        return {
          content: [{ type: "text", text: Buffer.from(bytes).toString("base64") }]
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: JSON.stringify({ code: "fetch_failed", error: err.message }) }],
          isError: true
        };
      }
    }
  );
  server.registerTool(
    "fetch_chart_data",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      description: "Fetch chart data from OpenReplay API",
      inputSchema: FetchChartDataSchema
    },
    async (parsed) => {
      console.error("[SERVER] fetch_chart_data called:", parsed);
      if (!state.jwt) {
        throw new Error("Not authenticated. Please login first.");
      }
      let endpoint = parsed.endpoint;
      if (parsed.params) {
        const entries = Object.entries(parsed.params).map(
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
            text: JSON.stringify(data, null, 2)
          }
        ]
      };
    }
  );
  server.registerTool(
    "get_auth_status",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      description: "Check current authentication status"
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
              user: state.userData
            }, null, 2)
          }
        ]
      };
    }
  );
  server.registerTool(
    "list_projects",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      description: "Fetch and list all available OpenReplay projects. This saves the projects to context so you can reference them by name in subsequent requests."
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
              projects: projects.map((p) => ({
                name: p.name,
                projectId: p.projectId
              }))
            }, null, 2)
          }
        ]
      };
    }
  );
  server.registerTool(
    "get_session_details",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      description: "Get detailed information about a specific session including metadata and events. Fetches both session replay metadata (user info, device, location, timing) and session events (errors, clicks, page visits, custom events, issues). Use this after view_recent_sessions to investigate a particular session. The user may refer to a session by its position in a previously fetched list (e.g. 'tell me about the second session', 'details on the last one') \u2014 in that case, pick the corresponding sessionId and siteId from the earlier results in context. The user may also provide a sessionId directly. Returns structured data with a summary section first, followed by full replay metadata and events breakdown.",
      inputSchema: GetSessionDetailsSchema,
      _meta: {
        examples: [
          { description: "Tell me about this session ID in MyApp", input: { sessionId: "7891234567890", projectName: "MyApp" } },
          { description: "Details on the second session from previous list (use sessionId from list)", input: { sessionId: "7891234567890", siteId: "1" } },
          { description: "What happened in the last session", input: { sessionId: "7891234567890", siteId: "1" } }
        ]
      }
    },
    async (parsed) => {
      console.error("[SERVER] get_session_details called:", parsed);
      if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
      }
      const siteId = await resolveSiteId(parsed);
      const [replay, events] = await Promise.all([
        fetchSessionReplay(siteId, parsed.sessionId),
        fetchSessionEvents(siteId, parsed.sessionId)
      ]);
      const eventsSummary = {
        errors: Array.isArray(events.errors) ? events.errors.length : 0,
        events: Array.isArray(events.events) ? events.events.length : 0,
        incidents: Array.isArray(events.incidents) ? events.incidents.length : 0,
        issues: Array.isArray(events.issues) ? events.issues.length : 0,
        userEvents: Array.isArray(events.userEvents) ? events.userEvents.length : 0
      };
      const baseUrl = state.appUrl.replace(/\/+$/, "");
      const replayUrl = `${baseUrl}/${siteId}/session/${parsed.sessionId}`;
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
          eventsCounts: eventsSummary
        },
        replay,
        events
      };
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    }
  );
  server.registerTool(
    "get_available_filters",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      description: "Get the list of available filters for a project. Call this before applying filters to data tools (view_recent_sessions, view_chart, view_user_journey, view_funnel, ...) to discover valid filter names and their possible values. Returns filter names, display names, data types, and sample values. Filters are split into: 'events' (e.g. CLICK, LOCATION, REQUEST \u2014 these accept 'properties' sub-filters), 'eventProperties' (valid 'name' values inside an event filter's 'properties' array, e.g. urlPath, label, status), 'attributes' (flat session/user filters like userCountry, userBrowser), 'segments' (saved user segments) and 'features' (tagged elements), which are used by name alone. Country values can be full names ('France'); numeric properties (status, duration) take numbers.",
      inputSchema: ProjectSchema,
      _meta: {
        examples: [
          { description: "What filters are available for MyApp", input: { projectName: "MyApp" } },
          { description: "List filters for project 1", input: { siteId: "1" } }
        ]
      }
    },
    async (args) => {
      console.error("[SERVER] get_available_filters called:", args);
      if (!state.jwt) {
        throw new Error("AUTH_ERROR: Not authenticated");
      }
      const siteId = await resolveSiteId(args);
      const filterData = await getOrFetchFilters(siteId);
      const events = [];
      const eventProperties = [];
      const attributes = [];
      const segments = [];
      const features = [];
      const buildEntry = (filter, categoryDisplayName) => {
        const entry = {
          name: filter.name,
          displayName: filter.displayName || filter.name,
          category: categoryDisplayName,
          dataType: filter.dataType
        };
        if (filter.possibleValues?.length) {
          entry.possibleValues = filter.possibleValues.slice(0, 20);
          if (filter.possibleValues.length > 20) {
            entry.totalValues = filter.possibleValues.length;
          }
        }
        return entry;
      };
      for (const [categoryName, category] of Object.entries(filterData)) {
        if (!category?.list) continue;
        const categoryDisplayName = category.displayName || categoryName;
        const bucket = categoryName === "events" ? events : categoryName === "event" ? eventProperties : categoryName === "segments" ? segments : categoryName === "features" ? features : attributes;
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
              usage: "Use 'events' names as top-level filter `name` (with optional `properties` sub-filters drawn from 'eventProperties'). Use 'attributes' names as flat filters with a `value` array. Use a 'segments' (saved user segment) or 'features' (tagged element) name as a filter `name` on its own, with no `value`.",
              events,
              eventProperties,
              attributes,
              segments,
              features
            }, null, 2)
          }
        ]
      };
    }
  );
  server.registerTool(
    "fetch_events",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      description: "Fetch recent tracked events (pageviews, clicks, custom events, errors) from the analytics data pipeline. Returns event name, timestamp, user ID, session ID, city, OS, and whether it was auto-captured. Use this to understand what events are being tracked, investigate specific event types, or get a feed of recent user activity. Supports date range and pagination.",
      inputSchema: FetchEventsSchema,
      _meta: {
        examples: [
          { description: "Recent events for MyApp (last 24h, default)", input: { projectName: "MyApp" } },
          { description: "Events from yesterday", input: { projectName: "MyApp", startDate: "2026-04-27", endDate: "2026-04-28" } },
          { description: "Last 100 events this week", input: { projectName: "MyApp", startDate: "2026-04-21", endDate: "2026-04-28", limit: 100 } },
          { description: "Page 2 of recent events", input: { projectName: "MyApp", page: 2 } }
        ]
      }
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
            events: data.events
          }, null, 2)
        }]
      };
    }
  );
  server.registerTool(
    "fetch_users",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      description: "Fetch tracked users from the analytics data pipeline. Returns user ID, name, email, location, last seen, and custom properties. Use this to understand who your users are, search for specific users, or get a list of recently active users. Supports search query and pagination.",
      inputSchema: FetchUsersSchema,
      _meta: {
        examples: [
          { description: "List recent users for MyApp", input: { projectName: "MyApp" } },
          { description: "Find users with email containing 'tahay'", input: { projectName: "MyApp", query: "tahay" } },
          { description: "Users active in the last 30 days", input: { projectName: "MyApp", startDate: "2026-03-29", endDate: "2026-04-28" } },
          { description: "Search for users named John, 100 per page", input: { projectName: "MyApp", query: "John", limit: 100 } }
        ]
      }
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
            users: data.users
          }, null, 2)
        }]
      };
    }
  );
  server.registerTool(
    "search_docs",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
      description: "ALWAYS use this tool when the user asks any question about OpenReplay itself \u2014 how features work, SDK setup and methods, deployment, integrations, plugins, configuration, data sanitization/privacy, troubleshooting, plans/pricing, billing, or anything else covered by the public OpenReplay documentation. Examples: 'how do I install the React SDK', 'what's the difference between cloud and self-hosted', 'how do I redact sensitive data', 'how do I deploy on Kubernetes', 'how do funnels work'. Pass the user's question or relevant keywords as `query`. Returns matching sections from the OpenReplay docs (sourced from llms-full.txt), each containing a description and a link to the corresponding page on docs.openreplay.com that you can cite to the user.",
      inputSchema: SearchDocsSchema,
      _meta: {
        examples: [
          { description: "How do I install the React SDK", input: { query: "react sdk install" } },
          { description: "How do I deploy on AWS", input: { query: "deploy aws ec2" } },
          { description: "How to redact sensitive data", input: { query: "data sanitization privacy redact" } },
          { description: "What is the difference between cloud and self-hosted", input: { query: "cloud self-hosted difference" } },
          { description: "How do funnels work in product analytics", input: { query: "funnels conversion product analytics" } }
        ]
      }
    },
    async (args) => {
      console.error("[SERVER] search_docs called:", args);
      const query = args.query;
      let indexContent;
      try {
        indexContent = await getOpenReplayDocsIndex();
      } catch (err) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: err.message || "Failed to fetch docs index" }) }],
          isError: true
        };
      }
      if (!query) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              type: "docs_index",
              hint: "Pass a `query` to filter to relevant sections.",
              content: indexContent
            })
          }]
        };
      }
      const sections = indexContent.split(/(?=^## )/m).filter((s) => s.trim().length > 0);
      const queryTerms = query.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !DOCS_STOP_WORDS.has(t));
      const allTerms = queryTerms.length > 0 ? queryTerms : [query.toLowerCase()];
      const scored = sections.map((section) => {
        const lower = section.toLowerCase();
        let score = 0;
        for (const term of allTerms) {
          score += lower.split(term).length - 1;
        }
        return { section, score };
      }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
      const top = scored.slice(0, 6).map((x) => x.section);
      const result = top.length > 0 ? top.join("\n\n") : indexContent;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            type: "docs_search",
            query,
            matchedSections: scored.length,
            returnedSections: top.length,
            hint: top.length === 0 ? "No section matched the query; returning the full docs index. Try a more specific query or cite the index links directly." : "Each section includes a docs.openreplay.com link you can cite to the user.",
            content: result.slice(0, 4e4)
          })
        }]
      };
    }
  );
}
function registerLocalAuthTools(server) {
  server.registerTool(
    "configure_backend",
    {
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      description: "Configure the OpenReplay instance URL. Pass the URL the user types into their browser; the API host is derived automatically (api.openreplay.com for SaaS, <host>/api otherwise).",
      inputSchema: ConfigureBackendSchema,
      _meta: {
        examples: [
          { description: "Use OpenReplay Cloud", input: { appUrl: "https://app.openreplay.com" } },
          { description: "Use a self-hosted instance", input: { appUrl: "https://openreplay.mycompany.com" } }
        ]
      }
    },
    async (parsed) => {
      console.error("[SERVER] configure_backend called:", parsed);
      const switched = await setAppUrl(assertHttpsUrl(parsed.appUrl));
      return {
        content: [
          {
            type: "text",
            text: `OpenReplay URL configured: ${state.appUrl}` + (switched ? ". Signed out of the previous instance \u2014 log in again with login_browser." : "")
          }
        ]
      };
    }
  );
  server.registerTool(
    "login_jwt",
    {
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      description: "Authenticate with OpenReplay using a JWT token (for testing).",
      inputSchema: LoginJwtSchema
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
            text: "Successfully authenticated with JWT token"
          }
        ]
      };
    }
  );
  server.registerTool(
    "login_browser",
    {
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      description: "PREFERRED login method. RETURNS IMMEDIATELY with an authorize URL \u2014 show the URL to the user and ask them to open it in their browser and click 'Authorize' in the OpenReplay tab, then call complete_login to finish the flow. Use this whenever the user needs to log in. The only alternative is login_jwt for a raw token. Logs in to the configured instance; call configure_backend first only if the user explicitly names a different one."
    },
    async () => {
      const appUrl2 = assertHttpsUrl(state.appUrl);
      const authCode = generateAuthCode();
      state.pendingAuthCode = authCode;
      const authorizeUrl = `${appUrl2}/mcp/authorize?state=${authCode}&client_id=${state.clientId}&app_name=${encodeURIComponent("OpenReplay MCP")}`;
      console.error(`[SERVER] login_browser: authorize URL ${authorizeUrl}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              type: "auth_pending",
              authorizeUrl,
              state: authCode,
              appUrl: appUrl2,
              message: "Share this authorize URL with the user and ask them to open it in their browser and click 'Authorize'. Then call complete_login to finish."
            })
          }
        ]
      };
    }
  );
  server.registerTool(
    "complete_login",
    {
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
      description: "Finalize browser-based login started by login_browser. Polls OpenReplay for approval. Call this AFTER the user confirms they clicked 'Authorize' in the browser. Returns auth_success on approval, or auth_pending if not yet approved (call again to keep waiting).",
      inputSchema: CompleteLoginSchema
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
                error: "No pending login. Call login_browser first to start the flow."
              })
            }
          ],
          isError: true
        };
      }
      const timeoutMs = parsed.timeoutMs ?? 6e4;
      console.error(`[SERVER] complete_login: polling for state=${authCode} timeoutMs=${timeoutMs}`);
      const result = await pollForAuth(state.appUrl, authCode, state.clientId, timeoutMs);
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
                message: "Still waiting for approval. summary.statusCounts shows the HTTP statuses observed across all polls. If every attempt is 4xx/5xx, the backend isn't storing the authorization \u2014 check the OpenReplay UI's network tab when clicking 'Authorize'. Otherwise call complete_login again to keep waiting."
              })
            }
          ]
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
              durationMs: result.durationMs
            })
          }
        ]
      };
    }
  );
  server.registerTool(
    "logout",
    {
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
      description: "Clear authentication and remove persisted token"
    },
    async () => {
      console.error("[SERVER] logout called");
      state.jwt = null;
      state.userData = null;
      clearInstanceCaches();
      await clearPersistedState();
      return {
        content: [
          {
            type: "text",
            text: "Successfully logged out"
          }
        ]
      };
    }
  );
}
var MAX_AGENT_PAGE = 100;
var clampLimit = (n, max = MAX_AGENT_PAGE) => Math.min(Math.max(Math.floor(n), 1), max);
var jsonResult = (data) => ({ content: [{ type: "text", text: JSON.stringify(data) }] });
function registerAgentTools(server) {
  server.registerTool(
    "list_smart_issues",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      description: "List Smart Issues: problems OpenReplay's AI agent found by watching session replays (errors, UI/UX friction, slowness), ranked by impact. Returns issue ids, impact, affected sessions, labels and links. Defaults to the last 7 days. Use get_smart_issue for an issue's description and example sessions.",
      inputSchema: ListSmartIssuesSchema
    },
    async (args) => {
      console.error("[SERVER] list_smart_issues called:", args);
      const siteId = await resolveSiteId(args);
      const { startTs, endTs } = parseDateRange(args.startDate, args.endDate, 7 * DAY_MS);
      const limit = clampLimit(args.limit);
      const data = await fetchSmartIssues(siteId, {
        range: [startTs, endTs],
        limit,
        page: args.page,
        sortBy: args.sortBy,
        visibility: args.visibility,
        query: args.query,
        category: args.category,
        critical: args.critical
      });
      return jsonResult({
        siteId,
        range: { start: new Date(startTs).toISOString(), end: new Date(endTs).toISOString() },
        page: args.page,
        limit,
        ...data
      });
    }
  );
  server.registerTool(
    "get_smart_issue",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      description: "Get one Smart Issue: its description plus example sessions, each with a journey summary, steps, the moment the issue happened (issueAtMs from session start) and a replay link. Pass a sessionId to view_session_replay to play it inline.",
      inputSchema: GetSmartIssueSchema
    },
    async (args) => {
      console.error("[SERVER] get_smart_issue called:", args);
      const siteId = await resolveSiteId(args);
      const { startTs, endTs } = parseDateRange(args.startDate, args.endDate, 7 * DAY_MS);
      const data = await fetchSmartIssue(siteId, args.issueId, [startTs, endTs], {
        limit: clampLimit(args.sessionsLimit, 50),
        query: args.sessionQuery
      });
      return jsonResult({
        siteId,
        range: { start: new Date(startTs).toISOString(), end: new Date(endTs).toISOString() },
        ...data
      });
    }
  );
  server.registerTool(
    "list_smart_tests",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      description: "List Smart Tests: AI-driven browser tests that run written scenarios against the user's site, manually or on a cron schedule. Returns status, schedule, environments, last/next run and links. Use get_smart_test for steps and recent runs.",
      inputSchema: ListSmartTestsSchema
    },
    async (args) => {
      console.error("[SERVER] list_smart_tests called:", args);
      const siteId = await resolveSiteId(args);
      const limit = clampLimit(args.limit);
      const data = await fetchSmartTests(siteId, {
        limit,
        page: args.page,
        name: args.name,
        status: args.status,
        tags: args.tags,
        needsReview: args.needsReview
      });
      return jsonResult({ siteId, page: args.page, limit, ...data });
    }
  );
  server.registerTool(
    "get_smart_test",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      description: "Get one Smart Test: scenario, steps, expected result, environments and its most recent runs.",
      inputSchema: GetSmartTestSchema
    },
    async (args) => {
      console.error("[SERVER] get_smart_test called:", args);
      const siteId = await resolveSiteId(args);
      const data = await fetchSmartTest(siteId, args.testId, clampLimit(args.runsLimit, 50));
      return jsonResult({ siteId, ...data });
    }
  );
  server.registerTool(
    "list_smart_test_runs",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      description: "List Smart Test runs, newest first, across the project or for one test. Filter by status to find failures. Use get_smart_test_run for step-by-step results.",
      inputSchema: ListSmartTestRunsSchema
    },
    async (args) => {
      console.error("[SERVER] list_smart_test_runs called:", args);
      const siteId = await resolveSiteId(args);
      const limit = clampLimit(args.limit);
      let from;
      let to;
      if (args.startDate || args.endDate) {
        const { startTs, endTs } = parseDateRange(args.startDate, args.endDate, 7 * DAY_MS);
        from = new Date(startTs).toISOString();
        to = new Date(endTs).toISOString();
      }
      const data = await fetchSmartTestRuns(siteId, {
        limit,
        page: args.page,
        testId: args.testId,
        status: args.status,
        name: args.name,
        from,
        to
      });
      return jsonResult({ siteId, page: args.page, limit, ...data });
    }
  );
  server.registerTool(
    "get_smart_test_run",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      description: "Get one Smart Test run: the runner's summary, per-step results with the agent's actions, the failing step and its error, JS errors and failed network requests.",
      inputSchema: GetSmartTestRunSchema
    },
    async (args) => {
      console.error("[SERVER] get_smart_test_run called:", args);
      const siteId = await resolveSiteId(args);
      const data = await fetchSmartTestRun(siteId, args.runId);
      return jsonResult({ siteId, run: data });
    }
  );
  server.registerTool(
    "trigger_smart_test_run",
    {
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
      description: "Start a Smart Test run now. It drives a real browser against the live site, and tests with hasSideEffects create real data (orders, accounts, payments), so only call this when the user asked for a run. Returns on dispatch; follow up with list_smart_test_runs filtered by testId.",
      inputSchema: TriggerSmartTestRunSchema
    },
    async (args) => {
      console.error("[SERVER] trigger_smart_test_run called:", args);
      const siteId = await resolveSiteId(args);
      const result = await triggerSmartTestRun(siteId, args.testId);
      return jsonResult({ siteId, testId: args.testId, status: result?.status ?? "dispatched" });
    }
  );
}

// lib/server.ts
var __dirname = import.meta.dirname ?? path3.dirname(fileURLToPath2(import.meta.url));
var DIST_DIR = path3.join(__dirname, "..", "dist");
var RESOURCE_URI = "ui://openreplay/app";
function createServer({ mode, widgetDomain: widgetDomain2 }) {
  const server = new McpServer({
    name: "openreplay-mcp-app",
    version: APP_VERSION
  });
  registerUITools(server, RESOURCE_URI);
  registerInternalTools(server);
  if (mode === "stdio") registerLocalAuthTools(server);
  registerAgentTools(server);
  registerAppResource(
    server,
    RESOURCE_URI,
    RESOURCE_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => ({
      contents: [{
        uri: RESOURCE_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: await fs2.readFile(path3.join(DIST_DIR, "index.html"), "utf-8"),
        _meta: {
          ui: {
            csp: {
              connectDomains: uiConnectDomains()
            }
          },
          ...widgetDomain2 ? { "openai/widgetDomain": widgetDomain2 } : {}
        }
      }]
    })
  );
  return server;
}

// lib/oauth.ts
import crypto2 from "node:crypto";
import {
  buildOAuthProtectedResourceMetadata,
  OAuthError,
  OAuthErrorCode
} from "@modelcontextprotocol/server";
var REQUEST_TTL_S = 15 * 60;
var CODE_TTL_S = 120;
var FALLBACK_TOKEN_TTL_S = 7 * 24 * 3600;
var now = () => Math.floor(Date.now() / 1e3);
var b64url = (buf) => buf.toString("base64url");
var sha256 = (s) => b64url(crypto2.createHash("sha256").update(s).digest());
var randomHex = (bytes) => crypto2.randomBytes(bytes).toString("hex");
function createSealer(secret2) {
  const keys = new Map(
    ["client", "request", "code", "access"].map((p) => [
      p,
      Buffer.from(crypto2.hkdfSync("sha256", secret2, "openreplay-mcp-oauth", p, 32))
    ])
  );
  return {
    seal(purpose, payload) {
      const iv = crypto2.randomBytes(12);
      const cipher = crypto2.createCipheriv("aes-256-gcm", keys.get(purpose), iv);
      const ct = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
      return b64url(Buffer.concat([iv, cipher.getAuthTag(), ct]));
    },
    unseal(purpose, token) {
      if (!token) return null;
      try {
        const raw = Buffer.from(token, "base64url");
        if (raw.length < 29) return null;
        const decipher = crypto2.createDecipheriv("aes-256-gcm", keys.get(purpose), raw.subarray(0, 12));
        decipher.setAuthTag(raw.subarray(12, 28));
        const payload = JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8"));
        if (payload.exp !== void 0 && payload.exp < now()) return null;
        return payload;
      } catch {
        return null;
      }
    }
  };
}
function jwtExp(jwt) {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1] ?? "", "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}
var sameUrl = (a, b) => a.replace(/\/$/, "") === b.replace(/\/$/, "");
var isLoopback = (host) => host === "localhost" || host === "127.0.0.1" || host === "[::1]";
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version"
};
function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS, ...headers }
  });
}
var oauthError = (error, description, status = 400) => json({ error, error_description: description }, status);
var page = (message, status = 400) => new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
function createOAuth(config) {
  const { seal, unseal } = createSealer(config.secret);
  const issuer = config.issuer.href.replace(/\/$/, "");
  const endpoint = (path4) => new URL(path4, config.issuer).href;
  const usedCodes = /* @__PURE__ */ new Map();
  const metadata = {
    issuer,
    authorization_endpoint: endpoint("/oauth/authorize"),
    token_endpoint: endpoint("/oauth/token"),
    registration_endpoint: endpoint("/oauth/register"),
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    authorization_response_iss_parameter_supported: true
  };
  const resourceMetadata = buildOAuthProtectedResourceMetadata({
    oauthMetadata: metadata,
    resourceServerUrl: config.resource,
    resourceName: "OpenReplay",
    dangerouslyAllowInsecureIssuerUrl: isLoopback(config.issuer.hostname)
  });
  function redirectAllowed(raw) {
    let u;
    try {
      u = new URL(raw);
    } catch {
      return false;
    }
    if (u.hash) return false;
    if (u.protocol === "http:") return isLoopback(u.hostname);
    if (u.protocol !== "https:") return false;
    return !config.redirectHosts || config.redirectHosts.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  }
  function redirectWith(redirectUri, params) {
    const u = new URL(redirectUri);
    for (const [k, v] of Object.entries(params)) if (v !== void 0) u.searchParams.set(k, v);
    u.searchParams.set("iss", issuer);
    return new Response(null, { status: 302, headers: { Location: u.href, "Cache-Control": "no-store" } });
  }
  async function register(request) {
    let body;
    try {
      body = await request.json();
    } catch {
      return oauthError("invalid_client_metadata", "Body must be JSON");
    }
    const uris = body?.redirect_uris;
    if (!Array.isArray(uris) || uris.length === 0 || uris.length > 10 || !uris.every((u) => typeof u === "string")) {
      return oauthError("invalid_client_metadata", "redirect_uris must be a non-empty array of URLs");
    }
    const rejected = uris.find((u) => !redirectAllowed(u));
    if (rejected) return oauthError("invalid_redirect_uri", `Redirect URI not allowed: ${rejected}`);
    const name = typeof body.client_name === "string" ? body.client_name.slice(0, 100) : void 0;
    const client = { ru: uris, ...name ? { n: name } : {} };
    return json({
      client_id: seal("client", client),
      client_id_issued_at: now(),
      redirect_uris: uris,
      ...name ? { client_name: name } : {},
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none"
    }, 201);
  }
  function authorize(url) {
    const q = url.searchParams;
    const clientId = q.get("client_id");
    const client = unseal("client", clientId);
    if (!client) return page("Unknown client. Remove the OpenReplay connection in your app and add it again.");
    const redirectUri = q.get("redirect_uri") ?? (client.ru.length === 1 ? client.ru[0] : null);
    if (!redirectUri || !client.ru.includes(redirectUri)) return page("The redirect URI is not registered for this client.");
    const state2 = q.get("state") ?? void 0;
    const fail = (error, description) => redirectWith(redirectUri, { error, error_description: description, state: state2 });
    if (q.get("response_type") !== "code") return fail("unsupported_response_type", "Only response_type=code is supported");
    const challenge = q.get("code_challenge");
    if (!challenge || q.get("code_challenge_method") !== "S256") return fail("invalid_request", "PKCE with S256 is required");
    const resource = q.get("resource");
    if (resource && !sameUrl(resource, config.resource.href)) return fail("invalid_target", "Unknown resource");
    const orClient = `oauth:${new URL(redirectUri).host}`;
    const orState = randomHex(32);
    const pending = {
      c: sha256(clientId),
      ru: redirectUri,
      cc: challenge,
      st: state2,
      os: orState,
      oc: orClient,
      exp: now() + REQUEST_TTL_S
    };
    const callback2 = new URL("/oauth/callback", config.issuer);
    callback2.searchParams.set("request", seal("request", pending));
    const approve = new URL(`${config.appUrl.replace(/\/+$/, "")}/mcp/authorize`);
    approve.searchParams.set("state", orState);
    approve.searchParams.set("client_id", orClient);
    approve.searchParams.set("app_name", client.n ?? orClient);
    approve.searchParams.set("redirect_uri", callback2.href);
    return new Response(null, { status: 302, headers: { Location: approve.href, "Cache-Control": "no-store" } });
  }
  async function callback(url) {
    const pending = unseal("request", url.searchParams.get("request"));
    if (!pending) return page("This sign-in link has expired. Start the connection again from your app.");
    const statusUrl = new URL(buildApiUrl(config.appUrl, "/v1/mcp/auth-status"));
    statusUrl.searchParams.set("client_id", pending.oc);
    statusUrl.searchParams.set("state", pending.os);
    let res;
    try {
      res = await fetch(statusUrl);
    } catch (err) {
      console.error("[OAUTH] auth-status unreachable:", err);
      return redirectWith(pending.ru, { error: "temporarily_unavailable", error_description: "OpenReplay is unreachable", state: pending.st });
    }
    const jwt = res.ok ? (await res.json().catch(() => null))?.jwt : null;
    if (typeof jwt !== "string" || !jwt) {
      console.error(`[OAUTH] auth-status ${res.status} for ${pending.oc}`);
      const description = res.status === 408 ? "Sign-in timed out" : "Access was not approved";
      return redirectWith(pending.ru, { error: "access_denied", error_description: description, state: pending.st });
    }
    const code = {
      c: pending.c,
      ru: pending.ru,
      cc: pending.cc,
      jwt,
      jti: randomHex(16),
      exp: now() + CODE_TTL_S
    };
    return redirectWith(pending.ru, { code: seal("code", code), state: pending.st });
  }
  async function token(request) {
    const type = request.headers.get("content-type") ?? "";
    let form;
    try {
      form = type.includes("application/json") ? new URLSearchParams(Object.entries(await request.json()).map(([k, v]) => [k, String(v)])) : new URLSearchParams(await request.text());
    } catch {
      return oauthError("invalid_request", "Unreadable request body");
    }
    if (form.get("grant_type") !== "authorization_code") {
      return oauthError("unsupported_grant_type", "Only authorization_code is supported");
    }
    let clientId = form.get("client_id");
    const basic = request.headers.get("authorization")?.match(/^Basic\s+(.+)$/i);
    if (!clientId && basic) {
      try {
        clientId = decodeURIComponent(Buffer.from(basic[1], "base64").toString("utf8").split(":")[0] ?? "");
      } catch {
        return oauthError("invalid_client", "Malformed Basic credentials", 401);
      }
    }
    if (!clientId) return oauthError("invalid_client", "client_id is required", 401);
    const code = unseal("code", form.get("code"));
    if (!code || code.c !== sha256(clientId)) return oauthError("invalid_grant", "Invalid or expired code");
    const redirectUri = form.get("redirect_uri");
    if (redirectUri && redirectUri !== code.ru) return oauthError("invalid_grant", "redirect_uri does not match");
    const verifier2 = form.get("code_verifier") ?? "";
    if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier2) || sha256(verifier2) !== code.cc) {
      return oauthError("invalid_grant", "PKCE verification failed");
    }
    const resource = form.get("resource");
    if (resource && !sameUrl(resource, config.resource.href)) return oauthError("invalid_target", "Unknown resource");
    const t = now();
    for (const [jti, exp2] of usedCodes) if (exp2 < t) usedCodes.delete(jti);
    if (usedCodes.has(code.jti)) return oauthError("invalid_grant", "Code already used");
    usedCodes.set(code.jti, code.exp);
    const exp = jwtExp(code.jwt) ?? t + FALLBACK_TOKEN_TTL_S;
    if (exp <= t) return oauthError("invalid_grant", "OpenReplay token already expired");
    const access = { c: code.c, jwt: code.jwt, aud: config.resource.href, exp };
    return json({
      access_token: seal("access", access),
      token_type: "Bearer",
      expires_in: exp - t
    });
  }
  const verifier = {
    async verifyAccessToken(token2) {
      const access = unseal("access", token2);
      if (!access) throw new OAuthError(OAuthErrorCode.InvalidToken, "Invalid or expired access token");
      return {
        token: token2,
        clientId: access.c,
        scopes: [],
        expiresAt: access.exp,
        resource: new URL(access.aud),
        extra: { jwt: access.jwt }
      };
    }
  };
  async function handle(request) {
    const url = new URL(request.url);
    const path4 = url.pathname;
    const isDiscovery = path4.startsWith("/.well-known/oauth-");
    if (request.method === "OPTIONS" && (isDiscovery || path4 === "/oauth/register" || path4 === "/oauth/token")) {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (path4 === "/.well-known/oauth-authorization-server" && request.method === "GET") return json(metadata);
    if ((path4 === "/.well-known/oauth-protected-resource" || path4 === `/.well-known/oauth-protected-resource${config.resource.pathname}`) && request.method === "GET") {
      return json(resourceMetadata);
    }
    if (path4 === "/oauth/register" && request.method === "POST") return register(request);
    if (path4 === "/oauth/authorize" && request.method === "GET") return authorize(url);
    if (path4 === "/oauth/callback" && request.method === "GET") return callback(url);
    if (path4 === "/oauth/token" && request.method === "POST") return token(request);
    return void 0;
  }
  return { handle, verifier };
}

// server-http.ts
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[HTTP] ${name} is required`);
    process.exit(1);
  }
  return value;
}
var publicUrl = new URL(new URL(requireEnv("MCP_PUBLIC_URL")).origin);
var secret = requireEnv("MCP_OAUTH_SECRET");
if (secret.length < 32) {
  console.error("[HTTP] MCP_OAUTH_SECRET must be at least 32 characters");
  process.exit(1);
}
var port = Number(process.env.PORT || 3e3);
var redirectHosts = (process.env.MCP_OAUTH_REDIRECT_HOSTS ?? "chatgpt.com,claude.ai,claude.com").trim();
var widgetDomain = process.env.MCP_WIDGET_DOMAIN || publicUrl.origin;
var resourceUrl = new URL("/mcp", publicUrl);
var appUrl = createState().appUrl;
var oauth = createOAuth({
  issuer: publicUrl,
  resource: resourceUrl,
  appUrl,
  secret,
  redirectHosts: redirectHosts === "*" ? null : redirectHosts.split(",").map((h) => h.trim()).filter(Boolean)
});
var mcp = createMcpHandler(() => createServer({ mode: "http", widgetDomain }), {
  onerror: (err) => console.error("[HTTP] MCP error:", err)
});
var gate = requireBearerAuth({
  verifier: oauth.verifier,
  expectedResource: resourceUrl,
  resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(resourceUrl)
});
var MAX_SESSIONS = 1e3;
var sessions = /* @__PURE__ */ new Map();
function stateFor(auth) {
  const key = crypto3.createHash("sha256").update(auth.token).digest("hex");
  let s = sessions.get(key);
  if (s) {
    sessions.delete(key);
  } else {
    s = createState({ jwt: auth.extra?.jwt, userData: { authenticated: true } });
    if (sessions.size >= MAX_SESSIONS) sessions.delete(sessions.keys().next().value);
  }
  sessions.set(key, s);
  return s;
}
async function route(request) {
  const { pathname } = new URL(request.url);
  if (pathname === resourceUrl.pathname) {
    const auth = await gate(request);
    if (auth instanceof Response) return auth;
    return runWithState(stateFor(auth), () => mcp.fetch(request, { authInfo: auth }));
  }
  if (pathname === "/health") return new Response("ok");
  return await oauth.handle(request) ?? new Response("Not found", { status: 404 });
}
function toWebRequest(req) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((v) => headers.append(name, v));
    else if (value !== void 0) headers.set(name, value);
  }
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  return new Request(new URL(req.url ?? "/", publicUrl), {
    method: req.method,
    headers,
    body: hasBody ? Readable.toWeb(req) : void 0,
    duplex: "half"
  });
}
async function writeWebResponse(res, response) {
  const headers = {};
  response.headers.forEach((value, name) => {
    if (name !== "set-cookie") headers[name] = value;
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) headers["set-cookie"] = cookies;
  res.writeHead(response.status, headers);
  if (!response.body) {
    res.end();
    return;
  }
  await pipeline(Readable.fromWeb(response.body), res);
}
var httpServer = http.createServer(async (req, res) => {
  try {
    await writeWebResponse(res, await route(toWebRequest(req)));
  } catch (err) {
    if (err?.code === "ERR_STREAM_PREMATURE_CLOSE") return;
    console.error("[HTTP] Request failed:", err);
    if (!res.headersSent) res.writeHead(500).end();
    else res.destroy();
  }
});
httpServer.listen(port, () => {
  console.error(`[HTTP] OpenReplay MCP Server v${APP_VERSION} on :${port}`);
  console.error(`[HTTP]   resource ${resourceUrl.href}  instance ${appUrl}`);
  console.error(`[HTTP]   redirect hosts ${redirectHosts}  widget domain ${widgetDomain}`);
});
function shutdown() {
  httpServer.close();
  void mcp.close().finally(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
