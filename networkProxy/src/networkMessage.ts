import {
  RequestResponseData,
  INetworkMessage,
  httpMethod,
  RequestState,
} from './types'
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
  requestType: 'xhr' | 'fetch' | 'ping' | 'custom' | 'beacon' | 'graphql' = 'xhr'
  requestHeader: HeadersInit = {}
  response: string
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
    private readonly sanitize: (data: RequestResponseData) => RequestResponseData | null,
  ) {}

  getMessage(): INetworkMessage | null {
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

    if (!messageInfo) return null;

    const isGraphql = messageInfo.url.includes("/graphql");
    if (isGraphql && messageInfo.response.body && typeof messageInfo.response.body === 'string') {
      const isError = messageInfo.response.body.includes("errors");
      messageInfo.status = isError ? 400 : 200;
      this.requestType = 'graphql';
    }

    return {
      requestType: this.requestType,
      method: messageInfo.method as httpMethod,
      url: messageInfo.url,
      request: JSON.stringify(messageInfo.request),
      response: JSON.stringify(messageInfo.response),
      status: messageInfo.status,
      startTime: this.startTime,
      duration: this.duration,
      responseSize: this.responseSize,
    }
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
