let requestMap = {}

export function resetMap() {
  requestMap = {}
}

export async function attachDebuggerToTab(tabId: string | number) {
  await new Promise((resolve, reject) => {
    chrome.debugger.attach({ tabId }, "1.3", () => {
      if (chrome.runtime.lastError)
        return reject(chrome.runtime.lastError.message);
      chrome.debugger.sendCommand({ tabId }, "Network.enable", {}, resolve);
    });
    chrome.debugger.onEvent.addListener(handleRequestIntercept);
  });
}
export async function detachDebuggerFromTab(tabId: string) {
  return new Promise((resolve, reject) => {
    chrome.debugger.detach({ tabId }, resolve);
    chrome.debugger.onEvent.removeListener(handleRequestIntercept);
  });
}

const getType = (requestType: string) => {
  switch (requestType) {
    case "Fetch":
    case "XHR":
    case "xmlhttprequest":
      return 'xmlhttprequest'
    default:
      return requestType
  }
}
function handleRequestIntercept(source, method, params) {
  if (!source.tabId) return; // Not our target tab
  if (!params.request) return; // No request object
  if (params.request.method === "OPTIONS") return; // Ignore preflight requests

  switch (method) {
    case "Network.requestWillBeSent":
      const reqType = params.type ? getType(params.type) : "resource";
      if (reqType !== "xmlhttprequest") {
        console.log(params);
      }

      requestMap[params.requestId] = {
        encodedBodySize: 0,
        responseBodySize: 0,
        duration: 0,
        method: params.request.method,
        type: reqType,
        statusCode: 0,
        url: params.request.url,
        body: params.request.postData || "",
        responseBody: "",
        fromCache: false,
        requestHeaders: params.request.headers || {},
        responseHeaders: {},
        timestamp: Date.now(),
      };
      break;

    case "Network.responseReceived":
      if (!requestMap[params.requestId]) return;
      requestMap[params.requestId].statusCode = params.response.status;
      requestMap[params.requestId].responseHeaders =
        params.response.headers || {};
      // fromDiskCache or fromServiceWorker if available
      if (params.response.fromDiskCache)
        requestMap[params.requestId].fromCache = true;
      break;

    case "Network.dataReceived":
      if (!requestMap[params.requestId]) return;
      requestMap[params.requestId].encodedBodySize += params.dataLength;
      // There's no direct content-encoding size from debugger
      break;

    case "Network.loadingFinished":
      if (!requestMap[params.requestId]) return;
      requestMap[params.requestId].duration =
        Date.now() - requestMap[params.requestId].time;
      requestMap[params.requestId].responseBodySize =
        requestMap[params.requestId].encodedBodySize;
      chrome.debugger.sendCommand(
        { tabId: source.tabId },
        "Network.getResponseBody",
        { requestId: params.requestId },
        (res) => {
          if (!res || res.error) {
            requestMap[params.requestId].error = res?.error || "Unknown";
          } else {
            requestMap[params.requestId].responseBody = res.base64Encoded
              ? atob(res.body)
              : res.body;
          }
        },
      );
      break;

    case "Network.loadingFailed":
      if (!requestMap[params.requestId]) return;
      requestMap[params.requestId].error = params.errorText || "Unknown";
      break;
  }
}

export const getRequests = () => {
  return Object.values(requestMap);
};
