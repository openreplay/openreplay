export const queried = (path: string, params?: Record<string, any>): string => {
  const keys =
    typeof params === 'object' &&
    params !== null &&
    Object.keys(params).filter((key) =>
      /string|number|boolean/.test(typeof params[key]),
    );
  if (keys && keys.length > 0) {
    return `${path}?${keys
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join('&')}`;
  }
  return path;
};

export const routeIdRequired = [];
export const changeAvailable = [];
