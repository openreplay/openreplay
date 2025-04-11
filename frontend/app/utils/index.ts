// @ts-nocheck
import chroma from 'chroma-js';
import * as htmlToImage from 'html-to-image';
import { SESSION_FILTER } from 'App/constants/storageKeys';

export const HOUR_SECS = 60 * 60;
export const DAY_SECS = 24 * HOUR_SECS;
export const WEEK_SECS = 7 * DAY_SECS;

export const formatExpirationTime = (seconds: number) => {
  if (seconds >= WEEK_SECS) {
    return `${Math.floor(seconds / DAY_SECS)} days`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours > 0 ? `${hours}h` : ''}${minutes > 0 ? `${minutes}m` : ''}`.trim();
};

export function debounce(callback, wait, context = this) {
  let timeout = null;
  let callbackArgs = null;

  const later = () => callback.apply(context, callbackArgs);

  return function (...args) {
    callbackArgs = args;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function debounceCall(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

export function randomInt(a, b) {
  const min = (b ? a : 0) - 0.5;
  const max = b || a || Number.MAX_SAFE_INTEGER;
  const rand = min - 0.5 + Math.random() * (max - min + 1);
  return Math.round(rand);
}

export const fileNameFormat = (str = '', ext = '') => {
  const name = str.replace(/[^a-zA-Z0-9]/g, '_');
  return `${name}${ext}`;
};

export const toUnderscore = (s) =>
  s
    .split(/(?=[A-Z])/)
    .join('_')
    .toLowerCase();

export const getUniqueFilter = (keys) => (item, i, list) =>
  !list.some(
    (item2, j) =>
      j < i &&
      keys.every((key) => item[key] === item2[key] && item[key] !== undefined),
  );

export const numberWithCommas = (x) =>
  x ? x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : 0;

export const numberCompact = (x) => {
  if (x < 1000) {
    return x;
  }
  if (x < 1000000) {
    return `${Math.floor(x / 1000)}K`;
  }
  return `${Math.floor(x / 1000000)}M`;
};

export const cutURL = (url, prefix = '.../') =>
  `${prefix + url.split('/').slice(3).join('/')}`;

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

export const getStateColor = (state) => {
  switch (state) {
    case 'passed':
      return 'green';
    case 'failed':
      return 'red';
    default:
      return 'gray-medium';
  }
};

export const convertNumberRange = (
  oldMax,
  oldMin,
  newMin,
  newMax,
  currentValue,
) => {
  let newValue;
  let newRange;
  const oldRange = oldMax - oldMin;

  if (oldRange === 0) {
    newValue = newMin;
  } else {
    newRange = newMax - newMin;
    newValue = ((currentValue - oldMin) * newRange) / oldRange + newMin;
  }
  return newValue;
};

export const prorata = ({ parts, elements, startDivisorFn, divisorFn }) => {
  const byElement = Object.entries(elements).reduce(
    (ack, [element, numElements]) => ({
      ...ack,
      [element]: {
        parts: 0,
        elements: numElements,
        divisor: startDivisorFn(numElements),
      },
    }),
    {},
  );

  while (parts > 0) {
    const element = Object.entries(byElement).reduce(
      (a, [k, v]) => (a.divisor > v.divisor ? a : v),
      { divisor: 0 },
    );

    element.parts++;
    element.divisor = divisorFn(element.elements, element.parts);

    parts--;
  }
  return Object.entries(byElement).reduce(
    (a, [k, v]) => ({ ...a, [k]: v.parts }),
    {},
  );
};

export const titleCase = (str) => {
  str = str.toLowerCase();
  str = str.split('_');
  for (let i = 0; i < str.length; i++) {
    str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
  }

  return str.join(' ');
};

export const confirm = (message, callback) => {
  const sure = window.confirm(message);
  if (!sure) return;
  callback();
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

export function fileType(url: string) {
  const filename = url.split(/[#?]/);
  if (!filename || filename.length == 0) return '';
  const parts = filename[0].split('.');
  if (!parts || parts.length == 0) return '';
  return parts.pop().trim();
}

export function fileName(url: string) {
  if (url) {
    const m = url.toString().match(/.*\/(.+?)\./);
    if (m && m.length > 1) {
      return `${m[1]}.${fileType(url)}`;
    }
  }
  return '';
}

export const camelCased = (val) =>
  val.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

export function capitalize(s: string) {
  if (!s || !s.length) return s;
  return s[0].toUpperCase() + s.slice(1);
}

export const titleize = (str) => {
  let upper = true;
  let newStr = '';
  for (let i = 0, l = str.length; i < l; i++) {
    // Note that you can also check for all kinds of spaces  with
    // str[i].match(/\s/)
    if (str[i] == ' ') {
      upper = true;
      newStr += str[i];
      continue;
    }
    if (str[i] == '_') {
      upper = true;
      newStr += ' ';
      continue;
    }
    newStr += upper ? str[i].toUpperCase() : str[i].toLowerCase();
    upper = false;
  }
  return newStr;
};

export const colorScale = (values, colors) => chroma.scale(colors);

export const truncate = (input, max = 10) =>
  input.length > max ? `${input.substring(0, max)}...` : input;

export const iceServerConfigFromString = (str) => {
  if (!str || typeof str !== 'string' || str.length === 0) {
    return null;
  }

  return str.split('|').map((c) => {
    let server = null;
    const arr = c.split(',');

    if (!!arr[0] !== '') {
      server = {};
      server.urls = arr[0];
      if (arr[1]) {
        server.username = arr[1];
        if (arr[2]) {
          server.credential = arr[2];
        }
      }
      return server;
    }
  });
};

export const isGreaterOrEqualVersion = (version, compareTo) => {
  const [major, minor, patch] = version.split('-')[0].split('.');
  const [majorC, minorC, patchC] = compareTo.split('-')[0].split('.');
  return (
    major > majorC ||
    (major === majorC && minor > minorC) ||
    (major === majorC && minor === minorC && patch >= patchC)
  );
};

export const sliceListPerPage = <T extends Array<any>>(
  list: T,
  page: number,
  perPage = 10,
): T => {
  const start = page * perPage;
  const end = start + perPage;
  return list.slice(start, end) as T;
};

export const positionOfTheNumber = (min, max, value, length) => {
  const interval = (max - min) / length;
  const position = Math.round((value - min) / interval);
  return position;
};

export const convertElementToImage = async (el: HTMLElement) => {
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

export const convertToCSV = (headers, objArray) => {
  const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
  let str = '';
  const headersMap = headers.reduce((acc, curr) => {
    acc[curr.key] = curr;
    return acc;
  }, {});

  str += `${headers.map((h) => h.label).join(',')}\r\n`;

  for (let i = 0; i < array.length; i++) {
    let line = '';
    for (const index in headersMap) {
      if (line !== '') line += ',';
      line += array[i][index];
    }
    str += `${line}\r\n`;
  }

  return str;
};

export const exportCSVFile = (headers, items, fileTitle) => {
  const jsonObject = JSON.stringify(items);
  const csv = convertToCSV(headers, jsonObject);
  const exportedFilenmae = `${fileTitle}.csv` || 'export.csv';

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, exportedFilenmae);
  } else {
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', exportedFilenmae);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
};

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
  const names = name.split(' ');
  return (
    names
      .slice(0, 2)
      .map((n: any) => n[0]?.toUpperCase())
      .join('') || ''
  );
};
export function getTimelinePosition(value: any, scale: any) {
  const pos = value * scale;
  return pos > 100 ? 100 : pos;
}

export function millisToMinutesAndSeconds(millis: any) {
  const minutes = Math.floor(millis / 60000);
  const seconds: any = ((millis % 60000) / 1000).toFixed(0);
  return `${minutes}m${seconds < 10 ? '0' : ''}${seconds}s`;
}

export function simpleThrottle(
  func: (...args: any[]) => void,
  limit: number,
): (...args: any[]) => void {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
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

export const isValidUrl = (url) =>
  /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/.test(
    url,
  );

export function truncateStringToFit(
  string: string,
  screenWidth: number,
  charWidth: number = 5,
): string {
  if (string.length * charWidth <= screenWidth) {
    return string;
  }

  const ellipsis = '...';
  const maxLen = Math.floor(screenWidth / charWidth);

  if (maxLen <= ellipsis.length) {
    return ellipsis.slice(0, maxLen);
  }

  const frontLen = Math.floor((maxLen - ellipsis.length) / 2);
  const backLen = maxLen - ellipsis.length - frontLen;

  return string.slice(0, frontLen) + ellipsis + string.slice(-backLen);
}

let sendingRequest = false;
export const handleSpotJWT = (jwt: string) => {
  let tries = 0;
  if (!jwt || sendingRequest) {
    return;
  }
  sendingRequest = true;
  let int: ReturnType<typeof setInterval>;
  const onSpotMsg = (event: any) => {
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

function saveAsFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function exportAntCsv(tableColumns, tableData, filename = 'table.csv') {
  const headers = tableColumns.map((col) => col._pureTitle).join(',');
  const rows = tableData.map((row) =>
    tableColumns
      .map((col) => {
        const value = col.dataIndex ? row[col.dataIndex] : '';
        return typeof value === 'string'
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      })
      .join(','),
  );

  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAsFile(blob, filename);
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
