export interface HarPair {
  name: string;
  value: string;
}

export type HarCategory =
  | 'xhr'
  | 'js'
  | 'css'
  | 'img'
  | 'media'
  | 'font'
  | 'doc'
  | 'other';

export interface HarTimings {
  blocked: number;
  dns: number;
  connect: number;
  ssl: number;
  send: number;
  wait: number;
  receive: number;
}

export interface HarPostData {
  mimeType: string;
  text: string;
  params: HarPair[];
}

export interface HarContent {
  mimeType: string;
  text: string;
  encoding: string;
  size: number;
}

export interface HarEntryDetail {
  index: number;
  method: string;
  url: string;
  host: string;
  path: string;
  status: number;
  statusText: string;
  httpVersion: string;
  category: HarCategory;
  mimeType: string;
  sizeBytes: number;
  time: number;
  startMs: number;
  offsetMs: number;
  serverIPAddress: string;
  requestHeaders: HarPair[];
  responseHeaders: HarPair[];
  queryString: HarPair[];
  postData: HarPostData | null;
  content: HarContent;
  timings: HarTimings;
  isError: boolean;
  searchBlob: string;
}

export interface ParsedHar {
  entries: HarEntryDetail[];
  totalRequests: number;
  totalSizeBytes: number;
  rangeMs: number;
}

/**
 * Error codes so the caller can map to a localized message.
 * The page (har-file-viewer.astro) turns these into the user-facing strings
 * held in tool_har_file_viewer.ts; keeping codes here keeps the util i18n-free.
 * - `invalid-json`: the file is not valid JSON at all.
 * - `missing-entries`: valid JSON but no `log.entries` array (not a HAR file).
 * - `empty`: a HAR file whose `log.entries` array is empty.
 */
export type HarParseErrorCode = 'invalid-json' | 'missing-entries' | 'empty';

export interface ParseResult {
  data: ParsedHar | null;
  error: HarParseErrorCode | null;
}

const SEARCH_TEXT_CAP = 30_000;

function asPairs(list: unknown): HarPair[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter(
      (item): item is { name?: unknown; value?: unknown } =>
        !!item && typeof item === 'object',
    )
    .map((item) => ({
      name: String(item.name ?? ''),
      value: String(item.value ?? ''),
    }));
}

function clampTiming(value: unknown): number {
  const n = typeof value === 'number' ? value : -1;
  return n > 0 ? n : 0;
}

