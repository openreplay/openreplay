import type App from '../app/index.js'
import { NetworkRequest } from '../app/messages.gen.js'
import { getTimeOrigin } from '../utils.js'
import type { RequestResponseData, Options } from './network.js'

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
  function captureResponseData(axiosResponseObj: AxiosResponse) {
    const { headers: reqHs, data: reqData, method, url } = axiosResponseObj.config
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
      return
    }
    const requestStart = axiosResponseObj.config.__openreplay_timing
    const duration = performance.now() - requestStart

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
      ),
    )
  }

  function getStartTime(config: InternalAxiosRequestConfig) {
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

  function captureNetworkError(error: any) {
    captureResponseData(error as AxiosResponse)
    return Promise.reject(error)
  }

  const reqInt = instance.interceptors.request.use(getStartTime, null, { synchronous: true })
  const resInt = instance.interceptors.response.use(captureNetworkRequest, captureNetworkError, {
    synchronous: true,
  })

  app.attachStopCallback(() => {
    instance.interceptors.request.eject?.(reqInt)
    instance.interceptors.response.eject?.(resInt)
  })
}
