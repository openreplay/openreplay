import JSBI from 'jsbi';
import chroma from 'chroma-js';
import * as htmlToImage from 'html-to-image';
import { SESSION_FILTER } from 'App/constants/storageKeys';

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

export function getResourceName(url = '') {
    return url
        .split('/')
        .filter((s) => s !== '')
        .pop();
}

/* eslint-disable no-mixed-operators */
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
    !list.some((item2, j) => j < i && keys.every((key) => item[key] === item2[key] && item[key] !== undefined));

export const numberWithCommas = (x) => (x ? x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : 0);

export const numberCompact = (x) => (x >= 1000 ? x / 1000 + 'k' : x);

export const cutURL = (url, prefix = '.../') => `${prefix + url.split('/').slice(3).join('/')}`;

export const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
    searchCb?: (listItem: T, query: RegExp
) => boolean): T[] => {
    if (searchQuery === '') return list;
    const filterRE = getRE(searchQuery, 'i');
    let _list = list.filter((listItem: T) => {
        return testKeys.some((key) => filterRE.test(listItem[key]) || searchCb?.(listItem, filterRE));
    });
    return _list;
  }

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

export const convertNumberRange = (oldMax, oldMin, newMin, newMax, currentValue) => {
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
            [element]: { parts: 0, elements: numElements, divisor: startDivisorFn(numElements) },
        }),
        {}
    );

    while (parts > 0) {
        const element = Object.entries(byElement).reduce((a, [k, v]) => (a.divisor > v.divisor ? a : v), { divisor: 0 });
        // eslint-disable-next-line no-plusplus
        element.parts++;
        element.divisor = divisorFn(element.elements, element.parts);
        // eslint-disable-next-line no-plusplus
        parts--;
    }
    return Object.entries(byElement).reduce((a, [k, v]) => ({ ...a, [k]: v.parts }), {});
};

export const titleCase = (str) => {
    str = str.toLowerCase();
    str = str.split('_');
    for (var i = 0; i < str.length; i++) {
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
    return `${bt}B`;
}

export function percentOf(part: number, whole: number): number {
    return whole > 0 ? (part * 100) / whole : 0;
}

export function fileType(url: string) {
    const filename = url.split(/[#?]/)
    if (!filename || filename.length == 0) return ''
    const parts = filename[0].split('.')
    if (!parts || parts.length == 0) return ''
    return parts.pop().trim();
}

export function fileName(url: string) {
    if (url) {
        var m = url.toString().match(/.*\/(.+?)\./);
        if (m && m.length > 1) {
            return `${m[1]}.${fileType(url)}`;
        }
    }
    return '';
}

export const camelCased = (val) =>
    val.replace(/_([a-z])/g, function (g) {
        return g[1].toUpperCase();
    });

export function capitalize(s: string) {
    if (s.length === 0) return s;
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

/**
 * (BigInt('2783377641436327') * BigInt(id) % BigInt('4503599627370496') + BigInt('4503599627370496')).toString()
 * Replacing the above line of BigInt with JSBI since the BigInt not supportiing the some of the browser (i.e Safari (< 14), Opera).
 */
export const hashProjectID = (id) => {
    if (!!id) {
        return JSBI.add(
            JSBI.remainder(JSBI.multiply(JSBI.BigInt('2783377641436327'), JSBI.BigInt(id)), JSBI.BigInt('4503599627370496')),
            JSBI.BigInt('4503599627370496')
        ).toString();
    }
    return '';
};

export const colorScale = (values, colors) => {
    return chroma.scale(colors);
};

export const truncate = (input, max = 10) => (input.length > max ? `${input.substring(0, max)}...` : input);

export const iceServerConfigFromString = (str) => {
    if (!str || typeof str !== 'string' || str.length === 0) {
        return null;
    }

    return str.split('|').map(function (c) {
        let server = null;
        const arr = c.split(',');

        if (!!arr[0] !== '') {
            server = {};
            server.urls = arr[0];
            if (!!arr[1]) {
                server.username = arr[1];
                if (!!arr[2]) {
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
    return major > majorC || (major === majorC && minor > minorC) || (major === majorC && minor === minorC && patch >= patchC);
};

export const sliceListPerPage = <T extends Array<any>>(list: T, page: number, perPage = 10): T => {
    const start = page * perPage;
    const end = start + perPage;
    return list.slice(start, end) as T;
};

export const positionOfTheNumber = (min, max, value, length) => {
    const interval = (max - min) / length;
    const position = Math.round((value - min) / interval);
    return position;
};

export const convertElementToImage = async (el) => {
    const fontEmbedCss = await htmlToImage.getFontEmbedCSS(el);
    const image = await htmlToImage.toJpeg(el, {
        pixelRatio: 2,
        fontEmbedCss,
        filter: function (node) {
            return node.id !== 'no-print';
        },
    });
    return image;
};

export const unserscoreToSpaceAndCapitalize = (str) => {
    return str.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
};

export const convertToCSV = (headers, objArray) => {
    var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
    var str = '';
    const headersMap = headers.reduce((acc, curr) => {
        acc[curr.key] = curr;
        return acc;
    }, {});

    str += headers.map((h) => h.label).join(',') + '\r\n';

    for (var i = 0; i < array.length; i++) {
        var line = '';
        for (var index in headersMap) {
            if (line !== '') line += ',';
            line += array[i][index];
        }
        str += line + '\r\n';
    }

    return str;
};

export const exportCSVFile = (headers, items, fileTitle) => {
    var jsonObject = JSON.stringify(items);
    var csv = convertToCSV(headers, jsonObject);
    var exportedFilenmae = fileTitle + '.csv' || 'export.csv';

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) {
        // IE 10+
        navigator.msSaveBlob(blob, exportedFilenmae);
    } else {
        var link = document.createElement('a');
        if (link.download !== undefined) {
            var url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', exportedFilenmae);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
};

export const fetchErrorCheck = async (response: any) => {
    if (!response.ok) {
        return Promise.reject(response);
    }
    return response.json();
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

export const getSessionFilter = () => {
    return JSON.parse(localStorage.getItem(SESSION_FILTER));
};

export const setSessionFilter = (filter: any) => {
    localStorage.setItem(SESSION_FILTER, JSON.stringify(filter));
};

export const compareJsonObjects = (obj1: any, obj2: any) => {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
};

export const getInitials = (name: any) => {
    const names = name.split(' ');
    return names.slice(0, 2).map((n: any) => n[0]).join('');
}
export function getTimelinePosition(value: any, scale: any) {
    const pos = value * scale;
    return pos > 100 ? 100 : pos;
}

export function millisToMinutesAndSeconds(millis: any) {
    const minutes = Math.floor(millis / 60000);
    const seconds: any = ((millis % 60000) / 1000).toFixed(0);
    return minutes + 'm' + (seconds < 10 ? '0' : '') + seconds + 's';
}
