import { saasRoutes } from './saasComponents';

const isScalar = (value: any): boolean =>
  /string|number|boolean/.test(typeof value);

export const queried = (path: string, params?: Record<string, any>): string => {
  if (typeof params !== 'object' || params === null) {
    return path;
  }
  const pairs: string[] = [];
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (isScalar(value)) {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    } else if (Array.isArray(value)) {
      value.filter(isScalar).forEach((item) => {
        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
      });
    }
  });
  return pairs.length > 0 ? `${path}?${pairs.join('&')}` : path;
};

const saasIdRequeired = saasRoutes
  .filter((route) => route.withId)
  .map((route) => route.path);
const saasIdChangeAvailable = saasRoutes
  .filter((route) => route.canChangeId)
  .map((route) => route.path);

export const routeIdRequired = [...saasIdRequeired];
export const changeAvailable = [...saasIdChangeAvailable];
