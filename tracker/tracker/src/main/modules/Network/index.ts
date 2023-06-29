import FetchProxy from './fetchProxy.js'
import XHRProxy from './xhrProxy.js'
import { RequestResponseData } from './types.js'
import { NetworkRequest } from '../../../common/messages.gen.js'

export default function setProxy(
  context: typeof globalThis,
  ignoredHeaders: boolean | string[],
  setSessionTokenHeader: (cb: (name: string, value: string) => void) => void,
  sanitize: (data: RequestResponseData) => RequestResponseData,
  sendMessage: (message: NetworkRequest) => void,
  isServiceUrl: (url: string) => boolean,
) {
  context.XMLHttpRequest = XHRProxy.create(
    ignoredHeaders,
    setSessionTokenHeader,
    sanitize,
    sendMessage,
    isServiceUrl,
  )
  context.fetch = FetchProxy.create(
    ignoredHeaders,
    setSessionTokenHeader,
    sanitize,
    sendMessage,
    isServiceUrl,
  )
}
