import BeaconProxy from "./beaconProxy.js";
import FetchProxy from "./fetchProxy.js";
import XHRProxy from "./xhrProxy.js";
import hookAxios from "./axiosHook.js";
import type { AxiosInstance } from "./axiosHook.js";
import type { INetworkMessage, NetworkProxyOptions, ProxyConfig, RequestResponseData } from "./types.js";

export { BeaconProxy, FetchProxy, XHRProxy, hookAxios };
export type { AxiosInstance, INetworkMessage, NetworkProxyOptions, RequestResponseData };

const warn = (api: string) => {
  const str = `Openreplay: Can't find ${api} in global context.`;
  console.warn(str);
};

// proxy -> what it wraps; a WeakMap leaves the native functions untouched
const originals = new WeakMap<object, any>();
const unwrap = <T>(fn: T): T => (fn && originals.get(fn as object)) || fn;

type Modules = { xhr?: boolean; fetch?: boolean; beacon?: boolean };

/**
 * Creates network proxies for XMLHttpRequest, fetch, and sendBeacon to intercept and monitor network requests and
 * responses.
 *
 * @returns restore(): puts back the originals that are still ours on the context; proxies another library wrapped
 *   (or the app kept a reference to) pass everything through from then on.
 */
export default function createNetworkProxy(context: typeof globalThis, options: NetworkProxyOptions): () => void;
/**
 * @param {boolean | string[]} ignoredHeaders - Headers to ignore from requests. If `true`, all headers are ignored; if
 *   an array of strings, those header names are ignored.
 * @param setSessionTokenHeader - Function to set a session token header; accepts a callback that sets the header name
 *   and value.
 * @param sanitize - Function to sanitize request and response data; should return sanitized data or `null` to ignore
 *   the data.
 * @param sendMessage - Function to send network messages for further processing or logging.
 * @param isServiceUrl - Function to determine if a URL is a service URL that should be ignored by the proxy.
 * @param modules - Which APIs to proxy, all by default.
 * @param tokenUrlMatcher - Optional function; the session token header will only be applied to requests matching
 *   this function.
 */
export default function createNetworkProxy(
  context: typeof globalThis,
  ignoredHeaders: boolean | string[],
  setSessionTokenHeader: (cb: (name: string, value: string) => void) => void,
  sanitize: (data: RequestResponseData) => RequestResponseData | null,
  sendMessage: (message: INetworkMessage) => void,
  isServiceUrl: (url: string) => boolean,
  modules?: Modules,
  tokenUrlMatcher?: (url: string) => boolean,
): () => void;
export default function createNetworkProxy(
  context: typeof globalThis,
  ...args: any[]
): () => void {
  let config: ProxyConfig;
  let modules: Modules;
  const [first] = args;
  if (first && typeof first === "object" && !Array.isArray(first)) {
    const options = first as NetworkProxyOptions;
    config = {
      ignoredHeaders: options.ignoredHeaders ?? [],
      setSessionTokenHeader: options.setSessionTokenHeader ?? (() => {}),
      sanitize: options.sanitize ?? ((data) => data),
      sendMessage: options.sendMessage,
      isServiceUrl: options.isServiceUrl ?? (() => false),
      tokenUrlMatcher: options.tokenUrlMatcher,
      captureBody: options.captureBody,
    };
    modules = options.modules ?? {};
  } else {
    const [ignoredHeaders, setSessionTokenHeader, sanitize, sendMessage, isServiceUrl, mods, tokenUrlMatcher] = args;
    config = { ignoredHeaders, setSessionTokenHeader, sanitize, sendMessage, isServiceUrl, tokenUrlMatcher };
    const m: Modules = mods ?? { xhr: true, fetch: true, beacon: true };
    modules = { xhr: !!m.xhr, fetch: !!m.fetch, beacon: !!m.beacon };
  }

  const restorers: (() => void)[] = [];
  const install = (owner: any, key: string, proxy: unknown, original: unknown) => {
    const own = Object.prototype.hasOwnProperty.call(owner, key);
    owner[key] = proxy;
    originals.set(proxy as object, original);
    restorers.push(() => {
      if (owner[key] !== proxy) return;
      if (own) owner[key] = original;
      else delete owner[key];
    });
  };
  const restore = () => {
    config.disabled = true;
    for (const r of restorers.splice(0)) {
      try {
        r();
      } catch {}
    }
  };
  if (!context) return restore;

  if (modules.xhr !== false) {
    const original = unwrap(context.XMLHttpRequest);
    if (!original) warn("XMLHttpRequest");
    else install(context, "XMLHttpRequest", XHRProxy.fromConfig(config, original, context), original);
  }
  if (modules.fetch !== false) {
    const original = unwrap(context.fetch);
    if (!original) warn("fetch");
    else install(context, "fetch", FetchProxy.fromConfig(config, original, context), original);
  }
  if (modules.beacon !== false && context.navigator?.sendBeacon) {
    const original = unwrap(context.navigator.sendBeacon);
    install(context.navigator, "sendBeacon", BeaconProxy.fromConfig(config, original, context), original);
  }
  return restore;
}
