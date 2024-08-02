import withPageTitle from 'HOCs/withPageTitle';
import cn from 'classnames';
import React, { useEffect, useRef, useState } from 'react';
// Consider using a different approach for titles in functional components
import ReCAPTCHA from 'react-google-recaptcha';
import { connect } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { toast } from 'react-toastify';

import { ENTERPRISE_REQUEIRED } from 'App/constants';
import { useStore } from 'App/mstore';
import { forgotPassword, signup } from 'App/routes';
import {
  fetchTenants,
  loadingLogin,
  loginFailure,
  loginSuccess,
  setJwt,
} from 'Duck/user';
import { Button, Form, Icon, Input, Link, Loader, Tooltip } from 'UI';

import Copyright from 'Shared/Copyright';

import stl from './login.module.css';

const FORGOT_PASSWORD = forgotPassword();
const SIGNUP_ROUTE = signup();

interface LoginProps {
  errors: any; // Adjust the type based on your state shape
  loading: boolean;
  authDetails: any; // Adjust the type based on your state shape
  loginSuccess: typeof loginSuccess;
  setJwt: typeof setJwt;
  fetchTenants: typeof fetchTenants;
  loadingLogin: typeof loadingLogin;
  loginFailure: typeof loginFailure;
  location: Location;
}

