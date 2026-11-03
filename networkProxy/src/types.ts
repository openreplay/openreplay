export interface RequestResponseData {
  status: number
  readonly method: string
  url: string
  request: {
    body: string | null
    headers: Record<string, string>
  }
  response: {
    body: string | null
    headers: Record<string, string>
  }
}

export interface INetworkMessage {
  requestType: 'xhr' | 'fetch' | 'ping' | 'custom' | 'beacon' | 'graphql',
  method: httpMethod,
  url: string,
  /** stringified JSON { headers: {}, body: {} } */
  request: string,
  /** stringified JSON { headers: {}, body: {} } */
  response: string,
  status: number,
  startTime: number,
  duration: number,
  responseSize: number,
}

export type httpMethod =
  // '' is a rare case of error
  '' | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'CONNECT' | 'OPTIONS' | 'TRACE' | 'PATCH'

export enum RequestState {
  UNSENT = 0,
  OPENED = 1,
  HEADERS_RECEIVED = 2,
  LOADING = 3,
  DONE = 4,
}

export interface NetworkProxyOptions {
  sendMessage: (message: INetworkMessage) => void
  /** `true` drops all headers. Default: [] */
  ignoredHeaders?: boolean | string[]
  setSessionTokenHeader?: (cb: (name: string, value: string) => void) => void
  /** Return `null` to drop the request. */
  sanitize?: (data: RequestResponseData) => RequestResponseData | null
  /** Requests to these urls are passed through untouched. */
  isServiceUrl?: (url: string) => boolean
  /** The session token header is only added to urls this returns true for. */
  tokenUrlMatcher?: (url: string) => boolean
  /**
   * `false` (or false for a url) leaves request and response bodies out of messages; response sizes are
   * still measured. Default: true
   */
  captureBody?: boolean | ((url: string) => boolean)
  modules?: { xhr?: boolean; fetch?: boolean; beacon?: boolean }
}

/** What the proxies of one createNetworkProxy call share. */
export interface ProxyConfig {
  ignoredHeaders: boolean | string[]
  setSessionTokenHeader: (cb: (name: string, value: string) => void) => void
  sanitize: (data: RequestResponseData) => RequestResponseData | null
  sendMessage: (message: INetworkMessage) => void
  isServiceUrl: (url: string) => boolean
  tokenUrlMatcher?: (url: string) => boolean
  captureBody?: boolean | ((url: string) => boolean)
  /** set by restore(): the proxies pass everything through */
  disabled?: boolean
}
