import {
  SpotNetworkRequest,
  filterBody,
  filterHeaders,
  tryFilterUrl,
  TrackedRequest,
  getNetworkRequestType,
} from "./networkTrackingUtils";

export const rawRequests: Array<
  TrackedRequest & { startTs: number; duration: number }
> = [];

function getRequestStatus(request: TrackedRequest): number {
  if (request.statusCode) return request.statusCode;
  if (request.error) return 0;
  return 200;
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

function trackOnBefore(
  details: browser.webRequest._OnBeforeRequestDetails & { reqBody?: string },
) {
  if (details.method === "POST" && details.requestBody) {
    if (details.requestBody.formData) {
      details.reqBody = JSON.stringify(details.requestBody.formData);
    } else if (details.requestBody.raw) {
      const raw = details.requestBody.raw[0]?.bytes;
      if (raw) details.reqBody = new TextDecoder("utf-8").decode(raw);
    }
  }
  rawRequests.push({ ...details, startTs: Date.now(), duration: 0 });
}

function trackOnHeaders(
  details: browser.webRequest._OnBeforeSendHeadersDetails,
) {
  modifyOnSpot(details);
}

function trackOnCompleted(details: browser.webRequest._OnCompletedDetails) {
  modifyOnSpot(details);
}

function trackOnError(details: browser.webRequest._OnErrorOccurredDetails) {
  modifyOnSpot(details);
}

// Build final SpotNetworkRequest objects
function createSpotNetworkRequest(
  trackedRequest: TrackedRequest,
  trackedTab?: number,
): SpotNetworkRequest | undefined {
  if (trackedRequest.tabId === -1) return;
  if (trackedTab && trackedTab !== trackedRequest.tabId) return;

  if (
    ["ping", "beacon", "image", "script", "font"].includes(trackedRequest.type)
  ) {
    if (!trackedRequest.statusCode || trackedRequest.statusCode < 400) return;
  }

  const type = getNetworkRequestType(trackedRequest.type, trackedRequest.url);

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

  let body = "";
  if (trackedRequest.reqBody) {
    try {
      body = filterBody(trackedRequest.reqBody);
    } catch (e) {
      body = "Error parsing body";
      console.error(e);
    }
  }

  const request: SpotNetworkRequest = {
    method: trackedRequest.method,
    type,
    body,
    responseBody: "",
    requestHeaders,
    responseHeaders,
    time: trackedRequest.timeStamp,
    timestamp: trackedRequest.timeStamp,
    statusCode: status,
    error: trackedRequest.error,
    url: tryFilterUrl(trackedRequest.url),
    fromCache: trackedRequest.fromCache || false,
    encodedBodySize: reqSize,
    responseBodySize: trackedRequest.responseSize,
    duration: trackedRequest.duration,
  };

  return request;
}

export function startTrackingNetwork() {
  rawRequests.length = 0;
  browser.webRequest.onBeforeRequest.addListener(
    trackOnBefore,
    { urls: ["<all_urls>"] },
    ["requestBody"], // allows capturing POST bodies
  );
  browser.webRequest.onBeforeSendHeaders.addListener(
    trackOnHeaders,
    { urls: ["<all_urls>"] },
    ["requestHeaders"],
  );
  browser.webRequest.onCompleted.addListener(
    trackOnCompleted,
    { urls: ["<all_urls>"] },
    ["responseHeaders"],
  );
  browser.webRequest.onErrorOccurred.addListener(trackOnError, {
    urls: ["<all_urls>"],
  });
}

export function stopTrackingNetwork() {
  browser.webRequest.onBeforeRequest.removeListener(trackOnBefore);
  browser.webRequest.onBeforeSendHeaders.removeListener(trackOnHeaders);
  browser.webRequest.onCompleted.removeListener(trackOnCompleted);
  browser.webRequest.onErrorOccurred.removeListener(trackOnError);
}

export function getFinalRequests(tabId?: number): SpotNetworkRequest[] {
  const finalRequests = rawRequests
    .map((r) => createSpotNetworkRequest(r, tabId))
    .filter((r) => r !== undefined) as SpotNetworkRequest[];
  rawRequests.length = 0;
  return finalRequests;
}
