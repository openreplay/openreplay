import NetworkMessage from './networkMessage.js'
import { INetworkMessage, ProxyConfig, RequestResponseData } from './types.js';
import { documentBase, genStringBody, getURL, shouldCapture, tagOf } from './utils.js'

// https://fetch.spec.whatwg.org/#concept-bodyinit-extract
const getContentType = (data?: BodyInit) => {
  const tag = tagOf(data)
  if (tag === 'Blob' || tag === 'File') {
    return (data as Blob).type
  }
  if (tag === 'FormData') {
    return 'multipart/form-data'
  }
  if (tag === 'URLSearchParams') {
    return 'application/x-www-form-urlencoded;charset=UTF-8'
  }
  return 'text/plain;charset=UTF-8'
}

export class BeaconProxyHandler<T extends typeof navigator.sendBeacon> implements ProxyHandler<T> {
  constructor(
    private readonly config: ProxyConfig,
    private readonly context: typeof globalThis = window,
  ) {}

  public apply(target: T, thisArg: T, argsList: any[]) {
    let item: NetworkMessage | null = null
    try {
      item = this.beforeSend(argsList)
    } catch {}
    const isSuccess = target.apply(thisArg, argsList)
    if (item) {
      try {
        this.afterSend(item, isSuccess)
      } catch {}
    }
    return isSuccess
  }

  private beforeSend(argsList: any[]) {
    if (this.config.disabled) return null
    const urlString = String(argsList[0])
    const data: BodyInit = argsList[1]
    if (this.config.isServiceUrl(urlString)) return null
    const item = new NetworkMessage(this.config.ignoredHeaders, this.config.setSessionTokenHeader, this.config.sanitize)
    const url = getURL(urlString, documentBase(this.context))
    item.method = 'POST'
    item.url = url.toString()
    item.name = (url.pathname.split('/').pop() || '') + url.search
    item.requestType = 'beacon'
    item.requestHeader = { 'Content-Type': getContentType(data) }
    item.status = 0
    item.statusText = 'Pending'

    if (url.search && url.searchParams) {
      item.getData = {}
      for (const [key, value] of url.searchParams) {
        item.getData[key] = value
      }
    }
    if (shouldCapture(this.config.captureBody, item.url)) item.requestData = genStringBody(data)
    item.startTime = performance.now()
    return item
  }

  private afterSend(item: NetworkMessage, isSuccess: boolean) {
    if (isSuccess) {
      item.endTime = performance.now()
      item.duration = item.endTime - (item.startTime || item.endTime)
      item.status = 0
      item.statusText = 'Sent'
      item.readyState = 4
    } else {
      item.status = 500
      item.statusText = 'Unknown'
    }

    const msg = item.getMessage()
    if (msg) {
      this.config.sendMessage(msg)
    }
  }
}

export default class BeaconProxy {
  public static create(
    originalSendBeacon: typeof window.navigator.sendBeacon,
    ignoredHeaders: boolean | string[],
    setSessionTokenHeader: (cb: (name: string, value: string) => void) => void,
    sanitize: (data: RequestResponseData) => RequestResponseData | null,
    sendMessage: (item: INetworkMessage) => void,
    isServiceUrl: (url: string) => boolean,
    context: typeof globalThis = window,
  ) {
    return BeaconProxy.fromConfig(
      { ignoredHeaders, setSessionTokenHeader, sanitize, sendMessage, isServiceUrl },
      originalSendBeacon,
      context,
    )
  }

  public static fromConfig(
    config: ProxyConfig,
    originalSendBeacon: typeof window.navigator.sendBeacon,
    context: typeof globalThis = window,
  ) {
    if (!originalSendBeacon) {
      return undefined
    }
    return new Proxy(originalSendBeacon, new BeaconProxyHandler(config, context))
  }
}
