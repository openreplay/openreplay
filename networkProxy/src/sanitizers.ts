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
  "secret",
  "ssn",
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

function numDigits(x) {
  return (Math.log10((x ^ (x >> 31)) - (x >> 31)) | 0) + 1;
}

function obscure(value: string | number) {
  if (typeof value === "number") {
    const digits = numDigits(value)
    return "9".repeat(digits)
  }
  return value.replace(/[^\f\n\r\t\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff\s]/g, '*')
}

export function filterHeaders(headers: Record<string, string> | { name: string; value: string }[]) {
  const filteredHeaders: Record<string, string> = {};
  if (Array.isArray(headers)) {
    headers.forEach(({ name, value }) => {
      if (sensitiveParams.has(name.toLowerCase())) {
        filteredHeaders[name] = obscure(value);
      } else {
        filteredHeaders[name] = value;
      }
    });
  } else {
    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveParams.has(key.toLowerCase())) {
        filteredHeaders[key] = obscure(value);
      } else {
        filteredHeaders[key] = value;
      }
    }
  }
  return filteredHeaders;
}

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
    try {
      const params = new URLSearchParams(body);
      for (const key of params.keys()) {
        if (sensitiveParams.has(key.toLowerCase())) {
          const value = obscure(params.get(key))
          params.set(key, value);
        }
      }
      return params.toString();
    } catch (e) {
      // not string or url query
      return body;
    }
  }
}

export function sanitizeObject(obj: Record<string, any>) {
  obscureSensitiveData(obj)
  return obj
}
function obscureSensitiveData(obj: Record<string, any> | any[]) {
  if (Array.isArray(obj)) {
    obj.forEach(obscureSensitiveData);
  } else if (obj && typeof obj === "object") {
    for (const key in obj) {
      if (Object.hasOwn(obj, key)) {
        if (sensitiveParams.has(key.toLowerCase())) {
          obj[key] = obscure(obj[key]);
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
