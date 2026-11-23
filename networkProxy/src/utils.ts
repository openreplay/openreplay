import { obscureFormFields, obscureParam } from './sanitizers.js'

export const genResponseByType = (
  responseType: XMLHttpRequest['responseType'],
  response: any,
): string | Record<string, any> => {
  let result = ''
  switch (responseType) {
    case '':
    case 'text':
    case 'json':
      if (typeof response == 'string') {
        try {
          result = JSON.parse(response)
        } catch (e) {
          // not a JSON string
          result = response.slice(0, 10000)
        }
      } else if (isPureObject(response) || Array.isArray(response)) {
        result = JSON.stringify(response)
      } else if (typeof response !== 'undefined') {
        result = Object.prototype.toString.call(response)
      }
      break

    case 'blob':
    case 'document':
    case 'arraybuffer':
    default:
      if (typeof response !== 'undefined') {
        result = Object.prototype.toString.call(response)
      }
      break
  }
  return result
}

// a larger body would not fit in a batch anyway
export const BODY_LIMIT = 1_000_000

/** Class tag, like instanceof but also for objects from another realm (iframe) */
export const tagOf = (x: unknown) => Object.prototype.toString.call(x).slice(8, -1)

const isBinary = (x: unknown) =>
  ArrayBuffer.isView(x) || ['Blob', 'File', 'ArrayBuffer', 'ReadableStream'].includes(tagOf(x))

export const getStringResponseByType = (
  responseType: XMLHttpRequest['responseType'],
  response: any,
) => {
  let result = ''
  switch (responseType) {
    case '':
    case 'text':
    case 'json':
      if (typeof response == 'string') {
        result = response
      } else if (isPureObject(response) || Array.isArray(response)) {
        result = JSON.stringify(response)
      } else if (response != null) {
        result = Object.prototype.toString.call(response)
      }
      break
    case 'blob':
    case 'document':
    case 'arraybuffer':
    default:
      if (typeof response !== 'undefined') {
        result = Object.prototype.toString.call(response)
      }
      break
  }
  return result
}

export const genStringBody = (body?: BodyInit) => {
  if (!body) {
    return null
  }
  let result: string
  try {
    if (typeof body === 'string') {
      const first = body.trimStart()[0]
      // JSON is masked by filterBody, and may contain '&' in its values
      result = first === '{' || first === '[' ? body : obscureFormFields(body)
    } else if (isIterable(body)) {
      // FormData or URLSearchParams or Array
      const arr = []
      for (const [key, value] of <FormData | URLSearchParams>body) {
        arr.push(`${key}=${typeof value === 'string' ? obscureParam(key, value) : '[object Object]'}`)
      }
      result = arr.join(',')
    } else if (isBinary(body)) {
      result = 'byte data'
    } else if (isPureObject(body)) {
      // overriding ArrayBufferView which is not convertable to string
      result = <any>body
    } else {
      result = `can't parse body ${typeof body}`
    }
    return result
  } catch (_) {
    return "can't parse body"
  }
}

export const genGetDataByUrl = (url: string, getData: Record<string, any> = {}) => {
  if (!isPureObject(getData)) {
    getData = {}
  }
  let query: string[] = url ? url.split('?') : [] // a.php?b=c&d=?e => ['a.php', 'b=c&d=', 'e']
  query.shift() // => ['b=c&d=', 'e']
  if (query.length > 0) {
    query = query.join('?').split('&') // => 'b=c&d=?e' => ['b=c', 'd=?e']
    for (const q of query) {
      const kv = q.split('=')
      try {
        getData[kv[0]] = decodeURIComponent(kv[1])
      } catch (e) {
        // "URIError: URI malformed" will be thrown when `kv[1]` contains "%", so just use raw data
        // @issue #470
        // @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Malformed_URI
        getData[kv[0]] = kv[1]
      }
    }
  }
  return getData
}

export const genFormattedBody = (body?: BodyInit) => {
  if (!body) {
    return null
  }
  let result: string | { [key: string]: string }

  if (typeof body === 'string') {
    try {
      // '{a:1}' =>
      result = JSON.parse(body)
    } catch (e) {
      // 'a=1&b=2' => try to parse as query
      const arr = body.split('&')
      result = {}
      // eslint-disable-next-line
      for (let q of arr) {
        const kv = q.split('=')
        result[kv[0]] = kv[1] === undefined ? 'undefined' : kv[1]
      }
    }
  } else if (isIterable(body)) {
    // FormData or URLSearchParams or Array
    result = {}
    for (const [key, value] of <FormData | URLSearchParams>body) {
      result[key] = typeof value === 'string' ? value : '[object Object]'
    }
  } else if (isBinary(body)) {
    result = '[byte data]'
  } else if (isPureObject(body)) {
    result = <any>body
  } else {
    result = `can't parse body ${typeof body}`
  }
  return result
}

export function isPureObject(input: any): input is Record<any, any> {
  return null !== input && typeof input === 'object'
}

export function isIterable(value: any) {
  if (value === null || value === undefined) {
    return false
  }
  if (ArrayBuffer.isView(value)) {
    return false
  }
  return typeof Symbol !== 'undefined' && typeof value[Symbol.iterator] === 'function'
}

export function formatByteSize(bytes: number) {
  if (bytes <= 0) {
    // shouldn't happen?
    return ''
  }
  if (bytes >= 1000 * 1000) {
    return (bytes / 1000 / 1000).toFixed(1) + ' MB'
  }
  if (bytes >= 1000) {
    return (bytes / 1000).toFixed(1) + ' KB'
  }
  return `${bytes}B`
}

export const getURL = (url: string | URL, base: string = window.location.href) => new URL(String(url), base)

/** What relative urls of a context resolve against: <base href>, else the location. */
export const documentBase = (context: typeof globalThis) =>
  context.document?.baseURI || context.location?.href || window.location.href

export function utf8Length(str: string) {
  let bytes = 0
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    if (c < 0x80) bytes += 1
    else if (c < 0x800) bytes += 2
    else if (c >= 0xd800 && c < 0xdc00 && i + 1 < str.length) {
      bytes += 4
      i++
    } else bytes += 3
  }
  return bytes
}

export const shouldCapture = (capture: boolean | ((url: string) => boolean) | undefined, url: string) => {
  if (typeof capture === 'function') {
    try {
      return capture(url)
    } catch {
      return false
    }
  }
  return capture !== false
}
