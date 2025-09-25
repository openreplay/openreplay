import { IResourceRequest, IResourceTiming } from "App/player";

export type AnyResource = Partial<IResourceRequest | IResourceTiming>;
export type HeadersMap = Record<string, string>;

function safeParse<T = any>(s?: string | null): T | undefined {
  if (!s) return undefined;
  try {
    return JSON.parse(s) as T;
  } catch {
    return undefined;
  }
}

function extractRequestInit(resource: AnyResource): {
  method: string;
  headers: HeadersMap;
  body?: string;
} {
  const fallbackMethod =
    resource.method && resource.method !== '..' ? resource.method : 'GET';

  const req = safeParse<any>(resource.request);

  let method: string = (req?.method || fallbackMethod || 'GET').toUpperCase();

  let headers: HeadersMap = {};
  const rawHeaders =
    req?.headers ||
    req?.requestHeaders ||
    undefined;

  if (rawHeaders) {
    if (Array.isArray(rawHeaders)) {
      for (const h of rawHeaders) {
        if (!h) continue;
        if (typeof h === 'string') {
          const idx = h.indexOf(':');
          if (idx > -1)
            headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
        } else if (h.name && h.value != null) {
          headers[String(h.name)] = String(h.value);
        }
      }
    } else if (typeof rawHeaders === 'object') {
      for (const [k, v] of Object.entries(rawHeaders)) {
        if (v == null) continue;
        headers[String(k)] = Array.isArray(v) ? v.join(', ') : String(v);
      }
    }
  }

  let body: string | undefined;
  if (req?.body != null) {
    if (typeof req.body === 'string') {
      body = req.body;
    } else {
      try {
        body = JSON.stringify(req.body);
        if (
          headers['content-type'] == null &&
          headers['Content-Type'] == null
        ) {
          headers['Content-Type'] = 'application/json';
        }
      } catch {
        // noop
      }
    }
  }

  if (method === 'GET') body = undefined;

  return { method, headers, body };
}

function cleanedHeaders(h: HeadersMap): HeadersMap {
  const skip = new Set([
    'host',
    'content-length',
    'connection',
    'accept-encoding',
    'cf-ray',
    'cf-connecting-ip',
    'x-forwarded-for',
    'x-forwarded-proto',
    'sec-ch-ua',
    'sec-ch-ua-mobile',
    'sec-ch-ua-platform',
    'sec-fetch-dest',
    'sec-fetch-mode',
    'sec-fetch-site',
    'sec-fetch-user',
    'upgrade-insecure-requests',
    'pragma',
    'via',
    'x-real-ip',
    'x-request-id',
  ]);
  const out: HeadersMap = {};
  for (const [k, v] of Object.entries(h)) {
    const key = k.toLowerCase();
    if (skip.has(key)) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    out[k] = v;
  }
  return out;
}

function shQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function jsQuote(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/'/g, "\\'")
}

function sortHeaders(h: HeadersMap): [string, string][] {
  return Object.entries(h).sort(([a], [b]) => a.localeCompare(b));
}

export function toCurl(resource: AnyResource): string {
  const url = resource.url || '';
  const { method, headers, body } = extractRequestInit(resource);
  const h = cleanedHeaders(headers);

  const parts: string[] = [];
  parts.push('curl');
  parts.push(shQuote(url));
  if (method && method !== 'GET') parts.push('-X', shQuote(method));
  for (const [k, v] of sortHeaders(h)) {
    parts.push('-H', shQuote(`${k}: ${v}`));
  }
  if (body != null) {
    parts.push('--data-raw', shQuote(body));
  }
  parts.push('--compressed');

  const pretty = [];
  for (let i = 0; i < parts.length; i++) {
    const token = parts[i];
    if (i === 0) {
      pretty.push(token);
    } else {
      pretty.push('\\\n  ' + token);
    }
  }
  return pretty.join(' ');
}

export function toFetch(resource: AnyResource): string {
  const url = resource.url || '';
  const { method, headers, body } = extractRequestInit(resource);
  const h = cleanedHeaders(headers);

  const hasHeaders = Object.keys(h).length > 0;
  const initLines: string[] = [];
  if (method && method !== 'GET') initLines.push(`method: '${method}',`);
  if (hasHeaders) {
    const entries = sortHeaders(h)
      .map(([k, v]) => `    '${k}': '${jsQuote(v)}',`)
      .join('\n');
    initLines.push(`headers: {\n${entries}\n  },`);
  }
  if (body != null) {
    initLines.push(`body: \`${jsQuote(body)}\`,`);
  }

  if (initLines.length === 0) {
    return `fetch('${jsQuote(url)}');`;
  }

  return `fetch('${jsQuote(url)}', {\n  ${initLines.join('\n  ')}\n});`;
}
