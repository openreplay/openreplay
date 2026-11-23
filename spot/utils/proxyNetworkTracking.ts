import createNetworkProxy from "@openreplay/network-proxy";
import type { INetworkMessage } from "@openreplay/network-proxy";
import {
  getTopWindow,
  getNetworkRequestType,
} from "./networkTrackingUtils";
import type { SpotNetworkRequest } from "./networkTrackingUtils";
import { pageMessages } from "~/utils/pageMessages";

let restoreNetwork: (() => void) | undefined;

export function startNetwork() {
  restoreNetwork?.();
  restoreNetwork = createNetworkProxy(getTopWindow(), {
    sendMessage: (msg) => {
      const event = createSpotNetworkRequest(msg);
      window.postMessage(
        { type: pageMessages.injected.bumpNetwork, event },
        "*",
      );
    },
    isServiceUrl: (url) =>
      url.includes("/spot/") || url.includes(".mob?") || url.includes(".mobe?"),
  });
}

function getBody(req: { body?: string | Record<string, any> }): string {
  let body;

  if (req.body) {
    try {
      body = req.body;
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
  const reqHeaders = request.headers ?? {};
  const resHeaders = response.headers ?? {};
  const responseBodySize = msg.responseSize || 0;
  const reqSize = msg.request ? msg.request.length : 0;
  const body = getBody(request);
  const responseBody = getBody(response);

  return {
    method: msg.method,
    type: getNetworkRequestType(msg.requestType, msg.url),
    body,
    responseBody,
    requestHeaders: reqHeaders,
    responseHeaders: resHeaders,
    time: msg.startTime,
    timestamp: Date.now(),
    statusCode: msg.status || 0,
    error: undefined,
    url: msg.url,
    fromCache: false,
    encodedBodySize: reqSize,
    responseBodySize,
    duration: msg.duration,
  };
}

export function stopNetwork() {
  restoreNetwork?.();
  restoreNetwork = undefined;
}
