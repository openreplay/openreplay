import createNetworkProxy, { INetworkMessage } from "@openreplay/network-proxy";
import {
  SpotNetworkRequest,
  filterBody,
  sensitiveParams,
  filterHeaders,
  obscureSensitiveData,
  tryFilterUrl,
} from "./networkTracking";

function getTopWindow(): Window {
  let currentWindow = window;
  try {
    while (currentWindow !== currentWindow.parent) {
      currentWindow = currentWindow.parent;
    }
  } catch (e) {
    // Accessing currentWindow.parent threw an exception due to cross-origin policy
    // currentWindow is the topmost accessible window
  }
  return currentWindow;
}

let defaultFetch: typeof fetch | undefined;
let defaultXhr: typeof XMLHttpRequest | undefined;
let defaultBeacon: typeof navigator.sendBeacon | undefined;

const events: INetworkMessage[] = [];

export function startNetwork() {
  const context = getTopWindow();
  defaultXhr = context.XMLHttpRequest;
  defaultBeacon = context.navigator.sendBeacon;
  defaultFetch = context.fetch;
  createNetworkProxy(
    context,
    [], // headers
    () => null,
    (reqRes) => reqRes,
    (msg) => events.push(msg),
    (url) => url.includes("/spot/"),
    { xhr: true, fetch: true, beacon: true },
  );
}

function getBody(req: { body?: string | Record<string, any> }) {
  let body;

  if (req.body) {
    try {
      body = filterBody(req.body);
    } catch (e) {
      body = "Error parsing body";
      console.error(e);
    }
  } else {
    body = "";
  }

  return body;
}

export function createSpotNetworkRequest(
  msg: INetworkMessage,
): SpotNetworkRequest {
  const request = JSON.parse(msg.request);
  const response = JSON.parse(msg.response);
  const reqHeaders = request.headers ? filterHeaders(request.headers) : {};
  const resHeaders = response.headers ? filterHeaders(response.headers) : {};
  const responseBodySize = msg.responseSize || 0;
  const reqSize = msg.request ? msg.request.length : 0;
  const status = msg.status || 0;
  const body = getBody(request);
  const responseBody = getBody(response);

  return {
    method: request.method,
    type: request.type,
    body,
    responseBody,
    requestHeaders: reqHeaders,
    responseHeaders: resHeaders,
    time: msg.startTime,
    statusCode: status,
    error: undefined,
    url: tryFilterUrl(request.url),
    fromCache: false,
    encodedBodySize: reqSize,
    responseBodySize,
    duration: msg.duration,
  };
}

export function stopNetwork() {
  if (!defaultFetch || !defaultXhr || !defaultBeacon) {
    return;
  }
  window.fetch = defaultFetch;
  window.XMLHttpRequest = defaultXhr;
  window.navigator.sendBeacon = defaultBeacon;
}

export function getFinalRequests() {
  const finalRequests = events.map(createSpotNetworkRequest);
  events.length = 0;
  return finalRequests;
}
