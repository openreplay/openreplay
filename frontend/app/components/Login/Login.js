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
  { login, setJwt }
)
@withPageTitle('Login - OpenReplay')
@withRouter
class Login extends React.Component {
  state = {
    email: '',
    password: '',
    CAPTCHA_ENABLED: window.env.CAPTCHA_ENABLED === 'true',
  };

  componentDidMount() {
    const { params } = this.props;
    const jwt = params.get('jwt');
    if (jwt) {
      this.props.setJwt(jwt);
      window.location.href = '/';
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
  console.log(authDetails)
    return (
      <div className="flex flex-col md:flex-row" style={{ height: '100vh' }}>
        <div className={cn('md:w-6/12 relative', stl.left)}>
          <div className="px-6 pt-10">
            <img src="/assets/logo-white.svg" />
          </div>
          <div className="color-white text-lg flex items-center">
            <img style={{ width: '800px', position: 'absolute', bottom: 0, left: 0 }} src={LoginBg} />;
          </div>
        </div>
        <div className="md:w-6/12 flex items-center justify-center py-10">
          <div className="">
            <Form onSubmit={this.onSubmit} className="flex items-center justify-center flex-col">
              <div className="mb-8">
                <h2 className="text-center text-3xl mb-6">Login to OpenReplay</h2>
                {!authDetails.tenants && (
                  <div className="text-center text-xl">
                    Don't have an account?{' '}
                    <span className="link">
                      <Link to={SIGNUP_ROUTE}>Sign up</Link>
                    </span>
                  </div>
                )}
              </div>
              <Loader loading={loading}>
                {CAPTCHA_ENABLED && (
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    size="invisible"
                    sitekey={window.env.CAPTCHA_SITE_KEY}
                    onChange={(token) => this.handleSubmit(token)}
                  />
                )}
                <div style={{ width: '350px' }}>
                  <div className="mb-6">
                    <label>Email</label>
                    <Input
                      autoFocus={true}
                      autoComplete="username"
                      type="text"
                      placeholder="Email"
                      name="email"
                      onChange={this.write}
                      required="true"
                      icon="user-alt"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="mb-2">Password</label>
                    <Input
                      autoComplete="current-password"
                      type="password"
                      placeholder="Password"
                      name="password"
                      onChange={this.write}
                      required="true"
                      icon="lock-alt"
                    />
                  </div>
                </div>
              </Loader>
              {errors.length ? (
                <div className={stl.errors}>
                  {errors.map((error) => (
                    <div className={stl.errorItem}>
                      <Icon name="info" color="red" size="20" />
                      <span className="color-red ml-2">
                        {error}
                        <br />
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
              {/* <div className={ stl.formFooter }> */}
              <Button className="mt-2" type="submit" variant="primary">
                {'Login'}
              </Button>

              <div className={cn(stl.links, 'text-lg')}>
                <Link to={FORGOT_PASSWORD}>{'Forgot your password?'}</Link>
              </div>
              {/* </div> */}
            </Form>

            <div className={cn(stl.sso, 'py-2 flex flex-col items-center')}>
              <div className="mb-4">or</div>

              {authDetails.sso ? (
                <a href="/api/sso/saml2" rel="noopener noreferrer">
                  <Button variant="outline" type="submit">
                    {`Login with SSO ${
                      authDetails.ssoProvider ? `(${authDetails.ssoProvider})` : ''
                    }`}
                  </Button>
                </a>
              ) : (
                <Tooltip
                  delay={0}
                  title={<div>{authDetails.edition === 'ee' ? "SSO has not been configured. Please reach out to your admin." : "This feature requires an enterprise license."}</div>}
                  placement="top"
                >
                  <Button
                    variant="outline"
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
        </div>
      </div>
    );
  }
}
