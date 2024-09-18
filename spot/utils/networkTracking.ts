import { WebRequest } from "webextension-polyfill";
export type TrackedRequest = {
  statusCode: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
} & (
  | WebRequest.OnBeforeRequestDetailsType
  | WebRequest.OnBeforeSendHeadersDetailsType
  | WebRequest.OnCompletedDetailsType
  | WebRequest.OnErrorOccurredDetailsType
  | WebRequest.OnResponseStartedDetailsType
);

export interface SpotNetworkRequest {
  encodedBodySize: number;
  responseBodySize: number;
  duration: number;
  method: TrackedRequest["method"];
  type: string;
  time: TrackedRequest["timeStamp"];
  statusCode: number;
  error?: string;
  url: TrackedRequest["url"];
  fromCache: boolean;
  body: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
}
export const rawRequests: (TrackedRequest & {
  startTs: number;
  duration: number;
})[] = [];
function filterHeaders(headers: Record<string, string>) {
  const filteredHeaders: Record<string, string> = {};
  const privateHs = [
    "x-api-key",
    "www-authenticate",
    "x-csrf-token",
    "x-requested-with",
    "x-forwarded-for",
    "x-real-ip",
    "cookie",
    "authorization",
    "auth",
    "proxy-authorization",
    "set-cookie",
  ];
  if (Array.isArray(headers)) {
    headers.forEach(({ name, value }) => {
      if (privateHs.includes(name.toLowerCase())) {
        return;
      } else {
        filteredHeaders[name] = value;
      }
    });
  } else {
    for (const [key, value] of Object.entries(headers)) {
      if (!privateHs.includes(key.toLowerCase())) {
        filteredHeaders[key] = value;
      }
    }
  }
  return filteredHeaders;
}
export function createSpotNetworkRequest(
  trackedRequest: TrackedRequest,
  trackedTab?: number,
) {
  if (trackedRequest.tabId === -1) {
    return;
  }
  if (trackedTab && trackedTab !== trackedRequest.tabId) {
    return;
  }
  if (
    ["ping", "beacon", "image", "script", "font"].includes(trackedRequest.type)
  ) {
    if (!trackedRequest.statusCode || trackedRequest.statusCode < 400) {
      return;
    }
  }
  const type = ["stylesheet", "script", "image", "media", "font"].includes(
    trackedRequest.type,
  )
    ? "resource"
    : trackedRequest.type;

  const requestHeaders = trackedRequest.requestHeaders
    ? filterHeaders(trackedRequest.requestHeaders)
    : {};
  const responseHeaders = trackedRequest.responseHeaders
    ? filterHeaders(trackedRequest.responseHeaders)
    : {};

  const reqSize = trackedRequest.reqBody
    ? trackedRequest.requestSize || trackedRequest.reqBody.length
    : 0;

  const status = getRequestStatus(trackedRequest);
  const request: SpotNetworkRequest = {
    method: trackedRequest.method,
    type,
    body: trackedRequest.reqBody,
    requestHeaders,
    responseHeaders,
    time: trackedRequest.timeStamp,
    statusCode: status,
    error: trackedRequest.error,
    url: trackedRequest.url,
    fromCache: trackedRequest.fromCache || false,
    encodedBodySize: reqSize,
    responseBodySize: trackedRequest.responseSize,
    duration: trackedRequest.duration,
  };

  return request;
}

function modifyOnSpot(request: TrackedRequest) {
  const id = request.requestId;
  const index = rawRequests.findIndex((r) => r.requestId === id);
  const ts = Date.now();
  const start = rawRequests[index]?.startTs ?? ts;
  rawRequests[index] = {
    ...rawRequests[index],
    ...request,
    duration: ts - start,
  };
}

const trackOnBefore = (
  details: WebRequest.OnBeforeRequestDetailsType & { reqBody: string },
) => {
  if (details.method === "POST" && details.requestBody) {
    const requestBody = details.requestBody;
    if (requestBody.formData) {
      details.reqBody = JSON.stringify(requestBody.formData);
    } else if (requestBody.raw) {
      const raw = requestBody.raw[0]?.bytes;
      if (raw) {
        details.reqBody = new TextDecoder("utf-8").decode(raw);
      }
    }
  }
  rawRequests.push({ ...details, startTs: Date.now(), duration: 0 });
};
const trackOnCompleted = (details: WebRequest.OnCompletedDetailsType) => {
  modifyOnSpot(details);
};
const trackOnHeaders = (details: WebRequest.OnBeforeSendHeadersDetailsType) => {
  modifyOnSpot(details);
};
const trackOnError = (details: WebRequest.OnErrorOccurredDetailsType) => {
  modifyOnSpot(details);
};
export function startTrackingNetwork() {
  rawRequests.length = 0;
  browser.webRequest.onBeforeRequest.addListener(
    // @ts-ignore
    trackOnBefore,
    { urls: ["<all_urls>"] },
    ["requestBody"],
  );
  browser.webRequest.onBeforeSendHeaders.addListener(
    trackOnHeaders,
    { urls: ["<all_urls>"] },
    ["requestHeaders"],
  );
  browser.webRequest.onCompleted.addListener(
    trackOnCompleted,
    {
      urls: ["<all_urls>"],
    },
    ["responseHeaders"],
  );
  browser.webRequest.onErrorOccurred.addListener(
    trackOnError,
    {
      urls: ["<all_urls>"],
    },
    ["extraHeaders"],
  );
}

export function stopTrackingNetwork() {
  browser.webRequest.onBeforeRequest.removeListener(trackOnBefore);
  browser.webRequest.onCompleted.removeListener(trackOnCompleted);
  browser.webRequest.onErrorOccurred.removeListener(trackOnError);
}

function getRequestStatus(request: any): number {
  if (request.statusCode) {
    return request.statusCode;
  }
  if (request.error) {
    return 0;
  }
  return 200;
}
