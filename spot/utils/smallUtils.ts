export function safeApiUrl(url: string) {
  let str = url;
  if (str.endsWith("/")) {
    str = str.slice(0, -1);
  }
  if (str.includes("app.openreplay.com")) {
    str = str.replace("app.openreplay.com", "api.openreplay.com");
  }
  return str;
}