const Login: React.FC<LoginProps> = ({
  errors,
  loading,
  authDetails,
  loginSuccess,
  setJwt,
  fetchTenants,
  location,
  loadingLogin,
  loginFailure,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [CAPTCHA_ENABLED, setCAPTCHA_ENABLED] = useState(
    window.env.CAPTCHA_ENABLED === 'true'
  );
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const { loginStore } = useStore();
  const history = useHistory();
  const params = new URLSearchParams(location.search);

  useEffect(() => {
    if (Object.keys(authDetails).length !== 0) {
      if (!authDetails.tenants) {
        history.push(SIGNUP_ROUTE);
      }
    }
  }, [authDetails]);

  useEffect(() => {
    fetchTenants();
    const jwt = params.get('jwt');
    const spotJwt = params.get('spotJwt');
    if (spotJwt) {
      handleSpotLogin(spotJwt);
    }
    if (jwt) {
      setJwt(jwt);
    }
  }, []);

  const handleSpotLogin = (jwt: string) => {
    let tries = 0;
    if (!jwt) {
      return;
    }
    let int: ReturnType<typeof setInterval>;

    const onSpotMsg = (event: any) => {
      if (event.data.type === 'orspot:logged') {
        clearInterval(int);
        window.removeEventListener('message', onSpotMsg);
        toast.success('You have been logged into Spot successfully');
      }
    };
    window.addEventListener('message', onSpotMsg);

    int = setInterval(() => {
      if (tries > 20) {
        clearInterval(int);
        window.removeEventListener('message', onSpotMsg);
        return;
      }
      window.postMessage(
        {
          type: 'orspot:token',
          token: jwt,
        },
        '*'
      );
      tries += 1;
    }, 250);
  };

  const handleSubmit = (token?: string) => {
    if (!email || !password) {
      return;
    }
    loadingLogin();
    loginStore.setEmail(email.trim());
    loginStore.setPassword(password);
    if (token) {
      loginStore.setCaptchaResponse(token);
    }
    loginStore
      .generateJWT()
      .then((resp) => {
        if (resp) {
          loginSuccess(resp);
          setJwt(resp.jwt);
          handleSpotLogin(resp.spotJwt);
        }
      })
      .catch((e) => {
        loginFailure(e);
      });
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (CAPTCHA_ENABLED && recaptchaRef.current) {
      recaptchaRef.current.execute();
    } else if (!CAPTCHA_ENABLED) {
      handleSubmit();
    }
  };

  const ssoLink =
    window !== window.top
      ? `${window.location.origin}/api/sso/saml2?iFrame=true&spot=true`
      : `${window.location.origin}/api/sso/saml2?spot=true`;

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center">
        <div className="m-10 ">
          <img src="/assets/logo.svg" width={200} />
        </div>
        <div className="border rounded-lg bg-white shadow-sm">
          <h2 className="text-center text-2xl font-medium mb-6 border-b p-5 w-full">
            Login to your account
          </h2>
          <div className={cn({ hidden: authDetails.enforceSSO })}>
            <Form
              onSubmit={onSubmit}
              className={cn('flex items-center justify-center flex-col')}
              style={{ width: '350px' }}
            >
              <Loader loading={loading}>
                {CAPTCHA_ENABLED && (
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    size="invisible"
                    sitekey={window.env.CAPTCHA_SITE_KEY}
                    onChange={(token) => handleSubmit(token)}
                  />
                )}
                <div style={{ width: '350px' }} className="px-8">
                  <Form.Field>
                    <label>Email Address</label>
                    <Input
                      data-test-id={'login'}
                      autoFocus={true}
                      autoComplete="username"
                      type="email"
                      placeholder="e.g. john@example.com"
                      name="email"
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      icon="envelope"
                    />
                  </Form.Field>
                  <Form.Field>
                    <label className="mb-2">Password</label>
                    <Input
                      data-test-id={'password'}
                      autoComplete="current-password"
                      type="password"
                      placeholder="Password"
                      name="password"
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      icon="key"
                    />
                  </Form.Field>
                </div>
              </Loader>
              {errors && errors.length ? (
                <div className="px-8 my-2 w-full">
                  {errors.map((error) => (
                    <div className="flex items-center bg-red-lightest rounded p-3">
                      <Icon name="info" color="red" size="20" />
                      <span className="color-red ml-2">
                        {error}
                        <br />
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="px-8 w-full">
                <Button
                  data-test-id={'log-button'}
                  className="mt-2 w-full text-center rounded-lg"
                  type="submit"
                  variant="primary"
                >
                  {'Login'}
                </Button>

                <div className="my-8 text-center">
                  <span className="color-gray-medium">
                    Having trouble logging in?
                  </span>{' '}
                  <Link to={FORGOT_PASSWORD} className="link ml-1">
                    {'Reset password'}
                  </Link>
                </div>
              </div>
            </Form>

            <div className={cn(stl.sso, 'py-2 flex flex-col items-center')}>
              {authDetails.sso ? (
                <a href={ssoLink} rel="noopener noreferrer">
                  <Button variant="text-primary" type="submit">
                    {`Login with SSO ${
                      authDetails.ssoProvider
                        ? `(${authDetails.ssoProvider})`
                        : ''
                    }`}
                  </Button>
                </a>
              ) : (
                <Tooltip
                  delay={0}
                  title={
                    <div className="text-center">
                      {authDetails.edition === 'ee' ? (
                        <span>
                          SSO has not been configured. <br /> Please reach out
                          to your admin.
                        </span>
                      ) : (
                        ENTERPRISE_REQUEIRED
                      )}
                    </div>
                  }
                  placement="top"
                >
                  <Button
                    variant="text-primary"
                    type="submit"
                    className="pointer-events-none opacity-30"
                  >
                    {`Login with SSO ${
                      authDetails.ssoProvider
                        ? `(${authDetails.ssoProvider})`
                        : ''
                    }`}
                  </Button>
                </Tooltip>
              )}
            </div>
          </div>
          <div
            className={cn('flex items-center w-96 justify-center my-8', {
              hidden: !authDetails.enforceSSO,
            })}
          >
            <a href={ssoLink} rel="noopener noreferrer">
              <Button variant="primary">{`Login with SSO ${
                authDetails.ssoProvider ? `(${authDetails.ssoProvider})` : ''
              }`}</Button>
            </a>
          </div>
        </div>
      </div>

      <Copyright />
    </div>
  );
};

const mapStateToProps = (state: any, ownProps: any) => ({
  errors: state.getIn(['user', 'loginRequest', 'errors']),
  loading: state.getIn(['user', 'loginRequest', 'loading']),
  authDetails: state.getIn(['user', 'authDetails']),
  params: new URLSearchParams(ownProps.location.search),
});

const mapDispatchToProps = {
  loginSuccess,
  setJwt,
  fetchTenants,
  loadingLogin,
  loginFailure,
};

export default withPageTitle('Login - OpenReplay')(
  connect(mapStateToProps, mapDispatchToProps)(Login)
);