function classify(
  resourceType: string,
  mimeType: string,
  url: string,
): HarCategory {
  switch (resourceType) {
    case 'xhr':
    case 'fetch':
    case 'preflight':
    case 'websocket':
      return 'xhr';
    case 'script':
      return 'js';
    case 'stylesheet':
      return 'css';
    case 'image':
      return 'img';
    case 'media':
      return 'media';
    case 'font':
      return 'font';
    case 'document':
      return 'doc';
  }

  const mime = mimeType.toLowerCase();
  const cleanUrl = url.split(/[?#]/)[0].toLowerCase();

  if (
    mime.includes('javascript') ||
    mime.includes('ecmascript') ||
    cleanUrl.endsWith('.js') ||
    cleanUrl.endsWith('.mjs')
  )
    return 'js';
  if (mime.includes('css') || cleanUrl.endsWith('.css')) return 'css';
  if (
    mime.startsWith('image/') ||
    /\.(png|jpe?g|gif|webp|avif|svg|ico)$/.test(cleanUrl)
  )
    return 'img';
  if (
    mime.startsWith('audio/') ||
    mime.startsWith('video/') ||
    /\.(mp3|mp4|webm|ogg|wav|m3u8)$/.test(cleanUrl)
  )
    return 'media';
  if (mime.includes('font') || /\.(woff2?|ttf|otf|eot)$/.test(cleanUrl))
    return 'font';
  if (mime.includes('html')) return 'doc';
  if (mime.includes('json') || mime.includes('xml') || mime.includes('form'))
    return 'xhr';
  return 'other';
}

function buildSearchBlob(parts: Array<string | HarPair[]>): string {
  const chunks: string[] = [];
  for (const part of parts) {
    if (typeof part === 'string') {
      if (part) chunks.push(part.slice(0, SEARCH_TEXT_CAP));
    } else {
      for (const pair of part) chunks.push(`${pair.name}: ${pair.value}`);
    }
  }
  return chunks.join('\n').toLowerCase();
}

export function parseHar(content: string): ParseResult {
  let har: unknown;
  try {
    har = JSON.parse(content);
  } catch {
    return { data: null, error: 'invalid-json' };
  }

  const log = (har as { log?: { entries?: unknown[] } })?.log;
  if (!log || !Array.isArray(log.entries)) {
    return { data: null, error: 'missing-entries' };
  }

  const rawEntries = log.entries as Array<Record<string, any>>;
  if (rawEntries.length === 0) {
    return { data: null, error: 'empty' };
  }

  const entries: HarEntryDetail[] = rawEntries.map((raw) => {
    const request = raw.request ?? {};
    const response = raw.response ?? {};
    const rawContent = response.content ?? {};
    const rawTimings = raw.timings ?? {};
    const url = String(request.url ?? '');

    let host = '';
    let path = url;
    try {
      const u = new URL(url);
      host = u.host;
      path = `${u.pathname}${u.search}` || '/';
    } catch {
      // keep full url as path for non-standard URLs
    }

    const mimeType = String(rawContent.mimeType ?? '');
    const resourceType = String(raw._resourceType ?? '').toLowerCase();
    const status = Number(response.status ?? 0) || 0;

    const requestHeaders = asPairs(request.headers);
    const responseHeaders = asPairs(response.headers);
    const queryString = asPairs(request.queryString);

    const rawPost = request.postData;
    const postData: HarPostData | null = rawPost
      ? {
          mimeType: String(rawPost.mimeType ?? ''),
          text: typeof rawPost.text === 'string' ? rawPost.text : '',
          params: asPairs(rawPost.params),
        }
      : null;

    const contentText =
      typeof rawContent.text === 'string' ? rawContent.text : '';
    const encoding = String(rawContent.encoding ?? '');
    const contentSize =
      Number(rawContent.size ?? 0) > 0 ? Number(rawContent.size) : 0;

    const ssl = clampTiming(rawTimings.ssl);
    // Per the HAR spec, ssl time is included in connect time.
    const connect = Math.max(clampTiming(rawTimings.connect) - ssl, 0);
    const timings: HarTimings = {
      blocked: clampTiming(rawTimings.blocked),
      dns: clampTiming(rawTimings.dns),
      connect,
      ssl,
      send: clampTiming(rawTimings.send),
      wait: clampTiming(rawTimings.wait),
      receive: clampTiming(rawTimings.receive),
    };

    const startMs = Date.parse(String(raw.startedDateTime ?? ''));

    return {
      index: 0,
      method: String(request.method ?? 'GET').toUpperCase(),
      url,
      host,
      path,
      status,
      statusText: String(response.statusText ?? ''),
      httpVersion: String(response.httpVersion ?? request.httpVersion ?? ''),
      category: classify(resourceType, mimeType, url),
      mimeType,
      sizeBytes: contentSize,
      time: Math.max(Number(raw.time ?? 0) || 0, 0),
      startMs: Number.isFinite(startMs) ? startMs : NaN,
      offsetMs: 0,
      serverIPAddress: String(raw.serverIPAddress ?? ''),
      requestHeaders,
      responseHeaders,
      queryString,
      postData,
      content: { mimeType, text: contentText, encoding, size: contentSize },
      timings,
      isError: status === 0 || status >= 400,
      searchBlob: buildSearchBlob([
        url,
        String(request.method ?? ''),
        `${status} ${String(response.statusText ?? '')}`,
        mimeType,
        requestHeaders,
        responseHeaders,
        queryString,
        postData?.text ?? '',
        postData ? postData.params : [],
        encoding === 'base64' ? '' : contentText,
      ]),
    };
  });

  const validStarts = entries
    .filter((e) => Number.isFinite(e.startMs))
    .map((e) => e.startMs);
  const captureStart = validStarts.length ? Math.min(...validStarts) : 0;
  for (const entry of entries) {
    entry.offsetMs = Number.isFinite(entry.startMs)
      ? Math.max(entry.startMs - captureStart, 0)
      : 0;
  }

  entries.sort((a, b) => a.offsetMs - b.offsetMs);
  entries.forEach((entry, i) => {
    entry.index = i;
  });

  const rangeMs = Math.max(...entries.map((e) => e.offsetMs + e.time), 1);
  const totalSizeBytes = entries.reduce((sum, e) => sum + e.sizeBytes, 0);

  return {
    data: { entries, totalRequests: entries.length, totalSizeBytes, rangeMs },
    error: null,
  };
}
