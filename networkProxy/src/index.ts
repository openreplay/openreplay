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
