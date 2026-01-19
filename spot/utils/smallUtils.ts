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
