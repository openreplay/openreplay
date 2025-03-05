export const decodeJwt = (jwt: string): any => {
  const base64Url = jwt.split(".")[1];
  if (!base64Url) {
    return { exp: 0 };
  }
  const base64 = base64Url.replace("-", "+").replace("_", "/");
  return JSON.parse(atob(base64));
};

export const isTokenExpired = (token: string): boolean => {
  const decoded: any = decodeJwt(token);
  const currentTime = Date.now() / 1000;
  return decoded.exp < currentTime;
};