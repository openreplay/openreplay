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

export const genStringBody = (body?: BodyInit) => {
  if (!body) {
    return null
  }
  let result: string

  if (typeof body === 'string') {
    if (body[0] === '{' || body[0] === '[') {
      result = body
    }
    // 'a=1&b=2' => try to parse as query
    const arr = body.split('&')
    if (arr.length === 1) {
      // not a query, parse as original string
      result = body
    } else {
      // 'a=1&b=2&c' => parse as query
      result = arr.join(',')
    }
  } else if (isIterable(body)) {
    // FormData or URLSearchParams or Array
    const arr = []
    for (const [key, value] of <FormData | URLSearchParams>body) {
      arr.push(`${key}=${typeof value === 'string' ? value : '[object Object]'}`)
    }
    result = arr.join(',')
  } else if (
    body instanceof Blob ||
    body instanceof ReadableStream ||
    body instanceof ArrayBuffer
  ) {
    result = 'byte data'
  } else if (isPureObject(body)) {
    // overriding ArrayBufferView which is not convertable to string
    result = <any>body
  } else {
    result = `can't parse body ${typeof body}`
  }
  return result
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
  } else if (
    body instanceof Blob ||
    body instanceof ReadableStream ||
    body instanceof ArrayBuffer
  ) {
    result = 'byte data'
  } else if (isPureObject(body)) {
    // overriding ArrayBufferView which is not convertable to string
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

export const getURL = (urlString: string) => {
  if (urlString.startsWith('//')) {
    const baseUrl = new URL(window.location.href)
    urlString = `${baseUrl.protocol}${urlString}`
  }
  if (urlString.startsWith('http')) {
    return new URL(urlString)
  } else {
    return new URL(urlString, window.location.href)
  }
}
