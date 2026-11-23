import NetworkMessage from "./networkMessage.js";
import { INetworkMessage, NetworkProxyOptions, RequestResponseData } from "./types.js";
import { genStringBody, getStringResponseByType, getURL, shouldCapture } from "./utils.js";
import { proxiedRequests } from "./proxied.js";

interface AxiosInterceptorManager {
  use(
    onFulfilled?: (value: any) => any,
    onRejected?: (error: any) => any,
    options?: { synchronous?: boolean },
  ): number;
  eject?(id: number): void;
}

/** The part of an axios (0.x or 1.x) instance the hook uses. */
export interface AxiosInstance {
  interceptors: {
    request: AxiosInterceptorManager;
    response: AxiosInterceptorManager;
  };
  getUri?: (config?: any) => string;
}

const START = Symbol("openreplay-axios-start");

// axios' own rules (buildFullPath / combineURLs)
function buildFullPath(baseURL: string | undefined, url: string, allowAbsoluteUrls?: boolean) {
  const isRelative = !/^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
  if (!baseURL || (!isRelative && allowAbsoluteUrls !== false)) return url;
  return url ? baseURL.replace(/\/?\/$/, "") + "/" + url.replace(/^\/+/, "") : baseURL;
}

function plainHeaders(headers: any): Record<string, string> {
  const src = headers && typeof headers.toJSON === "function" ? headers.toJSON() : headers;
  const out: Record<string, string> = {};
  if (src && typeof src === "object") {
    for (const key in src) {
      const value = src[key];
      // 0.x keeps per-method defaults (`common`, `get`, …) as nested objects
      if (value != null && typeof value !== "object" && typeof value !== "function") {
        out[key] = String(value);
      }
    }
  }
  return out;
}

type AxiosHookOptions = Omit<NetworkProxyOptions, "modules">;

/**
 * Records the requests of an axios instance that never reach the XHR / fetch proxies: custom
 * adapters (native bridges, mocks) or a fetch passed through `env`. Requests the proxies
 * handled are skipped, so nothing is recorded twice.
 *
 * @returns removes the interceptors
 */
export default function hookAxios(instance: AxiosInstance, options: AxiosHookOptions): () => void;
export default function hookAxios(
  instance: AxiosInstance,
  ignoredHeaders: boolean | string[],
  setSessionTokenHeader: (cb: (name: string, value: string) => void) => void,
  sanitize: (data: RequestResponseData) => RequestResponseData | null,
  sendMessage: (message: INetworkMessage) => void,
  isServiceUrl: (url: string) => boolean,
  tokenUrlMatcher?: (url: string) => boolean,
): () => void;
export default function hookAxios(instance: AxiosInstance, ...args: any[]): () => void {
  const options: AxiosHookOptions =
    args[0] && typeof args[0] === "object" && !Array.isArray(args[0])
      ? args[0]
      : {
          ignoredHeaders: args[0],
          setSessionTokenHeader: args[1],
          sanitize: args[2],
          sendMessage: args[3],
          isServiceUrl: args[4],
          tokenUrlMatcher: args[5],
        };
  const {
    ignoredHeaders = [],
    setSessionTokenHeader = () => {},
    sanitize = (data: RequestResponseData) => data,
    sendMessage,
    isServiceUrl = () => false,
    tokenUrlMatcher,
    captureBody,
  } = options;
  const fullUrl = (config: any) => {
    try {
      // getUri ignores baseURL before axios 0.27: join it here, getUri only adds the params
      const path = buildFullPath(config.baseURL, config.url || "", config.allowAbsoluteUrls);
      const uri = instance.getUri ? instance.getUri({ ...config, baseURL: "", url: path }) : path;
      return getURL(uri, window.location.href);
    } catch {
      return null;
    }
  };

  const onRequest = (config: any) => {
    try {
      config[START] = performance.now();
      setSessionTokenHeader((name, value) => {
        if (tokenUrlMatcher !== undefined && !tokenUrlMatcher(String(fullUrl(config)))) return;
        if (config.headers && typeof config.headers.set === "function") {
          config.headers.set(name, value);
        } else {
          config.headers = { ...config.headers, [name]: value };
        }
      });
    } catch {}
    return config;
  };

  const record = (config: any, response: any, request: any) => {
    if (!config || config[START] === undefined) return;
    if (request && typeof request === "object" && proxiedRequests.has(request)) return;
    const url = fullUrl(config);
    if (!url || isServiceUrl(url.toString())) return;

    const item = new NetworkMessage(ignoredHeaders, setSessionTokenHeader, sanitize);
    item.requestType = "xhr";
    item.method = String(config.method || "get").toUpperCase() as NetworkMessage["method"];
    item.url = url.toString();
    item.requestHeader = plainHeaders(config.headers);
    const capture = shouldCapture(captureBody, item.url);
    if (capture) item.requestData = genStringBody(config.data);
    for (const [key, value] of url.searchParams) {
      item.getData[key] = value;
    }
    item.status = response?.status ?? 0;
    item.header = plainHeaders(response?.headers);
    if (capture) {
      item.response = getStringResponseByType("", response?.data);
      item.responseSize = item.response.length;
    } else {
      const data = response?.data;
      item.responseSize = typeof data === "string" ? data.length : Number(item.header["content-length"]) || 0;
    }
    item.startTime = config[START];
    item.endTime = performance.now();
    item.duration = item.endTime - item.startTime;

    const msg = item.getMessage();
    if (msg) sendMessage(msg);
  };

  const safeRecord = (config: any, response: any, request: any) => {
    try {
      record(config, response, request);
    } catch {}
  };

  const requestId = instance.interceptors.request.use(onRequest, undefined, { synchronous: true });
  const responseId = instance.interceptors.response.use(
    (response: any) => {
      safeRecord(response?.config, response, response?.request);
      return response;
    },
    (error: any) => {
      const request = error?.request ?? error?.response?.request;
      if (error?.response || request) {
        safeRecord(error.config, error.response, request);
      }
      return Promise.reject(error);
    },
  );
  return () => {
    instance.interceptors.request.eject?.(requestId);
    instance.interceptors.response.eject?.(responseId);
  };
}
