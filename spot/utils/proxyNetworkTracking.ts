import createNetworkProxy, { INetworkMessage } from "@openreplay/network-proxy";
import {
  SpotNetworkRequest,
  filterBody,
  filterHeaders,
  tryFilterUrl,
  getTopWindow,
} from "./networkTrackingUtils";

let defaultFetch: typeof fetch | undefined;
let defaultXhr: typeof XMLHttpRequest | undefined;
let defaultBeacon: typeof navigator.sendBeacon | undefined;

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
    (msg) => {
      const event = createSpotNetworkRequest(msg);
      window.postMessage({ type: "ort:bump-network", event }, "*");
    },
    (url) =>
      url.includes("/spot/") || url.includes(".mob?") || url.includes(".mobe?"),
    { xhr: true, fetch: true, beacon: true },
  );
}

function getBody(req: { body?: string | Record<string, any> }): string {
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
  let request: Record<string, any> = {}
  let response: Record<string, any> = {};
  try {
    request = JSON.parse(msg.request);
  } catch (e) {
    console.error("Error parsing request", e);
  }
  try {
    response = JSON.parse(msg.response);
  } catch (e) {
    console.error("Error parsing response", e);
  }
  const reqHeaders = request.headers ? filterHeaders(request.headers) : {};
  const resHeaders = response.headers ? filterHeaders(response.headers) : {};
  const responseBodySize = msg.responseSize || 0;
  const reqSize = msg.request ? msg.request.length : 0;
  const body = getBody(request);
  const responseBody = getBody(response);

  return {
    method: msg.method,
    type: msg.requestType,
    body,
    responseBody,
    requestHeaders: reqHeaders,
    responseHeaders: resHeaders,
    time: msg.startTime,
    timestamp: Date.now(),
    statusCode: msg.status || 0,
    error: undefined,
    url: tryFilterUrl(msg.url),
    fromCache: false,
    encodedBodySize: reqSize,
    responseBodySize,
    duration: msg.duration,
  };
}

export function stopNetwork() {
  if (defaultFetch) {
    window.fetch = defaultFetch;
  }
  if (defaultXhr) {
    window.XMLHttpRequest = defaultXhr;
  }
  if (defaultBeacon) {
    window.navigator.sendBeacon = defaultBeacon;
  }
}
