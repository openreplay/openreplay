import React, { lazy, Suspense } from 'react';
import { Loader } from 'UI';
import { Redirect, Route, Switch } from 'react-router-dom';
import Signup from 'Components/Signup/Signup';
import SupportCallout from 'Shared/SupportCallout';
import { connect } from 'react-redux';
import * as routes from 'App/routes';


const LOGIN_PATH = routes.login();
const SIGNUP_PATH = routes.signup();
const FORGOT_PASSWORD = routes.forgotPassword();
const SPOT_PATH = routes.spot();

const Login = lazy(() => import('Components/Login/Login'));
const ForgotPassword = lazy(() => import('Components/ForgotPassword/ForgotPassword'));
const UpdatePassword = lazy(() => import('Components/UpdatePassword/UpdatePassword'));
const Spot = lazy(() => import('Components/Spots/SpotPlayer/SpotPlayer'));

interface Props {
  isEnterprise: boolean;
  changePassword: boolean;
}

function PublicRoutes(props: Props) {
  const hideSupport = props.isEnterprise || location.pathname.includes('spots') || location.pathname.includes('view-spot')
  return (
    <Suspense fallback={<Loader loading={true} className='flex-1' />}>
      <Switch>
        <Route exact strict path={SPOT_PATH} component={Spot} />
        <Route exact strict path={FORGOT_PASSWORD} component={ForgotPassword} />
        <Route exact strict path={LOGIN_PATH} component={Login} />
        <Route exact strict path={SIGNUP_PATH} component={Signup} />
        <Redirect to={LOGIN_PATH} />
      </Switch>
      {!hideSupport && <SupportCallout />}
    </Suspense>
  );
}


export default connect((state: any) => ({
  changePassword: state.getIn(['user', 'account', 'changePassword']),
  isEnterprise:
    state.getIn(['user', 'account', 'edition']) === 'ee' ||
    state.getIn(['user', 'authDetails', 'edition']) === 'ee'
}))(PublicRoutes);