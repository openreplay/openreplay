// @ts-nocheck
/**
 * I took inspiration in few stack exchange posts
 * and Tencent vConsole library (MIT)
 * by wrapping the XMLHttpRequest object in a Proxy
 * we can intercept the network requests
 * in not-so-hacky way
 * */

import NetworkMessage, { RequestState } from './networkMessage'
import { genGetDataByUrl, formatByteSize, genStringBody, getStringResponseByType } from './utils'
import { RequestResponseData } from './types'

export class XHRProxyHandler<T extends XMLHttpRequest> implements ProxyHandler<T> {
  public XMLReq: XMLHttpRequest
  public item: NetworkMessage

  constructor(
    XMLReq: XMLHttpRequest,
    private readonly ignoredHeaders: boolean | string[],
    private readonly sanitize: (data: RequestResponseData) => RequestResponseData,
    private readonly sendMessage: (message: any) => void,
    private readonly isServiceUrl: (url: string) => boolean,
    private readonly tokenUrlMatcher?: (url: string) => boolean,
  ) {
    this.XMLReq = XMLReq
    this.XMLReq.onreadystatechange = () => {
      this.onReadyStateChange()
    }
    this.XMLReq.onabort = () => {
      this.onAbort()
    }
    this.XMLReq.ontimeout = () => {
      this.onTimeout()
    }
    this.item = new NetworkMessage(ignoredHeaders, sanitize)
    this.item.requestType = 'xhr'
  }

  public get(target: T, key: string) {
    switch (key) {
      case 'open':
        return this.getOpen(target)
      case 'send':
        return this.getSend(target)
      case 'setRequestHeader':
        return this.getSetRequestHeader(target)
      default:
        // eslint-disable-next-line no-case-declarations
        const value = Reflect.get(target, key)
        if (typeof value === 'function') {
          return value.bind(target)
        } else {
          return value
        }
    }
  }

  public set(target: T, key: string, value: (args: any[]) => any) {
    switch (key) {
      case 'onreadystatechange':
        return this.setOnReadyStateChange(target, key, value)
      case 'onabort':
        return this.setOnAbort(target, key, value)
      case 'ontimeout':
        return this.setOnTimeout(target, key, value)
      default:
      // not tracked methods
    }
    return Reflect.set(target, key, value)
  }

  public onReadyStateChange() {
    if (this.item.url && this.isServiceUrl(this.item.url)) return
    this.item.readyState = this.XMLReq.readyState
    this.item.responseType = this.XMLReq.responseType
    this.item.endTime = performance.now()
    this.item.duration = this.item.endTime - this.item.startTime
    this.updateItemByReadyState()
    setTimeout(() => {
      this.item.response = getStringResponseByType(this.item.responseType, this.item.response)
    }, 0)

    if (this.XMLReq.readyState === RequestState.DONE) {
      const msg = this.item.getMessage()
      this.sendMessage(msg[0], msg[1], msg[2], msg[3], msg[4], msg[5])
    }
  }

  public onAbort() {
    this.item.cancelState = 1
    this.item.statusText = 'Abort'

    const msg = this.item.getMessage()
    this.sendMessage(msg[0], msg[1], msg[2], msg[3], msg[4], msg[5])
  }

  public onTimeout() {
    this.item.cancelState = 3
    this.item.statusText = 'Timeout'

    const msg = this.item.getMessage()
    this.sendMessage(msg[0], msg[1], msg[2], msg[3], msg[4], msg[5])
  }

  protected getOpen(target: T) {
    const targetFunction = Reflect.get(target, 'open')
    return (...args: any[]) => {
      const method = args[0]
      const url = args[1]
      this.item.method = method ? method.toUpperCase() : 'GET'
      this.item.url = url || ''
      this.item.name = this.item.url.replace(new RegExp('/*$'), '').split('/').pop() || ''
      this.item.getData = genGetDataByUrl(this.item.url, {})
      return targetFunction.apply(target, args)
    }
  }

