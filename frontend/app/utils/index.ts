// @ts-nocheck
import { SESSION_FILTER } from 'App/constants/storageKeys';
import { saveCsv } from './download';
export * from './extraUtils';

export const HOUR_SECS = 60 * 60;
export const DAY_SECS = 24 * HOUR_SECS;
export const WEEK_SECS = 7 * DAY_SECS;

export const escapeHtml = (str: string) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Recorded URLs are attacker-controlled: only http(s) may become a link. */
export const httpHref = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:' ? url : undefined;
  } catch {
    return undefined;
  }
};

/** runs `fn` once `wait` ms pass without another call; `.cancel()` drops a pending run */
export function debounce(fn, wait) {
  let timeout;
  const debounced = function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
  debounced.cancel = () => clearTimeout(timeout);
  return debounced;
}

export const fileNameFormat = (str = '', ext = '') => {
  const name = str.replace(/[^a-zA-Z0-9]/g, '_');
  return `${name}${ext}`;
};

export const numberWithCommas = (x) =>
  x ? x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : 0;

export const escapeRegExp = (string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function getRE(string: string, options: string) {
  let re;
  try {
    re = new RegExp(string, options);
  } catch (e) {
    re = new RegExp(escapeRegExp(string), options);
  }
  return re;
}

export const filterList = <T extends Record<string, any>>(
  list: T[],
  searchQuery: string,
  testKeys: string[],
  searchCb?: (listItem: T, query: RegExp) => boolean,
): T[] => {
  if (searchQuery === '') return list;
  const filterRE = getRE(searchQuery, 'i');
  return list.filter(
    (listItem: T) =>
      testKeys.some((key) => filterRE.test(listItem[key])) ||
      searchCb?.(listItem, filterRE),
  );
};

const KB = 1 << 10;
const MB = KB << 10;
const GB = MB << 10;
export function formatBytes(bt: number): string {
  if (bt > GB) {
    return `${Math.trunc((bt / GB) * 1e2) / 1e2}GB`;
  }
  if (bt > MB) {
    return `${Math.trunc((bt / MB) * 1e2) / 1e2}MB`;
  }
  if (bt > KB) {
    return `${Math.trunc((bt / KB) * 1e2) / 1e2}KB`;
  }
  return `${Math.trunc(bt)}B`;
}

export function percentOf(part: number, whole: number): number {
  return whole > 0 ? (part * 100) / whole : 0;
}

export function capitalize(s: string) {
  if (!s || !s.length) return s;
  return s[0].toUpperCase() + s.slice(1);
}

export const sliceListPerPage = <T extends Array<any>>(
  list: T,
  page: number,
  perPage = 10,
): T => {
  const start = page * perPage;
  const end = start + perPage;
  return list.slice(start, end) as T;
};

export const convertElementToImage = async (el: HTMLElement) => {
  // ~100 modules import this barrel; a static import would park html-to-image
  // on the critical path for the one PDF-export flow that uses it.
  const htmlToImage = await import('html-to-image');
  // const fontEmbedCss = await htmlToImage.getFontEmbedCSS(el);
  const image = await htmlToImage.toJpeg(el, {
    pixelRatio: 2,
    // fontEmbedCss,
    filter(node) {
      return node.id !== 'no-print';
    },
  });
  return image;
};

export const unserscoreToSpaceAndCapitalize = (str) =>
  str
    .replace(/_/g, ' ')
    .replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
    );

export const exportCSVFile = (headers, items, fileTitle) =>
  saveCsv(
    `${fileTitle}.csv`,
    headers.map((h) => h.label),
    items.map((item) => headers.map((h) => item[h.key])),
  );

export const cleanSessionFilters = (data: any) => {
  const { filters, ...rest } = data;
  const _fitlers = filters.filter((f: any) => {
    if (f.operator === 'isAny' || f.operator === 'onAny') {
      return true;
    } // ignore filter with isAny/onAny operator
    if (Array.isArray(f.filters) && f.filters.length > 0) {
      return true;
    } // ignore subfilters

    return f.value !== '' && Array.isArray(f.value) && f.value.length > 0;
  });
  return { ...rest, filters: _fitlers };
};

export const getSessionFilter = () =>
  JSON.parse(localStorage.getItem(SESSION_FILTER));

export const setSessionFilter = (filter: any) => {
  localStorage.setItem(SESSION_FILTER, JSON.stringify(filter));
};

export const compareJsonObjects = (obj1: any, obj2: any) =>
  JSON.stringify(obj1) === JSON.stringify(obj2);

export const getInitials = (name = '') => {
  const names = (name ?? '').split(' ').filter(Boolean);
  if (!names.length) return '';

  return names
    .slice(0, 2)
    .map((n: string) => [...n][0].toUpperCase())
    .join('');
};
export function getTimelinePosition(value: any, scale: any) {
  const pos = value * scale;
  return Math.min(100, Math.max(0, pos));
}

export function millisToMinutesAndSeconds(millis: any) {
  const minutes = Math.floor(millis / 60000);
  const seconds: any = ((millis % 60000) / 1000).toFixed(0);
  return `${minutes}m${seconds < 10 ? '0' : ''}${seconds}s`;
}

