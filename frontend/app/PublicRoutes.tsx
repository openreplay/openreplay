import { observer } from 'mobx-react-lite';
import React, { Suspense, lazy, useEffect } from 'react';

import { useStore } from 'App/mstore';
import * as routes from 'App/routes';
import { Navigate, Route, StableRoutes } from 'App/routing';
import Signup from 'Components/Signup/Signup';
import { Loader } from 'UI';

import SupportCallout from 'Shared/SupportCallout';

const LOGIN_PATH = routes.login();
const SIGNUP_PATH = routes.signup();
const FORGOT_PASSWORD = routes.forgotPassword();
const SPOT_PATH = routes.spot();

const Login = lazy(() => import('Components/Login/Login'));
const ForgotPassword = lazy(
  () => import('Components/ForgotPassword/ForgotPassword'),
);
const Spot = lazy(() => import('Components/Spots/SpotPlayer/SpotPlayer'));

function PublicRoutes() {
  const { userStore } = useStore();
  const { authDetails } = userStore.authStore;
  const { isEnterprise } = userStore;
  const hideSupport =
    isEnterprise ||
    location.pathname.includes('spots') ||
    location.pathname.includes('view-spot');
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    if (authDetails && !authDetails.tenants) {
      userStore.authStore.fetchTenants().then(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <Loader loading={loading} className="flex-1">
      <Suspense fallback={<Loader loading className="flex-1" />}>
        <StableRoutes>
          <Route path={SPOT_PATH} element={<Spot />} />
          <Route path={FORGOT_PASSWORD} element={<ForgotPassword />} />
          <Route path={LOGIN_PATH} element={<Login />} />
          <Route path={SIGNUP_PATH} element={<Signup />} />
          <Route path="*" element={<Navigate to={LOGIN_PATH} replace />} />
        </StableRoutes>
        {!hideSupport && <SupportCallout />}
      </Suspense>
    </Loader>
  );
}

export default observer(PublicRoutes);
