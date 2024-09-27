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
 * creates network proxy for XHR, fetch and beacon
 * @param context - global context (globalThis, window, etc)
 * @param ignoredHeaders - headers to ignore from request
 * @param setSessionTokenHeader - function to set session token header -- used to mark tracked sessions
 * @param sanitize - function to sanitize request and response data
 * @param sendMessage - function to send message
 * @param isServiceUrl - function to check if url is service url and should be ignored
 * @param modules - modules to apply proxy to
 * @param tokenUrlMatcher - will not apply session token header unless request match this function
 * */
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
) {
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
    if (context?.navigator?.sendBeacon) {
      context.navigator.sendBeacon = BeaconProxy.create(
        ignoredHeaders,
        setSessionTokenHeader,
        sanitize,
        sendMessage,
        isServiceUrl,
      );
    }
  }
}
