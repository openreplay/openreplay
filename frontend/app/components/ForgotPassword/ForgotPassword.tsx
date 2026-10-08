import React from 'react';

import { useLocation } from 'App/routing';
import AuthScreen from 'Components/Auth/AuthScreen';

import CreatePassword from './CreatePassword';
import ResetPassword from './ResetPasswordRequest';

/** `/reset-password`: the request form, or where reset and invite emails land. */
function ForgotPassword() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const creating = !!(params.get('pass') && params.get('invitation'));
  return (
    <AuthScreen other="back" step={creating ? 'create' : 'request'}>
      {creating ? <CreatePassword params={params} /> : <ResetPassword />}
    </AuthScreen>
  );
}

export default ForgotPassword;
