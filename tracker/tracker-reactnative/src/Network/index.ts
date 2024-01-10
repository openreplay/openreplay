import FetchProxy from './fetchProxy';
import XHRProxy from './xhrProxy';
import type { RequestResponseData } from './types';

export default function setProxy(
  context: typeof globalThis,
  ignoredHeaders: boolean | string[],
  sanitize: (data: RequestResponseData) => RequestResponseData,
  sendMessage: (message: any) => void,
  isServiceUrl: (url: string) => boolean,
  tokenUrlMatcher?: (url: string) => boolean,
  mode: 'fetch' | 'xhr' | 'all' = 'fetch'
) {
  if (context.XMLHttpRequest && mode !== 'fetch') {
    context.XMLHttpRequest = XHRProxy.create(
      ignoredHeaders,
      sanitize,
      sendMessage,
      isServiceUrl,
      tokenUrlMatcher
    );
  }
  if (context.fetch && mode !== 'xhr') {
    context.fetch = FetchProxy.create(
      ignoredHeaders,
      sanitize,
      sendMessage,
      isServiceUrl,
      tokenUrlMatcher
    );
  }
}