export const throttle = <R, A extends any[]>(
  fn: (...args: A) => R,
  delay: number,
): [(...args: A) => R | undefined, () => void, () => void] => {
  let wait = false;
  let timeout: undefined | number;
  let cancelled = false;

  function resetWait() {
    wait = false;
  }

  return [
    (...args: A) => {
      if (cancelled) return undefined;
      if (wait) return undefined;

      const val = fn(...args);

      wait = true;

      timeout = window.setTimeout(resetWait, delay);

      return val;
    },
    () => {
      cancelled = true;
      clearTimeout(timeout);
    },
    () => {
      clearTimeout(timeout);
      resetWait();
    },
  ];
};

export function deleteCookie(name: string, path: string, domain: string) {
  document.cookie = `${name}=${path ? `;path=${path}` : ''}${
    domain ? `;domain=${domain}` : ''
  };expires=Thu, 01 Jan 1970 00:00:01 GMT`;
}

/**
 * Checks if a specified query parameter exists in the URL and if its value is set to 'true'.
 * If a storageKey is provided, stores the result in localStorage under that key.
 *
 * @function
 * @param {string} paramName - The name of the URL parameter to check.
 * @param {string} [storageKey] - The optional key to use for storing the result in localStorage.
 * @param search
 * @returns {boolean} - Returns true if the parameter exists and its value is 'true'. Otherwise, returns false.
 *
 * @example
 * // Assuming URL is: http://example.com/?iframe=true
 * const isIframeEnabled = checkParam('iframe');  // Returns true, doesn't store in localStorage
 * const isIframeEnabledWithStorage = checkParam('iframe', 'storageKey');  // Returns true, stores in localStorage
 *
 * @description
 * The function inspects the current URL's query parameters. If the specified parameter exists
 * and its value is set to 'true', and a storageKey is provided, the function stores 'true' under
 * the provided storage key in the localStorage. If the condition is not met, or if the parameter
 * does not exist, and a storageKey is provided, any existing localStorage entry with the storageKey
 * is removed.
 */
export const checkParam = (
  paramName: string,
  storageKey?: string,
  search?: string,
): boolean => {
  const urlParams = new URLSearchParams(search || window.location.search);
  const paramValue = urlParams.get(paramName);

  const existsAndTrue =
    (paramValue && paramValue === 'true') || paramValue?.length > 0;

  if (storageKey) {
    if (existsAndTrue) {
      localStorage.setItem(storageKey, 'true');
    } else {
      localStorage.removeItem(storageKey);
    }
  }

  return existsAndTrue;
};

let sendingRequest = false;
export const handleSpotJWT = (jwt: string) => {
  let tries = 0;
  if (!jwt || sendingRequest) {
    return;
  }
  sendingRequest = true;
  let int: ReturnType<typeof setInterval>;
  const onSpotMsg = (event: any) => {
    if (event.source !== window) return;
    if (event.data.type === 'orspot:logged') {
      clearInterval(int);
      sendingRequest = false;
      window.removeEventListener('message', onSpotMsg);
    }
  };
  window.addEventListener('message', onSpotMsg);

  int = setInterval(() => {
    if (tries > 20) {
      sendingRequest = false;
      clearInterval(int);
      window.removeEventListener('message', onSpotMsg);
      return;
    }
    window.postMessage(
      {
        type: 'orspot:token',
        token: jwt,
      },
      '*',
    );
    tries += 1;
  }, 250);
};

export const isTokenExpired = (token: string): boolean => {
  const decoded: any = decodeJwt(token);
  const currentTime = Date.now() / 1000;
  return decoded.exp < currentTime;
};

const decodeJwt = (jwt: string): any => {
  const base64Url = jwt.split('.')[1];
  if (!base64Url) {
    return { exp: 0 };
  }
  const base64 = base64Url.replace('-', '+').replace('_', '/');
  return JSON.parse(atob(base64));
};

export function exportAntCsv(tableColumns, tableData, filename = 'table.csv') {
  saveCsv(
    filename,
    tableColumns.map((col) => col._pureTitle),
    tableData.map((row) =>
      tableColumns.map((col) => (col.dataIndex ? row[col.dataIndex] : '')),
    ),
  );
}

export function roundToNextMinutes(timestamp: number, minutes: number): number {
  const date = new Date(timestamp);
  date.setSeconds(0, 0);
  const currentMinutes = date.getMinutes();
  const remainder = currentMinutes % minutes;
  if (remainder !== 0) {
    date.setMinutes(currentMinutes + (minutes - remainder));
  }
  return date.getTime();
}

export function normalizeDataType(rawType: string): string {
  const type = rawType.toLowerCase();

  if (
    [
      'number',
      'integer',
      'int',
      'float',
      'double',
      'decimal',
      'int8',
      'int16',
      'int32',
      'int64',
      'uint8',
      'uint16',
      'uint32',
      'uint64',
      'float32',
      'float64',
    ].includes(type)
  ) {
    return 'number';
  }

  if (['date', 'datetime', 'date32', 'datetime64'].includes(type)) {
    return 'date';
  }
  if (type === 'timestamp') {
    return 'timestamp';
  }

  if (type.startsWith('array') || type === 'array') {
    return 'array';
  }

  if (['bool', 'boolean'].includes(type)) {
    return 'boolean';
  }

  return 'string';
}

export function arraysIntersect(a: string[], b: string[]) {
  if (a.length === 0 || b.length === 0) return false;

  if (a.length > b.length) {
    const t = a;
    a = b;
    b = t;
  }

  const set = new Set(a);
  for (let i = 0; i < b.length; i++) {
    if (set.has(b[i])) return true;
  }
  return false;
}
