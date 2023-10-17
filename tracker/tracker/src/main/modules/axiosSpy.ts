import type App from '../app/index.js'
import { NetworkRequest } from '../app/messages.gen.js'
import { getTimeOrigin } from '../utils.js'
import type { RequestResponseData, Options } from './network.js'
import { getExceptionMessage } from './exception.js'

interface RawAxiosHeaders {
  [key: string]: string
}

interface AxiosRequestConfig {
  url: string
  method?: string
  baseURL?: string
  status?: number
  headers: {
    toJSON(): RawAxiosHeaders
  }
  params?: any
  data?: any
}

interface InternalAxiosRequestConfig extends AxiosRequestConfig {
  __openreplay_timing: number
  headers: {
    toJSON(): RawAxiosHeaders
    set(name: string, value: string): void
  }
}

interface AxiosResponse<T = any> {
  data: T
  status: number
  statusText: string
  headers: {
    toJSON(): RawAxiosHeaders
  }
  config: InternalAxiosRequestConfig
  request?: any
  response?: AxiosRequestConfig
}

export interface AxiosInstance extends Record<string, any> {
  getUri: (config?: AxiosRequestConfig) => string
  interceptors: {
    request: AxiosInterceptorManager<InternalAxiosRequestConfig>
    response: AxiosInterceptorManager<AxiosResponse>
  }
}

export interface AxiosInterceptorOptions {
  synchronous?: boolean
}

export interface AxiosInterceptorManager<V> {
  use(
    onFulfilled?: ((value: V) => V | Promise<V>) | null,
    onRejected?: ((error: any) => any) | null,
    options?: AxiosInterceptorOptions,
  ): number

  eject?: (id: number) => void
  clear?: () => void
}

export default function (
  app: App,
  instance: AxiosInstance,
  opts: Options,
  sanitize: (data: RequestResponseData) => RequestResponseData | null,
  stringify: (data: { headers: Record<string, string>; body: any }) => string,
) {
  app.debug.log('Openreplay: attaching axios spy to instance', instance)

  function captureResponseData(axiosResponseObj: AxiosResponse) {
    app.debug.log('Openreplay: capturing axios response data', axiosResponseObj)
    const { headers: reqHs, data: reqData, method, url, baseURL } = axiosResponseObj.config
    const { data: rData, headers: rHs, status: globStatus, response } = axiosResponseObj
    const { data: resData, headers: resHs, status: resStatus } = response || {}

    const ihOpt = opts.ignoreHeaders
    const isHIgnoring = Array.isArray(ihOpt) ? (name: string) => ihOpt.includes(name) : () => ihOpt

    function writeHeader(hsObj: Record<string, string>, header: [string, string]) {
      if (!isHIgnoring(header[0])) {
        hsObj[header[0]] = header[1]
      }
    }

    let requestHs: Record<string, string> = {}
    let responseHs: Record<string, string> = {}
    if (reqHs.toJSON) {
      requestHs = reqHs.toJSON()
    } else if (reqHs instanceof Headers) {
      reqHs.forEach((v, n) => writeHeader(requestHs, [n, v]))
    } else if (Array.isArray(reqHs)) {
      reqHs.forEach((h: [string, string]) => writeHeader(requestHs, h))
    } else if (typeof reqHs === 'object') {
      Object.entries(reqHs).forEach((h) => writeHeader(requestHs, h as unknown as [string, string]))
    }

    const usedResHeader = resHs ? resHs : rHs
    if (usedResHeader.toJSON) {
      responseHs = usedResHeader.toJSON()
    } else if (usedResHeader instanceof Headers) {
      usedResHeader.forEach((v, n) => writeHeader(responseHs, [n, v]))
    } else if (Array.isArray(usedResHeader)) {
      usedResHeader.forEach((h: [string, string]) => writeHeader(responseHs, h))
    } else if (typeof usedResHeader === 'object') {
      Object.entries(usedResHeader as unknown as Record<string, string>).forEach(
        ([n, v]: [string, string]) => {
          if (!isHIgnoring(n)) responseHs[n] = v
        },
      )
    }

    const reqResInfo = sanitize({
      url,
      method: method || '',
      status: globStatus || resStatus || 0,
      request: {
        headers: requestHs,
        body: reqData,
      },
      response: {
        headers: responseHs,
        body: resData || rData,
      },
    })
    if (!reqResInfo) {
      app.debug.log('Openreplay: empty request/response info, skipping')
      return
    }
    const requestStart = axiosResponseObj.config.__openreplay_timing
    const duration = performance.now() - requestStart

    app.debug.log('Openreplay: final req object', reqResInfo)
    app.send(
      NetworkRequest(
        'xhr',
        String(method),
        String(reqResInfo.url),
        stringify(reqResInfo.request),
        stringify(reqResInfo.response),
        reqResInfo.status,
        requestStart + getTimeOrigin(),
        duration,
        0,
      ),
    )
  }

  function getStartTime(config: InternalAxiosRequestConfig) {
    app.debug.log('Openreplay: capturing API request', config)
    config.__openreplay_timing = performance.now()
    if (opts.sessionTokenHeader) {
      const header =
        typeof opts.sessionTokenHeader === 'string'
          ? opts.sessionTokenHeader
          : 'X-OpenReplay-Session-Token'
      const headerValue = app.getSessionToken()
      if (headerValue) {
        config.headers.set(header, headerValue)
      }
    }
    return config
  }

  function captureNetworkRequest(response: AxiosResponse) {
    if (opts.failuresOnly) return response
    captureResponseData(response)
    return response
  }

  function captureNetworkError(error: Record<string, any>) {
    app.debug.log('Openreplay: capturing API request error', error)
    if (isAxiosError(error) && Boolean(error.response)) {
      captureResponseData(error.response as AxiosResponse)
    } else if (error instanceof Error) {
      app.send(getExceptionMessage(error, []))
    }
    return Promise.reject(error)
  }

  function logRequestError(ev: any) {
    app.debug.log('Openreplay: failed API request, skipping', ev)
  }

  const reqInt = instance.interceptors.request.use(getStartTime, logRequestError, {
    synchronous: true,
  })
  const resInt = instance.interceptors.response.use(captureNetworkRequest, captureNetworkError, {
    synchronous: true,
  })

  app.attachStopCallback(() => {
    instance.interceptors.request.eject?.(reqInt)
    instance.interceptors.response.eject?.(resInt)
  })
}

function isAxiosError(payload: Record<string, any>) {
  return isObject(payload) && payload.isAxiosError === true
}

function isObject(thing: any) {
  return thing !== null && typeof thing === 'object'
}
