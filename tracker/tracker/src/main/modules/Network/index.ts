import FetchProxy from './fetchProxy.js'
import XHRProxy from './xhrProxy.js'
import { RequestResponseData } from './types.js'
import { NetworkRequest } from '../../../common/messages.gen.js'

const getWarning = (api: string) =>
  console.warn(`Openreplay: Can't find ${api} in global context. 
If you're using serverside rendering in your app, make sure that tracker is loaded dynamically, otherwise ${api} won't be tracked.`)

export default function setProxy(
  context: typeof globalThis,
  ignoredHeaders: boolean | string[],
  setSessionTokenHeader: (cb: (name: string, value: string) => void) => void,
  sanitize: (data: RequestResponseData) => RequestResponseData,
  sendMessage: (message: NetworkRequest) => void,
  isServiceUrl: (url: string) => boolean,
) {
  if (context.XMLHttpRequest) {
    context.XMLHttpRequest = XHRProxy.create(
      ignoredHeaders,
      setSessionTokenHeader,
      sanitize,
      sendMessage,
      isServiceUrl,
    )
  } else {
    getWarning('XMLHttpRequest')
  }
  if (context.fetch) {
    context.fetch = FetchProxy.create(
      ignoredHeaders,
      setSessionTokenHeader,
      sanitize,
      sendMessage,
      isServiceUrl,
    )
  } else {
    getWarning('fetch')
  }
}
