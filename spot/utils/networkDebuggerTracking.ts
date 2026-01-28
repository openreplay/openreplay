import { getNetworkRequestType } from "./networkTrackingUtils";

let requestMaps = {};
const potentialActiveTabs: Array<string | number> = [];

export function resetMap(tabId?: string) {
  if (tabId) delete requestMaps[tabId];
  else requestMaps = {};
}

export async function attachDebuggerToTab(tabId: string | number) {
  if (requestMaps[tabId] && potentialActiveTabs.includes(tabId)) return;
  await new Promise((resolve, reject) => {
    chrome.debugger.attach({ tabId }, "1.3", () => {
      if (chrome.runtime.lastError) return reject(`${chrome.runtime.lastError.message}, ${tabId}`);
      if (!requestMaps[tabId]) requestMaps[tabId] = {};
      potentialActiveTabs.push(tabId);
      chrome.debugger.sendCommand({ tabId }, "Network.enable", {}, resolve);
    });
    chrome.debugger.onEvent.addListener(handleRequestIntercept);
  });
}

export function stopDebugger(tabId?: string | number) {
  if (tabId) {
    chrome.debugger.detach({ tabId });
    const index = potentialActiveTabs.indexOf(tabId);
    if (index > -1) potentialActiveTabs.splice(index, 1);
  } else {
    potentialActiveTabs.forEach((tabId) => {
      chrome.debugger.detach({ tabId });
    });
    chrome.debugger.onEvent.removeListener(handleRequestIntercept);
    potentialActiveTabs.length = 0;
  }
}

function handleRequestIntercept(source, method, params) {
  if (!source.tabId) return;
  const tabId = source.tabId;
  if (!requestMaps[tabId]) return;
  if (params.request && params.request.method === "OPTIONS") return;
  const reqId = `${tabId}_${params.requestId}`;

  switch (method) {
    case "Network.requestWillBeSent":
      requestMaps[tabId][reqId] = {
        encodedBodySize: 0,
        responseBodySize: 0,
        duration: 0,
        method: params.request.method,
        type: params.type ? getNetworkRequestType(params.type, params.request.url) : "other",
        statusCode: 0,
        url: params.request.url,
        body: params.request.postData || "",
        responseBody: "",
        fromCache: false,
        requestHeaders: params.request.headers || {},
        responseHeaders: {},
        timestamp: Date.now(),
        time: Date.now(),
      };
      break;
    case "Network.responseReceived":
      if (!requestMaps[tabId][reqId]) return;
      requestMaps[tabId][reqId].statusCode = params.response.status;
      requestMaps[tabId][reqId].responseHeaders = params.response.headers || {};
      if (params.response.fromDiskCache) requestMaps[tabId][reqId].fromCache = true;
      break;
    case "Network.dataReceived":
      if (!requestMaps[tabId][reqId]) return;
      requestMaps[tabId][reqId].encodedBodySize += params.dataLength;
      break;
    case "Network.loadingFinished":
      if (!requestMaps[tabId][reqId]) return;
      requestMaps[tabId][reqId].duration = Date.now() - requestMaps[tabId][reqId].timestamp;
      requestMaps[tabId][reqId].responseBodySize = requestMaps[tabId][reqId].encodedBodySize;
      chrome.debugger.sendCommand({ tabId }, "Network.getResponseBody", { requestId: params.requestId }, (res) => {
        if (!res || res.error) {
          requestMaps[tabId][reqId].error = res?.error || "Unknown";
        } else {
          requestMaps[tabId][reqId].responseBody = res.base64Encoded ? 'base64 payload' : res.body;
        }
      });
      break;
    case "Network.loadingFailed":
      if (!requestMaps[tabId][reqId]) return;
      requestMaps[tabId][reqId].error = params.errorText || "Unknown";
      break;
  }
}

export function getRequests(tabId?: string) {
  if (tabId) {
    return Object.values(requestMaps[tabId] || {});
  }
  return Object.values(requestMaps).reduce((acc, curr) => acc.concat(Object.values(curr)), []);
}
