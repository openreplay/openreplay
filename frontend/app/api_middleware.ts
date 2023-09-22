import logger from 'App/logger';
import APIClient from './api_client';
import { FETCH_ACCOUNT, UPDATE_JWT } from 'Duck/user';

export default () => {
  return (next: any) => async (action: any) => {
    const { types, call, ...rest } = action;

    if (!call) {
      return next(action);
    }

    const [REQUEST, SUCCESS, FAILURE] = types;
    next({ ...rest, type: REQUEST });

    try {
      const client = new APIClient();
      const response = await call(client);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text);
      }

      const json = await response.json() || {}; // TEMP TODO on server: no empty responses
      const { jwt, errors, data } = json;

      if (errors) {
        next({ type: FAILURE, errors, data });
      } else {
        next({ type: SUCCESS, data, ...rest });
      }

      if (jwt) {
        next({ type: UPDATE_JWT, data: jwt });
      }

    } catch (e) {
      if (e.response?.status === 403) {
        next({ type: FETCH_ACCOUNT.FAILURE });
      }

      const data = await e.response?.json();
      logger.error('Error during API request. ', e);
      next({ type: FAILURE, errors: data ? parseError(data.errors) : [] });
    }
  };
};

export function parseError(e: any) {
  try {
    return [...JSON.parse(e).errors] || [];
  } catch {
    return Array.isArray(e) ? e : [e];
  }
}
