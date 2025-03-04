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

const getWarning = (api: string) => {
  const str = `Openreplay: Can't find ${api} in global context.`;
  console.warn(str);
};

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
    if (context.XMLHttpRequest) {
      context.XMLHttpRequest = XHRProxy.create(
        ignoredHeaders,
        setSessionTokenHeader,
        sanitize,
        sendMessage,
        isServiceUrl,
        tokenUrlMatcher,
      );
    } else {
      getWarning("XMLHttpRequest");
    }
  }
  if (modules.fetch) {
    if (context.fetch) {
      context.fetch = FetchProxy.create(
        ignoredHeaders,
        setSessionTokenHeader,
        sanitize,
        sendMessage,
        isServiceUrl,
        tokenUrlMatcher,
      );
    } else {
      getWarning("fetch");
    }
  }
  if (modules.beacon) {
    if (context.navigator?.sendBeacon) {
      const origBeacon = context.navigator.sendBeacon
      context.navigator.sendBeacon = BeaconProxy.create(
        origBeacon,
        ignoredHeaders,
        setSessionTokenHeader,
        sanitize,
        sendMessage,
        isServiceUrl,
      );
    }
  }
}
