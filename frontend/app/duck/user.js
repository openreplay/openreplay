import { List, Map } from 'immutable';
import Client from 'Types/client';
import { deleteCookie } from 'App/utils';
import Account from 'Types/account';
import withRequestState, { RequestTypes } from './requestStateCreator';

export const LOGIN = new RequestTypes('user/LOGIN');
export const SIGNUP = new RequestTypes('user/SIGNUP');
export const RESET_PASSWORD = new RequestTypes('user/RESET_PASSWORD');
export const REQUEST_RESET_PASSWORD = new RequestTypes('user/REQUEST_RESET_PASSWORD');
export const FETCH_ACCOUNT = new RequestTypes('user/FETCH_ACCOUNT');
const FETCH_TENANTS = new RequestTypes('user/FETCH_TENANTS');
const UPDATE_ACCOUNT = new RequestTypes('user/UPDATE_ACCOUNT');
const RESEND_EMAIL_VERIFICATION = new RequestTypes('user/RESEND_EMAIL_VERIFICATION');
const FETCH_CLIENT = new RequestTypes('user/FETCH_CLIENT');
export const UPDATE_PASSWORD = new RequestTypes('user/UPDATE_PASSWORD');
const PUT_CLIENT = new RequestTypes('user/PUT_CLIENT');
const RESET_ERRORS = 'user/RESET_ERRORS';

const PUSH_NEW_SITE = 'user/PUSH_NEW_SITE';
const SET_ONBOARDING = 'user/SET_ONBOARDING';
const UPDATE_ACCOUNT_MODULE = 'user/UPDATE_ACCOUNT_MODULE';

export const initialState = Map({
  account: Account(),
  siteId: null,
  passwordRequestError: false,
  passwordErrors: List(),
  tenants: [],
  authDetails: {},
  onboarding: false,
  sites: List(),
  jwt: null,
  errors: List(),
  loginRequest: {
    loading: false,
    errors: []
  }
});

const setClient = (state, data) => {
  const client = Client(data);
  return state.set('client', client);
};

export const UPDATE_JWT = 'jwt/UPDATE';
export const DELETE = new RequestTypes('jwt/DELETE');

export function setJwt(data) {
  return {
    type: UPDATE_JWT,
    data
  };
}


const reducer = (state = initialState, action = {}) => {
  switch (action.type) {
    case RESET_ERRORS:
      return state.set('requestResetPassowrd', List());
    case UPDATE_JWT:
      return state.set('jwt', action.data);
    case LOGIN.REQUEST:
      return state.set('loginRequest', { loading: true, errors: [] });
    case RESET_PASSWORD.SUCCESS:
    case LOGIN.SUCCESS:
      return state.set('account', Account({ ...action.data.user })).set('loginRequest', { loading: false, errors: [] });
    case UPDATE_PASSWORD.REQUEST:
    case UPDATE_PASSWORD.SUCCESS:
      return state.set('passwordErrors', List());
    case SIGNUP.SUCCESS:
      return state.set('account', Account(action.data.user)).set('onboarding', true);
    case REQUEST_RESET_PASSWORD.SUCCESS:
      break;
    case UPDATE_ACCOUNT.SUCCESS:
    case FETCH_ACCOUNT.SUCCESS:
      return state.set('account', Account(action.data)).set('passwordErrors', List());
    case FETCH_TENANTS.SUCCESS:
      return state.set('authDetails', action.data);
    case UPDATE_PASSWORD.FAILURE:
      return state.set('passwordErrors', List(action.errors));
    case LOGIN.FAILURE:
      console.log('login failed', action);
      deleteCookie('jwt', '/', 'openreplay.com');
      return state.set('loginRequest', { loading: false, errors: action.errors });
    case FETCH_ACCOUNT.FAILURE:
    case DELETE.SUCCESS:
    case DELETE.FAILURE:
      deleteCookie('jwt', '/', 'openreplay.com');
      return initialState;
    case PUT_CLIENT.REQUEST:
      return state.mergeIn(['account'], action.params);
    case FETCH_CLIENT.SUCCESS:
      return setClient(state, action.data);
    case PUSH_NEW_SITE:
      return state.updateIn(['site', 'list'], list =>
        list.push(action.newSite));
    case SET_ONBOARDING:
      return state.set('onboarding', action.state);
    case UPDATE_ACCOUNT_MODULE:
      return state.updateIn(['account', 'settings', 'modules'], modules => {
        if (modules.includes(action.moduleKey)) {
          return modules.filter(module => module !== action.moduleKey);
        } else {
          return modules.concat(action.moduleKey);
        }
      });
  }
  return state;
};


export default withRequestState({
  signupRequest: SIGNUP,
  // loginRequest: LOGIN,
  updatePasswordRequest: UPDATE_PASSWORD,
  requestResetPassowrd: REQUEST_RESET_PASSWORD,
  resetPassword: RESET_PASSWORD,
  fetchUserInfoRequest: [FETCH_ACCOUNT, FETCH_CLIENT, FETCH_TENANTS],
  putClientRequest: PUT_CLIENT,
  updateAccountRequest: UPDATE_ACCOUNT
}, reducer);

export const login = params => ({
  types: LOGIN.toArray(),
  call: client => client.post('/login', params)
});

export const signup = params => dispatch => dispatch({
  types: SIGNUP.toArray(),
  call: client => client.post('/signup', params)
});

export const resetPassword = params => dispatch => dispatch({
  types: RESET_PASSWORD.toArray(),
  call: client => client.post('/password/reset', params)
});

export const requestResetPassword = params => dispatch => dispatch({
  types: REQUEST_RESET_PASSWORD.toArray(),
  call: client => client.post('/password/reset-link', params)
});

export const updatePassword = params => dispatch => dispatch({
  types: UPDATE_PASSWORD.toArray(),
  call: client => client.post('/account/password', params)
});

export function fetchTenants() {
  return {
    types: FETCH_TENANTS.toArray(),
    call: client => client.get('/signup')
  };
}

export const fetchUserInfo = () => ({
  types: FETCH_ACCOUNT.toArray(),
  call: client => client.get('/account')
});

export function logout() {
  return {
    types: DELETE.toArray(),
    call: client => client.get('/logout')
  };
}

export function updateClient(params) {
  return {
    types: PUT_CLIENT.toArray(),
    call: client => client.post('/account', params),
    params
  };
}

export function updateAccount(params) {
  return {
    types: UPDATE_ACCOUNT.toArray(),
    call: client => client.post('/account', params)
  };
}

export function resendEmailVerification(email) {
  return {
    types: RESEND_EMAIL_VERIFICATION.toArray(),
    call: client => client.post('/re-validate', { email })
  };
}

export function pushNewSite(newSite) {
  return {
    type: PUSH_NEW_SITE,
    newSite
  };
}

export function setOnboarding(state = false) {
  return {
    type: SET_ONBOARDING,
    state
  };
}

export function resetErrors() {
  return {
    type: RESET_ERRORS
  };
}

export function updateModule(moduleKey) {
  return {
    type: UPDATE_ACCOUNT_MODULE,
    moduleKey
  };
}