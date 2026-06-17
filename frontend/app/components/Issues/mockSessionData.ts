/* Mock "mob" data for the issue session player, shaped exactly like the JSON the
   real Spot player parses and hands to spotPlayerStore.setEvents(logs, locations,
   clicks, network). Times are ms from session start (startTs = 0). Themed to an
   OpenReplay app navigation, matching the recorded webm. */

export const MOCK_LOGS = [
  { time: 1200, level: 'info', msg: 'App booted in 842ms' },
  { time: 4300, level: 'log', msg: 'Navigated to /highlights' },
  { time: 9100, level: 'warn', msg: 'Deprecated prop "bordered" used in <Table>' },
  { time: 14800, level: 'info', msg: 'Fetched 0 bookmarked sessions' },
  { time: 22600, level: 'error', msg: 'Uncaught TypeError: cannot read properties of undefined (reading "id")' },
  { time: 31000, level: 'log', msg: 'Switched project to OpenReplay Serverless' },
  { time: 47500, level: 'warn', msg: 'Slow resource: /api/v1/cards took 2148ms' },
];

export const MOCK_LOCATIONS = [
  {
    time: 800,
    location: 'https://app.openreplay.com/2325/sessions',
    navTiming: { fcpTime: 612, timeToInteractive: 1340, visuallyComplete: 1610 },
  },
  {
    time: 4300,
    location: 'https://app.openreplay.com/2325/highlights',
    navTiming: { fcpTime: 540, timeToInteractive: 1120, visuallyComplete: 1402 },
  },
  {
    time: 30900,
    location: 'https://app.openreplay.com/2325/vault',
    navTiming: { fcpTime: 705, timeToInteractive: 1520, visuallyComplete: 1880 },
  },
];

export const MOCK_CLICKS = [
  { time: 4200, label: 'Highlights' },
  { time: 12500, label: 'Refresh' },
  { time: 30800, label: 'Vault' },
  { time: 44000, label: 'Data Management' },
];

export const MOCK_NETWORK = [
  {
    time: 900,
    type: 'fetch',
    statusCode: 200,
    url: 'https://api.openreplay.com/account',
    method: 'GET',
    duration: 184,
    encodedBodySize: 1843,
    responseBodySize: 1843,
    body: '',
    requestHeaders: { accept: 'application/json' },
    responseHeaders: { 'content-type': 'application/json' },
    responseBody: '{"name":"shekar","tenantId":"2325"}',
  },
  {
    time: 4600,
    type: 'fetch',
    statusCode: 200,
    url: 'https://api.openreplay.com/2325/highlights',
    method: 'GET',
    duration: 421,
    encodedBodySize: 56,
    responseBodySize: 56,
    body: '',
    requestHeaders: { accept: 'application/json' },
    responseHeaders: { 'content-type': 'application/json' },
    responseBody: '{"data":[]}',
  },
  {
    time: 14700,
    type: 'xmlhttprequest',
    statusCode: 304,
    url: 'https://api.openreplay.com/2325/bookmarks',
    method: 'GET',
    duration: 88,
    encodedBodySize: 0,
    responseBodySize: 0,
    body: '',
    requestHeaders: {},
    responseHeaders: { 'content-type': 'application/json' },
    responseBody: '',
  },
  {
    time: 22400,
    type: 'fetch',
    statusCode: 401,
    url: 'https://api.openreplay.com/2325/cards/preview',
    method: 'POST',
    duration: 132,
    encodedBodySize: 41,
    responseBodySize: 41,
    body: '{"cardId":901}',
    requestHeaders: { 'content-type': 'application/json' },
    responseHeaders: { 'content-type': 'application/json' },
    responseBody: '{"error":"unauthorized"}',
  },
  {
    time: 47400,
    type: 'fetch',
    statusCode: 200,
    url: 'https://api.openreplay.com/2325/cards',
    method: 'GET',
    duration: 2148,
    encodedBodySize: 9322,
    responseBodySize: 9322,
    body: '',
    requestHeaders: { accept: 'application/json' },
    responseHeaders: { 'content-type': 'application/json' },
    responseBody: '{"data":[ ... ]}',
  },
];
