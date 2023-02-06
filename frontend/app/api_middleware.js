import logger from 'App/logger';
import APIClient from './api_client';
import { UPDATE, DELETE } from './duck/jwt';

export default (store) => (next) => (action) => {
  const { types, call, ...rest } = action;
  if (!call) {
    return next(action);
  }
  const [REQUEST, SUCCESS, FAILURE] = types;
  next({ ...rest, type: REQUEST });
  const client = new APIClient();

  return call(client)
    .then(async (response) => {
      if (response.status === 403) {
        next({ type: DELETE });
      }
      if (!response.ok) {
        const text = await response.text();
        return Promise.reject(text);
      }
      return response.json();
    })
    .then((json) => json || {}) // TEMP  TODO on server: no empty responces
    .then(({ jwt, errors, data }) => {
      if (errors) {
        next({ type: FAILURE, errors, data });
      } else {
        next({ type: SUCCESS, data, ...rest });
      }
      if (jwt) {
        next({ type: UPDATE, data: jwt });
      }
    })
    .catch((e) => {
      logger.error('Error during API request. ', e);
      return next({ type: FAILURE, errors: parseError(e) });
    });
};

function parseError(e) {
  try {
    return JSON.parse(e).errors || [];
  } catch {
    return e;
  }
}

function jwtExpired(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace('-', '+').replace('_', '/');
    const tokenObj = JSON.parse(window.atob(base64));
    return tokenObj.exp * 1000 < Date.now(); // exp in Unix time (sec)
  } catch (e) {
    return true;
  }
}
