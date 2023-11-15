import { NetworkRequest } from '../../../common/messages.gen.js'
import NetworkMessage from './networkMessage.js'
import { RequestResponseData } from './types.js'
import { genStringBody, getURL } from './utils.js'

// https://fetch.spec.whatwg.org/#concept-bodyinit-extract
const getContentType = (data?: BodyInit) => {
  if (data instanceof Blob) {
    return data.type
  }
  if (data instanceof FormData) {
    return 'multipart/form-data'
  }
  if (data instanceof URLSearchParams) {
    return 'application/x-www-form-urlencoded;charset=UTF-8'
  }
  return 'text/plain;charset=UTF-8'
}

export class BeaconProxyHandler<T extends typeof navigator.sendBeacon> implements ProxyHandler<T> {
  constructor(
    private readonly ignoredHeaders: boolean | string[],
    private readonly setSessionTokenHeader: (cb: (name: string, value: string) => void) => void,
    private readonly sanitize: (data: RequestResponseData) => RequestResponseData,
    private readonly sendMessage: (item: NetworkRequest) => void,
    private readonly isServiceUrl: (url: string) => boolean,
  ) {}

  public apply(target: T, thisArg: T, argsList: any[]) {
    const urlString: string = argsList[0]
    const data: BodyInit = argsList[1]
    const item = new NetworkMessage(this.ignoredHeaders, this.setSessionTokenHeader, this.sanitize)
    if (this.isServiceUrl(urlString)) {
      return target.apply(thisArg, argsList)
    }
    const url = getURL(urlString)
    item.method = 'POST'
    item.url = urlString
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
    item.requestData = genStringBody(data)

    if (!item.startTime) {
      item.startTime = performance.now()
    }

    const isSuccess = target.apply(thisArg, argsList)
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

    this.sendMessage(item.getMessage())
    return isSuccess
  }
}

export default class BeaconProxy {
  public static origSendBeacon = window?.navigator?.sendBeacon

  public static hasSendBeacon() {
    return !!BeaconProxy.origSendBeacon
  }

  public static create(
    ignoredHeaders: boolean | string[],
    setSessionTokenHeader: (cb: (name: string, value: string) => void) => void,
    sanitize: (data: RequestResponseData) => RequestResponseData,
    sendMessage: (item: NetworkRequest) => void,
    isServiceUrl: (url: string) => boolean,
  ) {
    if (!BeaconProxy.hasSendBeacon()) {
      return undefined
    }
    return new Proxy(
      BeaconProxy.origSendBeacon,
      new BeaconProxyHandler(
        ignoredHeaders,
        setSessionTokenHeader,
        sanitize,
        sendMessage,
        isServiceUrl,
      ),
    )
  }
}
