export function safeApiUrl(url: string) {
  let str = url;
  if (str.endsWith("/")) {
    str = str.slice(0, -1);
  }
  const urlObj = new URL(str);
  if (urlObj.hostname === "app.openreplay.com") {
    urlObj.hostname = "api.openreplay.com";
    str = urlObj.toString();
  }
  return str;
}
