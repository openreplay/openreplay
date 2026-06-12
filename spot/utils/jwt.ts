export const decodeJwt = (jwt: string): { exp: number; [key: string]: any } => {
  const base64Url = jwt.split(".")[1];
  if (!base64Url) {
    return { exp: 0 };
  }
  // base64url -> base64: replace ALL occurrences, then pad to a multiple of 4
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const remainder = base64.length % 4;
  if (remainder) {
    base64 += "=".repeat(4 - remainder);
  }
  try {
    return JSON.parse(atob(base64));
  } catch (e) {
    console.error("Spot: failed to decode JWT", e);
    return { exp: 0 };
  }
};

export const isTokenExpired = (token: string): boolean => {
  const decoded = decodeJwt(token);
  const currentTime = Date.now() / 1000;
  return decoded.exp < currentTime;
};
