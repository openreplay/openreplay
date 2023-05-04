import React from 'react';
import { connect } from 'react-redux';
import withPageTitle from 'HOCs/withPageTitle';
import { Icon, Loader, Button, Link, Input, Form, Popover, Tooltip } from 'UI';
import { login } from 'Duck/user';
import { forgotPassword, signup } from 'App/routes';
import ReCAPTCHA from 'react-google-recaptcha';
import { withRouter } from 'react-router-dom';
import stl from './login.module.css';
import cn from 'classnames';
import { setJwt } from 'Duck/user';
import LoginBg from '../../svg/login-illustration.svg';
import { ENTERPRISE_REQUEIRED } from 'App/constants';
import { fetchTenants } from 'Duck/user';
import Copyright from 'Shared/Copyright';

const FORGOT_PASSWORD = forgotPassword();
const SIGNUP_ROUTE = signup();
const recaptchaRef = React.createRef();

export default
@connect(
  (state, props) => ({
    errors: state.getIn(['user', 'loginRequest', 'errors']),
    loading: state.getIn(['user', 'loginRequest', 'loading']),
    authDetails: state.getIn(['user', 'authDetails']),
    params: new URLSearchParams(props.location.search),
  }),
  { login, setJwt, fetchTenants }
)
@withPageTitle('Login - OpenReplay')
@withRouter
class Login extends React.Component {
  state = {
    email: '',
    password: '',
    CAPTCHA_ENABLED: window.env.CAPTCHA_ENABLED === 'true',
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    const { authDetails } = nextProps;
    if (Object.keys(authDetails).length === 0) {
      return null;
    }

    if (!authDetails.tenants) {
      nextProps.history.push(SIGNUP_ROUTE);
    }

    return null;
  }

  componentDidMount() {
    const { params } = this.props;
    this.props.fetchTenants();
    const jwt = params.get('jwt');
    if (jwt) {
      this.props.setJwt(jwt);
    }
  }

  handleSubmit = (token) => {
    const { email, password } = this.state;
    this.props.login({ email: email.trim(), password, 'g-recaptcha-response': token }).then(() => {
      const { errors } = this.props;
    });
  };

  onSubmit = (e) => {
    e.preventDefault();
    const { CAPTCHA_ENABLED } = this.state;
    if (CAPTCHA_ENABLED && recaptchaRef.current) {
      recaptchaRef.current.execute();
    } else if (!CAPTCHA_ENABLED) {
      this.handleSubmit();
    }
  };

  write = ({ target: { value, name } }) => this.setState({ [name]: value });

  render() {
    const { errors, loading, authDetails } = this.props;
    const { CAPTCHA_ENABLED } = this.state;

    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center">
          <div className="m-10 ">
            <img src="/assets/logo.svg" width={200} />
          </div>
          <div className="border rounded bg-white">
            <h2 className="text-center text-2xl font-medium mb-6 border-b p-5 w-full">
              Login to your account
            </h2>
            <div className={cn({'hidden': authDetails.enforceSSO})}>
              <Form
                onSubmit={this.onSubmit}
                className={cn('flex items-center justify-center flex-col')}
              >
                <Loader loading={loading}>
                  {CAPTCHA_ENABLED && (
                    <ReCAPTCHA
                      ref={recaptchaRef}
                      size="invisible"
                      sitekey={window.env.CAPTCHA_SITE_KEY}
                      onChange={(token) => this.handleSubmit(token)}
                    />
                  )}
                  <div style={{ width: '350px' }} className="px-8">
                    <Form.Field>
                      <label>Email Address</label>
                      <Input
                        autoFocus
                        data-test-id={'login'}
                        autoFocus={true}
                        autoComplete="username"
                        type="email"
                        placeholder="e.g. john@example.com"
                        name="email"
                        onChange={this.write}
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
                        onChange={this.write}
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
                  <a href="/api/sso/saml2" rel="noopener noreferrer">
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
                            SSO has not been configured. <br /> Please reach out to your admin.
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
            <div className={cn("flex items-center w-96 justify-center my-8", { 'hidden' : !authDetails.enforceSSO})}>
              <a href="/api/sso/saml2" rel="noopener noreferrer">
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
  }
}
