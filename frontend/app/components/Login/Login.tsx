import React, {useState, useEffect, useRef} from 'react';
// import {useSelector, useDispatch} from 'react-redux';
import {useHistory, useLocation} from 'react-router-dom';
import {login, setJwt, fetchTenants} from 'Duck/user';
import withPageTitle from 'HOCs/withPageTitle'; // Consider using a different approach for titles in functional components
import ReCAPTCHA from 'react-google-recaptcha';
import {Button, Form, Input, Link, Loader, Popover, Tooltip, Icon} from 'UI';
import {forgotPassword, signup} from 'App/routes';
import LoginBg from '../../svg/login-illustration.svg';
import {ENTERPRISE_REQUEIRED} from 'App/constants';
import cn from 'classnames';
import stl from './login.module.css';
import Copyright from 'Shared/Copyright';
import {connect} from 'react-redux';

const FORGOT_PASSWORD = forgotPassword();
const SIGNUP_ROUTE = signup();

interface LoginProps {
  errors: any; // Adjust the type based on your state shape
  loading: boolean;
  authDetails: any; // Adjust the type based on your state shape
  login: typeof login;
  setJwt: typeof setJwt;
  fetchTenants: typeof fetchTenants;
  location: Location;
}

const Login: React.FC<LoginProps> = ({errors, loading, authDetails, login, setJwt, fetchTenants, location}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [CAPTCHA_ENABLED, setCAPTCHA_ENABLED] = useState(window.env.CAPTCHA_ENABLED === 'true');
  const recaptchaRef = useRef<ReCAPTCHA>(null);

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
    fetchTenants()
    const jwt = params.get('jwt');
    if (jwt) {
      setJwt(jwt);
    }
  }, []);

  const handleSubmit = (token?: string) => {
    login({email: email.trim(), password, 'g-recaptcha-response': token});
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (CAPTCHA_ENABLED && recaptchaRef.current) {
      recaptchaRef.current.execute();
    } else if (!CAPTCHA_ENABLED) {
      handleSubmit();
    }
  };

  const onSSOClick = () => {
    if (window !== window.top) { // if in iframe
      window.parent.location.href = `${window.location.origin}/api/sso/saml2?iFrame=true`;
    } else {
      window.location.href = `${window.location.origin}/api/sso/saml2`;
    }
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center">
        <div className="m-10 ">
          <img src="/assets/logo.svg" width={200}/>
        </div>
        <div className="border rounded bg-white">
          <h2 className="text-center text-2xl font-medium mb-6 border-b p-5 w-full">
            Login to your account
          </h2>
          <div className={cn({'hidden': authDetails.enforceSSO})}>
            <Form
              onSubmit={onSubmit}
              className={cn('flex items-center justify-center flex-col')}
              style={{width: '350px'}}
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
                <div style={{width: '350px'}} className="px-8">
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
                      <Icon name="info" color="red" size="20"/>
                      <span className="color-red ml-2">{error}<br/></span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="px-8 w-full">
                <Button
                  data-test-id={'log-button'}
                  className="mt-2 w-full text-center"
                  type="submit"
                  variant="primary"
                >
                  {'Login'}
                </Button>

                <div className="my-8 text-center">
                  <span className="color-gray-medium">Having trouble logging in?</span>{' '}
                  <Link to={FORGOT_PASSWORD} className="link ml-1">
                    {'Reset password'}
                  </Link>
                </div>
              </div>
            </Form>

            <div className={cn(stl.sso, 'py-2 flex flex-col items-center')}>
              {authDetails.sso ? (
                <a href="#" rel="noopener noreferrer" onClick={onSSOClick}>
                  <Button variant="text-primary" type="submit">
                    {`Login with SSO ${
                      authDetails.ssoProvider ? `(${authDetails.ssoProvider})` : ''
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
                            SSO has not been configured. <br/> Please reach out to your admin.
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
                      authDetails.ssoProvider ? `(${authDetails.ssoProvider})` : ''
                    }`}
                  </Button>
                </Tooltip>
              )}
            </div>
          </div>
          <div
            className={cn("flex items-center w-96 justify-center my-8", {'hidden': !authDetails.enforceSSO})}>
            <a href="#" rel="noopener noreferrer" onClick={onSSOClick}>
              <Button variant="primary">{`Login with SSO ${
                authDetails.ssoProvider ? `(${authDetails.ssoProvider})` : ''
              }`}</Button>
            </a>
          </div>
        </div>
      </div>

      <Copyright/>
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
  login,
  setJwt,
  fetchTenants,
};

export default withPageTitle('Login - OpenReplay')(
  connect(mapStateToProps, mapDispatchToProps)(Login)
);