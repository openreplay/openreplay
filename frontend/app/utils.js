import JSBI from 'jsbi';
import { scale } from "d3";

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
  return url.split('/').filter(s => s!== '').pop();
}

/* eslint-disable no-mixed-operators */
export function randomInt(a, b) {
  const min = (b ? a : 0) - 0.5;
  const max = b || a || Number.MAX_SAFE_INTEGER;
  const rand = min - 0.5 + (Math.random() * (max - min + 1));
  return Math.round(rand);
}

export const toUnderscore = s => s.split(/(?=[A-Z])/).join('_').toLowerCase();

export const getUniqueFilter = keys =>
  (item, i, list) =>
    !list.some((item2, j) => j < i &&
      keys.every(key => item[ key ] === item2[ key ] && item[ key ] !== undefined));

export const numberWithCommas = (x) => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const numberCompact = (x) =>  x >= 1000 ? x / 1000 + 'k': x;

export const cutURL = (url, prefix = '.../') => `${ prefix + url.split('/').slice(3).join('/') }`;

export const escapeRegExp = string => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function getRE(string, options) {
  let re;
  try {
    re = new RegExp(string, options);
  } catch(e){
    re = new RegExp(escapeRegExp(string), options);
  }
  return re;
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
  const oldRange = (oldMax - oldMin);

  if (oldRange === 0) {
    newValue = newMin;
  } else {
    newRange = (newMax - newMin);
    newValue = (((currentValue - oldMin) * newRange) / oldRange) + newMin;
  }
  return newValue;
};

export const prorata = ({
  parts, elements, startDivisorFn, divisorFn,
}) => {
  const byElement = Object.entries(elements)
    .reduce((ack, [ element, numElements ]) => ({
      ...ack,
      [ element ]: { parts: 0, elements: numElements, divisor: startDivisorFn(numElements) },
    }), {});

  while (parts > 0) {
    const element = Object.entries(byElement).reduce((a, [ k, v ]) => (a.divisor > v.divisor ? a : v), { divisor: 0 });
    // eslint-disable-next-line no-plusplus
    element.parts++;
    element.divisor = divisorFn(element.elements, element.parts);
    // eslint-disable-next-line no-plusplus
    parts--;
  }
  return Object.entries(byElement).reduce((a, [ k, v ]) => ({ ...a, [ k ]: v.parts }), {});
};

export const titleCase = (str) => {
  str = str.toLowerCase();
  str = str.split('_');
  for (var i = 0; i < str.length; i++) {
    str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1); 
  }
  
  return str.join(' ');
}

export const confirm = (message, callback) => {
  const sure = window.confirm(message);
  if (!sure) return;
  callback()
}

const KB = 1<<10;
const MB = KB<<10;
const GB = MB<<10;
export function formatBytes(bt: number): string {
  if (bt > GB) {
    return `${ Math.trunc(bt/GB*1e2)/1e2 }GB`;
  }
  if (bt > MB) {
    return `${ Math.trunc(bt/MB*1e2)/1e2 }MB`;
  }
  if (bt > KB) {
    return `${ Math.trunc(bt/KB*1e2)/1e2 }KB`;
  }
  return `${ bt }B`;
}

export function percentOf(part: number, whole: number):number {
  return whole > 0 ? (part * 100) / whole : 0;
}

export function fileType(url) {
  return url.split(/[#?]/)[0].split('.').pop().trim()
}

export function fileName(url) {
  if (url) {
    var m = url.toString().match(/.*\/(.+?)\./);
      if (m && m.length > 1) {
        return `${m[1]}.${fileType(url)}`;
      }
   }
   return "";
}

export const camelCased = (val) =>
  val.replace(/_([a-z])/g, function (g) { return g[1].toUpperCase(); })

export function capitalize(s: string) {
  if (s.length === 0) return s;
  return s[0].toUpperCase() + s.slice(1);
}

export const titleize = (str) => {
  let upper = true
  let newStr = ""
  for (let i = 0, l = str.length; i < l; i++) {
      // Note that you can also check for all kinds of spaces  with
      // str[i].match(/\s/)
      if (str[i] == " ") {
          upper = true
          newStr += str[i]
          continue
      }
      if (str[i] == "_") {        
        upper = true
        newStr += ' '
        continue
    }
      newStr += upper ? str[i].toUpperCase() : str[i].toLowerCase()
      upper = false
  }
  return newStr
}

/**
 * (BigInt('2783377641436327') * BigInt(id) % BigInt('4503599627370496') + BigInt('4503599627370496')).toString()
 * Replacing the above line of BigInt with JSBI since the BigInt not supportiing the some of the browser (i.e Safari (< 14), Opera).
 */
export const hashProjectID = (id) => {
  if (!!id) {
    return JSBI.add(
      JSBI.remainder(
        JSBI.multiply(JSBI.BigInt('2783377641436327'), JSBI.BigInt(id)),
        JSBI.BigInt('4503599627370496')
      ),
      JSBI.BigInt('4503599627370496')
    ).toString()
  }
  return ''
}


export const colorScale = (values, colors) => {
  const minValue = Math.min.apply(null, values);
  const maxValue = Math.max.apply(null, values);

  return scale.linear()
              .domain([minValue,maxValue])
              .range([colors[0], colors[colors.length - 1]]);
}

export const truncate = (input, max = 10) => input.length > max ? `${input.substring(0, max)}...` : input;

export const iceServerConfigFromString = (str) => {
  if (!str || typeof str !== 'string'|| str.length === 0) {
    return null;
  }
  
  return str.split("|").map(function(c) {
    let server = null
    const arr = c.split(",")
  
    if (!!arr[0] !== "") {
      server = {}
      server.urls = arr[0]
      if (!!arr[1]) {
        server.username = arr[1]
        if (!!arr[2]) {
          server.credential = arr[2]
        }
      }
      return server
    }
  })
}

export const isGreaterOrEqualVersion = (version, compareTo) => {
  const [major, minor, patch] = version.split("-")[0].split('.');
  const [majorC, minorC, patchC] = compareTo.split("-")[0].split('.');
  return (major > majorC) || (major === majorC && minor > minorC) || (major === majorC && minor === minorC && patch >= patchC);
}