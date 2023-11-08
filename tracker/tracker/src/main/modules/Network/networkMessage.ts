import { NetworkRequest } from '../../app/messages.gen.js'
import { RequestResponseData } from './types.js'
import { getTimeOrigin } from '../../utils.js'

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

/**
 * I know we're not using most of the information from this class
 * but it can be useful in the future if we will decide to display more stuff in our ui
 * */

export default class NetworkMessage {
  id = ''
  name?: string = ''
  method: httpMethod = ''
  url = ''
  status = 0
  statusText?: string = ''
  cancelState?: 0 | 1 | 2 | 3 = 0
  readyState?: RequestState = 0
  header: { [key: string]: string } = {}
  responseType: XMLHttpRequest['responseType'] = ''
  requestType: 'xhr' | 'fetch' | 'ping' | 'custom' | 'beacon'
  requestHeader: HeadersInit = {}
  response: any
  responseSize = 0 // bytes
  responseSizeText = ''
  startTime = 0
  endTime = 0
  duration = 0
  getData: { [key: string]: string } = {}
  requestData: string | null = null

  constructor(
    private readonly ignoredHeaders: boolean | string[] = [],
    private readonly setSessionTokenHeader: (cb: (name: string, value: string) => void) => void,
    private readonly sanitize: (data: RequestResponseData) => RequestResponseData,
  ) {}

  getMessage() {
    const { reqHs, resHs } = this.writeHeaders()
    const request = {
      headers: reqHs,
      body: this.method === 'GET' ? JSON.stringify(this.getData) : this.requestData,
    }
    const response = { headers: resHs, body: this.response }

    const messageInfo = this.sanitize({
      url: this.url,
      method: this.method,
      status: this.status,
      request,
      response,
    })

    return NetworkRequest(
      this.requestType,
      messageInfo.method,
      messageInfo.url,
      JSON.stringify(messageInfo.request),
      JSON.stringify(messageInfo.response),
      messageInfo.status,
      this.startTime + getTimeOrigin(),
      this.duration,
      this.responseSize,
    )
  }

  writeHeaders() {
    const reqHs: Record<string, string> = {}
    Object.entries(this.requestHeader).forEach(([key, value]) => {
      if (this.isHeaderIgnored(key)) return
      reqHs[key] = value
    })
    this.setSessionTokenHeader((name, value) => {
      reqHs[name] = value
    })
    const resHs: Record<string, string> = {}
    Object.entries(this.header).forEach(([key, value]) => {
      if (this.isHeaderIgnored(key)) return
      resHs[key] = value
    })
    return { reqHs, resHs }
  }

  isHeaderIgnored(key: string) {
    if (Array.isArray(this.ignoredHeaders)) {
      return this.ignoredHeaders.map((k) => k.toLowerCase()).includes(key.toLowerCase())
    } else {
      return this.ignoredHeaders
    }
  }
}
