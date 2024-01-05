import FetchProxy from './fetchProxy'
import XHRProxy from './xhrProxy'
import type { RequestResponseData } from './types'

export default function setProxy(
  context: typeof globalThis,
  ignoredHeaders: boolean | string[],
  sanitize: (data: RequestResponseData) => RequestResponseData,
  sendMessage: (message: any) => void,
  isServiceUrl: (url: string) => boolean,
  tokenUrlMatcher?: (url: string) => boolean,
) {
  if (context.XMLHttpRequest) {
    context.XMLHttpRequest = XHRProxy.create(
      ignoredHeaders,
      sanitize,
      sendMessage,
      isServiceUrl,
      tokenUrlMatcher,
    )
  }
  if (context.fetch) {
    context.fetch = FetchProxy.create(
      ignoredHeaders,
      sanitize,
      sendMessage,
      isServiceUrl,
      tokenUrlMatcher,
    )
  }
}
