import type App from '../app/index.js'
import { NetworkRequest } from '../app/messages.gen.js'
import { getTimeOrigin } from '../utils.js'
import createNetworkProxy, { hookAxios } from '@openreplay/network-proxy'
import type { INetworkMessage } from '@openreplay/network-proxy'

interface RequestData {
  body: string | null
  headers: Record<string, string>
}

interface ResponseData {
  body: any
  headers: Record<string, string>
}

export interface RequestResponseData {
  readonly status: number
  readonly method: string
  url: string
  request: RequestData
  response: ResponseData
}

type Sanitizer = (data: RequestResponseData) => RequestResponseData | null

interface AxiosInterceptorManager {
  use(
    onFulfilled?: (value: any) => any,
    onRejected?: (error: any) => any,
    options?: { synchronous?: boolean },
  ): number
}

/** The part of an axios (0.x or 1.x) instance the network module uses. */
export interface AxiosInstance {
  interceptors: {
    request: AxiosInterceptorManager
    response: AxiosInterceptorManager
  }
  getUri?: (config?: any) => string
}

export interface Options {
  sessionTokenHeader: string | boolean
  failuresOnly: boolean
  ignoreHeaders: Array<string> | boolean
  capturePayload: boolean
  captureInIframes: boolean
  sanitizer?: Sanitizer
  /**
   * Only needed for instances with a custom adapter (native HTTP bridge, mock, `env.fetch`):
   * requests of the default XHR / fetch adapters are captured anyway and aren't recorded twice.
   */
  axiosInstances?: AxiosInstance[]
  tokenUrlMatcher?: (url: string) => boolean
  disabled?: boolean
}

export default function (app: App, opts: Partial<Options> = {}) {
  if (opts.disabled) {
    return
  }
  const options: Options = Object.assign(
    {
      failuresOnly: false,
      ignoreHeaders: ['cookie', 'set-cookie', 'authorization'],
      capturePayload: false,
      sessionTokenHeader: false,
      captureInIframes: true,
    },
    opts,
  )

  const stHeader =
    options.sessionTokenHeader === true ? 'X-OpenReplay-SessionToken' : options.sessionTokenHeader

  function setSessionTokenHeader(setRequestHeader: (name: string, value: string) => void) {
    if (stHeader) {
      const sessionToken = app.getSessionToken()
      if (sessionToken) {
        app.safe(setRequestHeader)(stHeader, sessionToken)
      }
    }
  }

  function sanitize(reqResInfo: RequestResponseData) {
    if (!options.capturePayload || app.sanitizer.privateMode) {
      // @ts-ignore
      delete reqResInfo.request.body
      delete reqResInfo.response.body
    }
    if (options.sanitizer) {
      const resBody = reqResInfo.response.body
      if (typeof resBody === 'string') {
        // Parse response in order to have handy view in sanitization function
        try {
          reqResInfo.response.body = JSON.parse(resBody)
        } catch {}
      }
      return options.sanitizer(reqResInfo)
    }
    return reqResInfo
  }

  const sendMessage = (message: INetworkMessage) => {
    if (options.failuresOnly && message.status < 400) {
      return
    }
    const url = app.sanitizer.privateMode ? '************' : message.url
    app.send(
      NetworkRequest(
        message.requestType,
        message.method,
        url,
        message.request,
        message.response,
        message.status,
        message.startTime + getTimeOrigin(),
        message.duration,
        message.responseSize,
      ),
    )
  }
  const isServiceURL = (url: string) => app.isServiceURL(url)
  const ignoredHeaders = () => (app.sanitizer.privateMode ? true : options.ignoreHeaders)

  const patchWindow = (context: typeof globalThis) => {
    createNetworkProxy(
      context,
      ignoredHeaders(),
      setSessionTokenHeader,
      sanitize,
      sendMessage,
      isServiceURL,
      { xhr: true, fetch: true, beacon: true },
      options.tokenUrlMatcher,
    )
  }

  patchWindow(window)
  options.axiosInstances?.forEach((instance) =>
    hookAxios(
      instance,
      ignoredHeaders(),
      setSessionTokenHeader,
      sanitize,
      sendMessage,
      isServiceURL,
      options.tokenUrlMatcher,
    ),
  )

  if (options.captureInIframes) {
    app.observer.attachContextCallback(app.safe(patchWindow))
  }
}