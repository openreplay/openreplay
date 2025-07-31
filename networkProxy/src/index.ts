import BeaconProxy from "./beaconProxy";
import FetchProxy from "./fetchProxy";
import XHRProxy from "./xhrProxy";
import { INetworkMessage, RequestResponseData } from "./types";

export {
  BeaconProxy,
  FetchProxy,
  XHRProxy,
  INetworkMessage,
  RequestResponseData,
};

const warn = (api: string) => {
  const str = `Openreplay: Can't find ${api} in global context.`;
  console.warn(str);
};

const OR_FLAG   = Symbol('OpenReplayProxyOriginal')
const isProxied = (fn: any): fn is Function & { [OR_FLAG]: Function } =>
  !!fn && fn[OR_FLAG] !== undefined
const unwrap    = <T extends Function>(fn: T) =>
  isProxied(fn) ? (fn as any)[OR_FLAG] as T : fn
const wrap      = <T extends Function>(proxy: T, orig: Function) => {
  (proxy as any)[OR_FLAG] = orig
  return proxy
}

/**
 * Creates network proxies for XMLHttpRequest, fetch, and sendBeacon to intercept and monitor network requests and
 * responses.
 *
 * @param {Window | typeof globalThis} context - The global context object (e.g., window or globalThis).
 * @param {boolean | string[]} ignoredHeaders - Headers to ignore from requests. If `true`, all headers are ignored; if
 *   an array of strings, those header names are ignored.
 * @param {(cb: (name: string, value: string) => void) => void} setSessionTokenHeader - Function to set a session token
 *   header; accepts a callback that sets the header name and value.
 * @param {(data: RequestResponseData) => RequestResponseData | null} sanitize - Function to sanitize request and
 *   response data; should return sanitized data or `null` to ignore the data.
 * @param {(message: INetworkMessage) => void} sendMessage - Function to send network messages for further processing
 *   or logging.
 * @param {(url: string) => boolean} isServiceUrl - Function to determine if a URL is a service URL that should be
 *   ignored by the proxy.
 * @param {Object} [modules] - Modules to apply the proxies to.
 * @param {boolean} [modules.xhr=true] - Whether to proxy XMLHttpRequest.
 * @param {boolean} [modules.fetch=true] - Whether to proxy the fetch API.
 * @param {boolean} [modules.beacon=true] - Whether to proxy navigator.sendBeacon.
 * @param {(url: string) => boolean} [tokenUrlMatcher] - Optional function; the session token header will only be
 *   applied to requests matching this function.
 *
 * @returns {void}
 */
export default function createNetworkProxy(
  context: typeof globalThis,
  ignoredHeaders: boolean | string[],
  setSessionTokenHeader: (cb: (name: string, value: string) => void) => void,
  sanitize: (data: RequestResponseData) => RequestResponseData | null,
  sendMessage: (message: INetworkMessage) => void,
  isServiceUrl: (url: string) => boolean,
  modules: { xhr: boolean; fetch: boolean; beacon: boolean } = {
    xhr: true,
    fetch: true,
    beacon: true,
  },
  tokenUrlMatcher?: (url: string) => boolean,
): void {
  if (!context) return;
  if (modules.xhr) {
    const original = unwrap(context.XMLHttpRequest)
    if (!original) warn('XMLHttpRequest')
    else {
      context.XMLHttpRequest = wrap(
        XHRProxy.create(
          ignoredHeaders,
          setSessionTokenHeader,
          sanitize,
          sendMessage,
          isServiceUrl,
          tokenUrlMatcher,
        ),
        original,
      )
    }
  }
  if (modules.fetch) {
    const original = unwrap(context.fetch)
    if (!original) warn('fetch')
    else {
      context.fetch = wrap(
        FetchProxy.create(
          ignoredHeaders,
          setSessionTokenHeader,
          sanitize,
          sendMessage,
          isServiceUrl,
          tokenUrlMatcher,
        ) as typeof context.fetch,
        original,
      )
    }
  }

  if (modules.beacon && context.navigator?.sendBeacon) {
    const original = unwrap(context.navigator.sendBeacon)
    context.navigator.sendBeacon = wrap(
      BeaconProxy.create(
        original,
        ignoredHeaders,
        setSessionTokenHeader,
        sanitize,
        sendMessage,
        isServiceUrl,
      ),
      original,
    )
  }
}
