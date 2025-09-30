import { saasRoutes } from './saasComponents';

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

const saasIdRequeired = saasRoutes
  .filter((route) => route.withId)
  .map((route) => route.path);
const saasIdChangeAvailable = saasRoutes
  .filter((route) => route.canChangeId)
  .map((route) => route.path);

export const routeIdRequired = [...saasIdRequeired];
export const changeAvailable = [...saasIdChangeAvailable];
