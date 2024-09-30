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
