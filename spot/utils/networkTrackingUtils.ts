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

export function getTopWindow(): Window {
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
  responseBody: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
}

export const sensitiveParams = new Set([
  "password",
  "pass",
  "pwd",
  "mdp",
  "token",
  "bearer",
  "jwt",
  "api_key",
  "api-key",
  "apiKey",
  "key",
  "secret",
  "id",
  "user",
  "userId",
  "email",
  "ssn",
  "name",
  "firstname",
  "lastname",
  "birthdate",
  "dob",
  "address",
  "zip",
  "zipcode",
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
  "account_key",
]);

export function filterHeaders(headers: Record<string, string>) {
  const filteredHeaders: Record<string, string> = {};
  if (Array.isArray(headers)) {
    headers.forEach(({ name, value }) => {
      if (sensitiveParams.has(name.toLowerCase())) {
        filteredHeaders[name] = "******";
      } else {
        filteredHeaders[name] = value;
      }
    });
  } else {
    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveParams.has(key.toLowerCase())) {
        filteredHeaders[key] = "******";
      } else {
        filteredHeaders[key] = value;
      }
    }
  }
  return filteredHeaders;
}

// JSON or form data
export function filterBody(body: any): string {
  if (!body) {
    return body;
  }

  let parsedBody;
  let isJSON = false;

  try {
    parsedBody = JSON.parse(body);
    isJSON = true;
  } catch (e) {
    // not json
  }

  if (isJSON) {
    obscureSensitiveData(parsedBody);
    return JSON.stringify(parsedBody);
  } else {
    const params = new URLSearchParams(body);
    for (const key of params.keys()) {
      if (sensitiveParams.has(key.toLowerCase())) {
        params.set(key, "******");
      }
    }

    return params.toString();
  }
}

export function obscureSensitiveData(obj: Record<string, any> | any[]) {
  if (Array.isArray(obj)) {
    obj.forEach(obscureSensitiveData);
  } else if (obj && typeof obj === "object") {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (sensitiveParams.has(key.toLowerCase())) {
          obj[key] = "******";
        } else if (obj[key] !== null && typeof obj[key] === "object") {
          obscureSensitiveData(obj[key]);
        }
      }
    }
  }
}

export function tryFilterUrl(url: string) {
  if (!url) return "";
  try {
    const urlObj = new URL(url);
    if (urlObj.searchParams) {
      for (const key of urlObj.searchParams.keys()) {
        if (sensitiveParams.has(key.toLowerCase())) {
          urlObj.searchParams.set(key, "******");
        }
      }
    }
    return urlObj.toString();
  } catch (e) {
    return url;
  }
}
