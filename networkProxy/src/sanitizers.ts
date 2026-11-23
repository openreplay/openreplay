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
  "apikey",
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
  "cvv",
  "cvc",
  "otp",
  "sessionid",
]);

// on the key lowercased without separators: accessToken, client_secret, newPassword, X-Auth-Token;
// `token$` keeps counts like max_tokens
const sensitivePattern =
  /password|passwd|secret|token$|apikey|accesskey|privatekey|authorization|cookie|credential|creditcard|cardnumber|csrf|xsrf/;

function numDigits(x) {
  return (Math.log10((x ^ (x >> 31)) - (x >> 31)) | 0) + 1;
}

function obscure(value: any): any {
  if (typeof value === "number") {
    const digits = numDigits(value)
    return "9".repeat(digits)
  }
  if (typeof value === "string") {
    return value.replace(/[^\f\n\r\t\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff\s]/g, '*');
  }
  if (Array.isArray(value)) {
    return value.map(obscure);
  }
  if (value && typeof value === "object") {
    const masked: Record<string, any> = {};
    for (const key of Object.keys(value)) masked[key] = obscure(value[key]);
    return masked;
  }
  return value;
}

export function isSensitiveKey(key: string) {
  try {
    key = decodeURIComponent(key);
  } catch (e) {
    // malformed escape, check the raw key
  }
  const lower = key.toLowerCase();
  const bare = lower.replace(/[-_.\s]/g, "");
  return sensitiveParams.has(lower) || sensitiveParams.has(bare) || sensitivePattern.test(bare);
}

export function filterHeaders(headers: Record<string, string> | { name: string; value: string }[]) {
  const filteredHeaders: Record<string, string> = {};
  if (Array.isArray(headers)) {
    headers.forEach(({ name, value }) => {
      filteredHeaders[name] = isSensitiveKey(name) ? obscure(value) : value;
    });
  } else {
    for (const [key, value] of Object.entries(headers)) {
      filteredHeaders[key] = isSensitiveKey(key) ? obscure(value) : value;
    }
  }
  return filteredHeaders;
}

/** `formMasked`: request bodies come from genStringBody, already masked */
export function filterBody(body: any, formMasked = false): string {
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
  } else if (!formMasked && typeof body === "string" && body.includes("=")) {
    return obscureFormFields(body);
  } else {
    return body;
  }
}

export function obscureParam(key: string, value: string) {
  return isSensitiveKey(key) ? obscure(value) : value;
}

// key=value pairs of a url-encoded body or query, rewritten in place to keep the original text
const formField = /(^|[?&])([^=&?\s]+)=([^&]*)/g;

export function obscureFormFields(body: string) {
  return body.replace(formField, (field, sep, key, value) =>
    isSensitiveKey(key) ? `${sep}${key}=${obscure(value)}` : field,
  );
}

export function sanitizeObject(obj: Record<string, any>) {
  obscureSensitiveData(obj)
  return obj
}
function obscureSensitiveData(obj: Record<string, any> | any[]) {
  if (Array.isArray(obj)) {
    obj.forEach(obscureSensitiveData);
  } else if (obj && typeof obj === "object") {
    for (const key of Object.keys(obj)) {
      if (isSensitiveKey(key)) {
        obj[key] = obscure(obj[key]);
      } else if (obj[key] !== null && typeof obj[key] === "object") {
        obscureSensitiveData(obj[key]);
      }
    }
  }
}

export function tryFilterUrl(url: string) {
  if (!url) return "";
  try {
    const urlObj = new URL(url);
    for (const key of Array.from(urlObj.searchParams.keys())) {
      if (isSensitiveKey(key)) {
        urlObj.searchParams.set(key, "******");
      }
    }
    return urlObj.toString();
  } catch (e) {
    return url;
  }
}
