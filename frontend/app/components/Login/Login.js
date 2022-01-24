import { connect } from 'react-redux';
import withPageTitle from 'HOCs/withPageTitle';
import { Icon, Loader, Button, Link } from 'UI';
import { login } from 'Duck/user';
import { forgotPassword, signup } from 'App/routes';
import ReCAPTCHA from 'react-google-recaptcha';
import { withRouter } from 'react-router-dom';
import stl from './login.css';
import cn from 'classnames';
import { setJwt } from 'Duck/jwt';

const FORGOT_PASSWORD = forgotPassword();
const SIGNUP_ROUTE = signup();
const recaptchaRef = React.createRef();

@connect(
  (state, props) => ({
    errors: state.getIn([ 'user', 'loginRequest', 'errors' ]),
    loading: state.getIn([ 'user', 'loginRequest', 'loading' ]),
    authDetails: state.getIn(['user', 'authDetails']),
    params: new URLSearchParams(props.location.search)
  }),
  { login, setJwt },
)
@withPageTitle('Login - OpenReplay')
@withRouter
export default class Login extends React.Component {
  state = {
    email: '',
    password: '',
  };

  componentDidMount() {
    const { params } = this.props;
    const jwt = params.get('jwt')
    if (jwt) {
      this.props.setJwt(jwt);
      window.location.href = '/';
    }
  }

  handleSubmit = (token) => {
    const { email, password } = this.state;
    this.props.login({ email: email.trim(), password, 'g-recaptcha-response': token }).then(() => {
      const { errors } = this.props;      
    })
  }

  onSubmit = (e) => {    
    e.preventDefault();
    if (window.ENV.CAPTCHA_ENABLED && recaptchaRef.current) {
      recaptchaRef.current.execute();      
    } else if (!window.ENV.CAPTCHA_ENABLED) {
      this.handleSubmit();
    }
  }

  write = ({ target: { value, name } }) => this.setState({ [ name ]: value })

  render() {
    const { errors, loading, authDetails } = this.props;

    return (
      <div className="flex" style={{ height: '100vh'}}>
        <div className={cn("w-6/12", stl.left)}>
          <div className="px-6 pt-10">
            <img src="/logo-white.svg" />
          </div>
          <div className="color-white text-lg flex items-center">
            <div className="flex items-center justify-center w-full" style={{ height: 'calc(100vh - 130px)'}}>
              <div className="text-4xl">Welcome Back!</div>
            </div>
          </div>
        </div>
        <div className="w-6/12 flex items-center justify-center">
          <div className="">
            <form onSubmit={ this.onSubmit }>
              <div className="mb-8">
                <h2 className="text-center text-3xl mb-6">Login to OpenReplay</h2>
                { !authDetails.tenants && <div className="text-center text-xl">Don't have an account? <span className="link"><Link to={ SIGNUP_ROUTE }>Sign up</Link></span></div> }
              </div>
              <Loader loading={ loading }>
                { window.ENV.CAPTCHA_ENABLED && (
                  <ReCAPTCHA
                    ref={ recaptchaRef }
                    size="invisible"
                    sitekey={ window.ENV.CAPTCHA_SITE_KEY }
                    onChange={ token => this.handleSubmit(token) }
                  />
                )}            
                <div>
                  <div className="mb-6">
                    <label>Email</label>
                    <div className={ stl.inputWithIcon }>
                      <i className={ stl.inputIconUser } />
                      <input
                        autoFocus={true}
                        autoComplete="username"
                        type="text"
                        placeholder="Email"
                        name="email"
                        onChange={ this.write }
                        className={ stl.email }
                        required="true"
                      />
                    </div>
                  </div>
                  <div className="mb-6">
                    <label className="mb-2">Password</label>
                    <div className={ stl.inputWithIcon }>
                      <i className={ stl.inputIconPassword } />
                      <input
                        autoComplete="current-password"
                        type="password"
                        placeholder="Password"
                        name="password"
                        onChange={ this.write }
                        className={ stl.password }
                        required="true"
                      />
                    </div>
                  </div>
                </div>
              </Loader>
              { errors &&
                <div className={ stl.errors }>
                  { errors.map(error => (
                    <div className={stl.errorItem}>
                      <Icon name="info" color="red" size="20"/>
                      <span className="color-red ml-2">{ error }<br /></span>
                    </div>
                  )) }
                </div>
              }
              <div className={ stl.formFooter }>
                <Button type="submit" primary >{ 'Login' }</Button>

                <div className={ cn(stl.links, 'text-lg') }>
                  <Link to={ FORGOT_PASSWORD }>{'Forgot your password?'}</Link>
                </div>
              </div>
            </form>
            { authDetails.sso && (
              <div className={cn(stl.sso, "py-2 flex flex-col items-center")}>
                <div className="mb-4">or</div>
                <a href="/api/sso/saml2" rel="noopener noreferrer">
                  <Button type="button" outline type="submit" primary >{ `Login with SSO (${authDetails.ssoProvider})` }</Button>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