  protected getSend(target: T) {
    const targetFunction = Reflect.get(target, 'send')
    return (...args: any[]) => {
      const data: XMLHttpRequestBodyInit = args[0]
      this.item.requestData = genStringBody(data)
      return targetFunction.apply(target, args)
    }
  }

  protected getSetRequestHeader(target: T) {
    const targetFunction = Reflect.get(target, 'setRequestHeader')
    return (...args: any[]) => {
      if (!this.item.requestHeader) {
        this.item.requestHeader = {}
      }
      // @ts-ignore
      this.item.requestHeader[args[0]] = args[1]
      return targetFunction.apply(target, args)
    }
  }

  protected setOnReadyStateChange(target: T, key: string, orscFunction: (args: any[]) => any) {
    return Reflect.set(target, key, (...args: any[]) => {
      this.onReadyStateChange()
      orscFunction?.apply(target, args)
    })
  }

  protected setOnAbort(target: T, key: string, oaFunction: (args: any[]) => any) {
    return Reflect.set(target, key, (...args: any[]) => {
      this.onAbort()
      oaFunction.apply(target, args)
    })
  }

  protected setOnTimeout(target: T, key: string, otFunction: (args: any[]) => any) {
    return Reflect.set(target, key, (...args: any[]) => {
      this.onTimeout()
      otFunction.apply(target, args)
    })
  }

  /**
   * Update item's properties according to readyState.
   */
  protected updateItemByReadyState() {
    switch (this.XMLReq.readyState) {
      case RequestState.UNSENT:
      case RequestState.OPENED:
        this.item.status = RequestState.UNSENT
        this.item.statusText = 'Pending'
        if (!this.item.startTime) {
          this.item.startTime = performance.now()
        }
        break
      case RequestState.HEADERS_RECEIVED:
        this.item.status = this.XMLReq.status
        this.item.statusText = 'Loading'
        this.item.header = {}
        // eslint-disable-next-line no-case-declarations
        const header = this.XMLReq.getAllResponseHeaders() || '',
          headerArr = header.split('\n')
        // extract plain text to key-value format
        for (let i = 0; i < headerArr.length; i++) {
          const line = headerArr[i]
          if (!line) {
            continue
          }
          const arr = line.split(': ')
          const key = arr[0]
          this.item.header[key] = arr.slice(1).join(': ')
        }
        break
      case RequestState.LOADING:
        this.item.status = this.XMLReq.status
        this.item.statusText = 'Loading'
        if (!!this.XMLReq.response && this.XMLReq.response.length) {
          this.item.responseSize = this.XMLReq.response.length
          this.item.responseSizeText = formatByteSize(this.item.responseSize)
        }
        break
      case RequestState.DONE:
        // `XMLReq.abort()` will change `status` from 200 to 0, so use previous value in this case
        this.item.status = this.XMLReq.status || this.item.status || 0
        // show status code when request completed
        this.item.statusText = String(this.item.status)
        this.item.endTime = performance.now()
        this.item.duration = this.item.endTime - (this.item.startTime || this.item.endTime)
        this.item.response = this.XMLReq.response

        if (!!this.XMLReq.response && this.XMLReq.response.length) {
          this.item.responseSize = this.XMLReq.response.length
          this.item.responseSizeText = formatByteSize(this.item.responseSize)
        }
        break
      default:
        this.item.status = this.XMLReq.status
        this.item.statusText = 'Unknown'
        break
    }
  }
}

export default class XHRProxy {
  public static create(
    ignoredHeaders: boolean | string[],
    sanitize: (data: RequestResponseData) => RequestResponseData,
    sendMessage: (data: any) => void,
    isServiceUrl: (url: string) => boolean,
    tokenUrlMatcher?: (url: string) => boolean,
  ) {
    return new Proxy(XMLHttpRequest, {
      construct(original: any) {
        const XMLReq = new original()
        return new Proxy(
          XMLReq,
          new XHRProxyHandler(
            XMLReq as XMLHttpRequest,
            ignoredHeaders,
            sanitize,
            sendMessage,
            isServiceUrl,
            tokenUrlMatcher,
          ),
        )
      },
    })
  }
}
