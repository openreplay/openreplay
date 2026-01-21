export function safeApiUrl(url: string) {
  let str = url;
  const urlObj = new URL(str);
  if (urlObj.hostname === "app.openreplay.com") {
    urlObj.hostname = "api.openreplay.com";
    str = urlObj.toString();
  }
  if (str.endsWith("/")) {
    str = str.slice(0, -1);
  }
  return str;
}

export const base64ToBlob = (base64OrParts: string | string[], mime = 'video/webm') => {
  try {

  const parts = Array.isArray(base64OrParts) ? base64OrParts : [base64OrParts];

  const normalized = parts.map((p) => {
    const idx = p.indexOf(',');
    return idx >= 0 ? p.slice(idx + 1) : p;
  });

  const byteArrays: Uint8Array[] = [];
  let totalLen = 0;

  for (let i = 0; i < normalized.length; i++) {
    const b64 = normalized[i];

    const clean = b64.replace(/\s+/g, '');
    const byteString = atob(clean);
    const bytes = new Uint8Array(byteString.length);
    for (let j = 0; j < byteString.length; j++) {
      bytes[j] = byteString.charCodeAt(j);
    }
    byteArrays.push(bytes);
    totalLen += bytes.length;
  }

  const merged = new Uint8Array(totalLen);
  let offset = 0;
  for (let i = 0; i < byteArrays.length; i++) {
    merged.set(byteArrays[i], offset);
    offset += byteArrays[i].length;
  }

  return new Blob([merged], { type: mime });

  } catch (e) {
    console.error("base64ToBlob error:", e, base64OrParts, mime);
    throw e;
  }
};
