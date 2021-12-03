import { List, Map, Record } from 'immutable';
import Client from 'Types/client';
import Account from 'Types/account';
import { DELETE } from './jwt';
import withRequestState, { RequestTypes } from './requestStateCreator';

export const LOGIN = new RequestTypes('user/LOGIN');
export const SIGNUP = new RequestTypes('user/SIGNUP');
export const RESET_PASSWORD = new RequestTypes('user/RESET_PASSWORD');
export const REQUEST_RESET_PASSWORD = new RequestTypes('user/REQUEST_RESET_PASSWORD');
const FETCH_ACCOUNT = new RequestTypes('user/FETCH_ACCOUNT');
const FETCH_TENANTS = new RequestTypes('user/FETCH_TENANTS');
const UPDATE_ACCOUNT = new RequestTypes('user/UPDATE_ACCOUNT');
const RESEND_EMAIL_VERIFICATION = new RequestTypes('user/RESEND_EMAIL_VERIFICATION');
const UPDATE_APPEARANCE = new RequestTypes('user/UPDATE_APPEARANCE');
const FETCH_CLIENT = new RequestTypes('user/FETCH_CLIENT');
export const UPDATE_PASSWORD = new RequestTypes('user/UPDATE_PASSWORD');
const PUT_CLIENT = new RequestTypes('user/PUT_CLIENT');

const PUSH_NEW_SITE = 'user/PUSH_NEW_SITE';
const SET_SITE_ID = 'user/SET_SITE_ID';
const SET_ONBOARDING = 'user/SET_ONBOARDING';

const SITE_ID_STORAGE_KEY = "__$user-siteId$__";
const storedSiteId = localStorage.getItem(SITE_ID_STORAGE_KEY);

const initialState = Map({
  client: Client(),
  account: Account(),
  siteId: null,
  passwordRequestError: false,
  passwordErrors: List(),
  tenants: [],
  authDetails: {},
  onboarding: false
});

const setClient = (state, data) => {
  const client = Client(data);
  let siteId = state.get("siteId");
  if (!siteId) {
    siteId = !!client.sites.find(s => s.id === storedSiteId) 
      ? storedSiteId 
      : client.getIn([ 'sites', 0, 'id' ]);
  }
  return state
    .set('client', client)
    .set('siteId', siteId);
}

const reducer = (state = initialState, action = {}) => {
  switch (action.type) {
    case RESET_PASSWORD.SUCCESS:
    case UPDATE_PASSWORD.SUCCESS:
    case LOGIN.SUCCESS:
      return setClient(
        state.set('account', Account({...action.data.user, smtp: action.data.client.smtp })),
        action.data.client,
      );
    case SIGNUP.SUCCESS:
      return setClient(
        state.set('account', Account(action.data.user)),
        action.data.client,
      ).set('onboarding', true);
    case REQUEST_RESET_PASSWORD.SUCCESS:
      break;
    case UPDATE_APPEARANCE.REQUEST: //TODO: failure handling
      return state.mergeIn([ 'account', 'appearance' ], action.appearance)
    case UPDATE_ACCOUNT.SUCCESS:
    case FETCH_ACCOUNT.SUCCESS:
      return state.set('account', Account(action.data)).set('passwordErrors', List());
    case FETCH_TENANTS.SUCCESS:
      return state.set('authDetails', action.data);
      // return state.set('tenants', action.data.map(i => ({ text: i.name, value: i.tenantId})));
    case UPDATE_PASSWORD.FAILURE:
      return state.set('passwordErrors', List(action.errors))
    case DELETE:
      return initialState;
    case PUT_CLIENT.REQUEST:
      return state.mergeIn([ 'client' ], action.params);
    case FETCH_CLIENT.SUCCESS:
      return setClient(state, action.data);
    case SET_SITE_ID:
      localStorage.setItem(SITE_ID_STORAGE_KEY, action.siteId)
      return state.set('siteId', action.siteId);
    case PUSH_NEW_SITE:
      return state.updateIn([ 'client', 'sites' ], list => 
        list.push(action.newSite));
    case SET_ONBOARDING:
      return state.set('onboarding', action.state)
  }
  return state;
};

export default withRequestState({
  loginRequest: LOGIN,
  signupRequest: SIGNUP,
  updatePasswordRequest: UPDATE_PASSWORD,
  requestResetPassowrd: REQUEST_RESET_PASSWORD,
  resetPassword: RESET_PASSWORD,
  fetchUserInfoRequest: [ FETCH_ACCOUNT, FETCH_CLIENT, FETCH_TENANTS ],
  putClientRequest: PUT_CLIENT,
  updateAccountRequest: UPDATE_ACCOUNT,
  updateAppearance: UPDATE_APPEARANCE,
}, reducer);

export const login = params => dispatch => dispatch({
  types: LOGIN.toArray(),
  call: client => client.post('/login', params),
});

export const signup = params => dispatch => dispatch({
  types: SIGNUP.toArray(),
  call: client => client.post('/signup', params),
});

export const resetPassword = params => dispatch => dispatch({
  types: RESET_PASSWORD.toArray(),
  call: client => client.post('/password/reset', params)
});

export const requestResetPassword = params => dispatch => dispatch({
  types: REQUEST_RESET_PASSWORD.toArray(),
  call: client => client.post('/password/reset-link', params),
});

export const updatePassword = params => dispatch => dispatch({
  types: UPDATE_PASSWORD.toArray(),
  call: client => client.post('/account/password', params),
})

export function fetchTenants() {
  return {
    types: FETCH_TENANTS.toArray(),
    call: client => client.get('/signup')
  }
}

export const fetchUserInfo = () => dispatch => Promise.all([
  dispatch({
    types: FETCH_ACCOUNT.toArray(),
    call: client => client.get('/account'),
  }),
  dispatch({
    types: FETCH_CLIENT.toArray(),
    call: client => client.get('/client'),
  }),
]);

export function logout() {
  return {
    type: DELETE,
  };
}

export function updateClient(params) {
  return {
    types: PUT_CLIENT.toArray(),
    call: client => client.put('/client', params),
    params,
  };
}

export function updateAccount(params) {
  return {
    types: UPDATE_ACCOUNT.toArray(),
    call: client => client.post('/account', params),
  }
}

export function resendEmailVerification(email) {
  return {
    types: RESEND_EMAIL_VERIFICATION.toArray(),
    call: client => client.post('/re-validate', { email }),
  }
}

export function updateAppearance(appearance) {
  return {
    types: UPDATE_APPEARANCE.toArray(),
    call: client => client.post('/account', { 
      appearance: Record.isRecord(appearance) ? appearance.toData() : appearance
    }),
    appearance,
  };
}

export function setSiteId(siteId) {
  return {
    type: SET_SITE_ID,
    siteId,
  };
}

export function pushNewSite(newSite) {
  return {
    type: PUSH_NEW_SITE,
    newSite,
  };
}

export function setOnboarding(state = false) {
  return {
    type: SET_ONBOARDING,
    state
  };
}

