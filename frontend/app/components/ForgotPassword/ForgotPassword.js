import { connect } from 'react-redux';
import ReCAPTCHA from 'react-google-recaptcha';
import withPageTitle from 'HOCs/withPageTitle';
import { Loader, Button, Link, Icon, Message } from 'UI';
import { requestResetPassword, resetPassword } from 'Duck/user';
import { login as loginRoute } from 'App/routes';
import { withRouter } from 'react-router-dom';
import { validateEmail } from 'App/validate';
import cn from 'classnames';
import stl from './forgotPassword.css';

const LOGIN = loginRoute();
const recaptchaRef = React.createRef();
const ERROR_DONT_MATCH = "Passwords don't match.";
const MIN_LENGTH = 8;
const PASSWORD_POLICY = `Password should contain at least ${ MIN_LENGTH } symbols.`;

const checkDontMatch = (newPassword, newPasswordRepeat) =>
  newPasswordRepeat.length > 0 && newPasswordRepeat !== newPassword;

@connect(
  (state, props) => ({
    errors: state.getIn([ 'user', 'requestResetPassowrd', 'errors' ]),
    resetErrors: state.getIn([ 'user', 'resetPassword', 'errors' ]),
    loading: state.getIn([ 'user', 'requestResetPassowrd', 'loading' ]) || state.getIn([ 'user', 'resetPassword', 'loading' ]),
    params: new URLSearchParams(props.location.search)
  }),
  { requestResetPassword, resetPassword },
)
@withPageTitle("Password Reset - OpenReplay")
@withRouter
export default class ForgotPassword extends React.PureComponent {
  state = {
    email: '',
    code: ' ',
    password: '',
    passwordRepeat: '',
    requested: false,
    updated: false,
  };

  handleSubmit = (token) => {
    const { email, requested, code, password } = this.state;
    const { params } = this.props;

    const pass = params.get('pass')
    const invitation = params.get('invitation')
    const resetting = pass && invitation

    if (!resetting) {
      this.props.requestResetPassword({ email: email.trim(), 'g-recaptcha-response': token }).then(() => {
        const { errors } = this.props;
        if (!errors) this.setState({ requested: true });
      });
    } else {
      if (this.isSubmitDisabled()) return;
      this.props.resetPassword({ email: email.trim(), invitation, pass, password }).then(() => {
        const { resetErrors } = this.props;
        if (!resetErrors) this.setState({ updated: true });
      });
    }
  }

  isSubmitDisabled() {
    const { password, passwordRepeat } = this.state;
    if (password !== passwordRepeat ||
      password.length < MIN_LENGTH) return true;
    return false;
  }

  write = ({ target: { value, name } }) => this.setState({ [ name ]: value })

  shouldShouwPolicy() {
    const { password } = this.state;
    if (password.length > 7) return false;
    if (password === '') return false;
    return true;
  }

  onSubmit = e => {
    e.preventDefault();
    if (window.ENV.CAPTCHA_ENABLED && recaptchaRef.current) {
      recaptchaRef.current.execute()
    } else if (!window.ENV.CAPTCHA_ENABLED) {
      this.handleSubmit();
    }
  }

  render() {
    const { errors, loading, params } = this.props;
    const { requested, updated, password, passwordRepeat, email } = this.state;
    const dontMatch = checkDontMatch(password, passwordRepeat);    
  
    const pass = params.get('pass')
    const invitation = params.get('invitation')
    const resetting = pass && invitation
    const validEmail = validateEmail(email)

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
          <form onSubmit={ this.onSubmit }>
            <div className="mb-8">
              <h2 className="text-center text-3xl mb-6">{`${resetting ? 'Create' : 'Reset'} Password`}</h2>
            </div>
            <Loader loading={ loading }>
              <div data-hidden={ updated }>
                { window.ENV.CAPTCHA_ENABLED && (
                  <div className={ stl.recaptcha }>
                    <ReCAPTCHA
                      ref={ recaptchaRef }
                      size="invisible"
                      data-hidden={ requested }
                      sitekey={ window.ENV.CAPTCHA_SITE_KEY }
                      onChange={ token => this.handleSubmit(token) }
                    />
                  </div>
                )}              

                { !resetting && !requested &&
                  <div className={ stl.inputWithIcon }>
                    <i className={ stl.inputIconUser } />
                    <input
                      autoFocus={true}
                      autocomplete="email"
                      type="text"
                      placeholder="Email"
                      name="email"
                      onChange={ this.write }
                      className={ stl.input }
                    />
                  </div>                
                }

                {
                  requested && (
                    <div>Reset password link has been sent to your email.</div>
                  )
                }

                {
                  resetting && (
                    <React.Fragment>
                      {/* <div className={ stl.inputWithIcon } >
                        <i className={ stl.inputIconPassword } />
                        <input
                          autocomplete="new-password"
                          type="text"
                          placeholder="Code"
                          name="code"
                          onChange={ this.write }
                          className={ stl.input }
                        />
                      </div> */}

                      <div className={ stl.inputWithIcon } >
                        <i className={ stl.inputIconPassword } />
                        <input
                          autocomplete="new-password"
                          type="password"
                          placeholder="Password"
                          name="password"
                          onChange={ this.write }
                          className={ stl.input }
                        />
                      </div>
                      <div className={ stl.passwordPolicy } data-hidden={ !this.shouldShouwPolicy() }>
                        { PASSWORD_POLICY }
                      </div>
                      <div className={ stl.inputWithIcon } >
                        <i className={ stl.inputIconPassword } />
                        <input
                          autocomplete="new-password"
                          type="password"
                          placeholder="Confirm Password"
                          name="passwordRepeat"
                          onChange={ this.write }
                          className={ stl.input }
                        />
                      </div>
                    </React.Fragment>
                  )
                }

                <Message error hidden={ !dontMatch }>
                  { ERROR_DONT_MATCH }
                </Message>
              </div>
            </Loader>
            <div className="mt-4">
              { errors &&
                <div className={ stl.errors }>
                  { errors.map(error => <span>{ error }<br /></span>) }
                </div>
              }
              <div data-hidden={ !updated } className={ stl.success }>
                <Icon name="check" size="30" color="green" />
                { 'Your password has been updated sucessfully.' }
              </div>
            </div>
            <div className={ stl.formFooter }>
              <Button
                data-hidden={ updated || requested }
                type="submit" primary
                loading={loading}
                disabled={ (resetting && this.isSubmitDisabled()) || (!resetting && !validEmail)}
              >
                { resetting ? 'Create' : 'Reset' }
              </Button>

              <div className={ stl.links }>
                <Link to={ LOGIN }>
                  <Button data-hidden={ !updated } type="submit" primary >{ 'Login' }</Button>
                  <div data-hidden={ updated }>{'Back to Login'}</div>
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }
}
