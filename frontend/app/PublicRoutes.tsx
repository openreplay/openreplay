import React, { lazy, Suspense, useEffect } from 'react';
import { Loader } from 'UI';
import { Navigate, Route, Routes } from 'react-router-dom';
import Signup from 'Components/Signup/Signup';
import SupportCallout from 'Shared/SupportCallout';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import * as routes from 'App/routes';


const LOGIN_PATH = routes.login();
const SIGNUP_PATH = routes.signup();
const FORGOT_PASSWORD = routes.forgotPassword();
const SPOT_PATH = routes.spot();

const Login = lazy(() => import('Components/Login/Login'));
const ForgotPassword = lazy(() => import('Components/ForgotPassword/ForgotPassword'));
const Spot = lazy(() => import('Components/Spots/SpotPlayer/SpotPlayer'));

function PublicRoutes() {
  const { userStore } = useStore();
  const authDetails = userStore.authStore.authDetails;
  const isEnterprise = userStore.isEnterprise;
  const hideSupport = isEnterprise || location.pathname.includes('spots') || location.pathname.includes('view-spot');
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
      <Suspense fallback={<Loader loading={true} className="flex-1" />}>
        <Routes>
          <Route exact strict path={SPOT_PATH} element={<Spot />} />
          <Route exact strict path={FORGOT_PASSWORD} element={<ForgotPassword />} />
          <Route exact strict path={LOGIN_PATH} element={<Login />} />
          <Route exact strict path={SIGNUP_PATH} element={Signup} />
          <Route
            path="*"
            element={<Navigate to={LOGIN_PATH} replace />}
          />
        </Routes>
        {!hideSupport && <SupportCallout />}
      </Suspense>
    </Loader>
  );
}


export default observer(PublicRoutes);
