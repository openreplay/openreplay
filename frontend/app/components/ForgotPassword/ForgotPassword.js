import React from 'react';
import { connect } from 'react-redux';
import ReCAPTCHA from 'react-google-recaptcha';
import withPageTitle from 'HOCs/withPageTitle';
import { Form, Input, Loader, Button, Link, Icon, Message } from 'UI';
import { requestResetPassword, resetPassword, resetErrors } from 'Duck/user';
import { login as loginRoute } from 'App/routes';
import { withRouter } from 'react-router-dom';
import { validateEmail } from 'App/validate';
import cn from 'classnames';
import stl from './forgotPassword.module.css';

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
  { requestResetPassword, resetPassword, resetErrors },
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
    CAPTCHA_ENABLED: window.env.CAPTCHA_ENABLED === 'true',
  };

  handleSubmit = (token) => {
    const { email, password } = this.state;
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
    const { CAPTCHA_ENABLED } = this.state;
    if (CAPTCHA_ENABLED && recaptchaRef.current) {
      recaptchaRef.current.execute()
    } else if (!CAPTCHA_ENABLED) {
      this.handleSubmit();
    }
  }

  componentWillUnmount() {
    this.props.resetErrors()
  }

  render() {
    const { CAPTCHA_ENABLED } = this.state;
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
            <img src="/assets/logo-white.svg" />
          </div>
          <div className="color-white text-lg flex items-center">
            <div className="flex items-center justify-center w-full" style={{ height: 'calc(100vh - 130px)'}}>
              <div className="text-4xl">Welcome Back!</div>
            </div>
          </div>
        </div>
        <div className="w-6/12 flex items-center justify-center">
          <Form onSubmit={ this.onSubmit } style={{ minWidth: '50%' }} className="flex flex-col items-center justify-center">
            <div className="mb-8">
              <h2 className="text-center text-3xl mb-6">{`${resetting ? 'Create' : 'Reset'} Password`}</h2>
            </div>
            <Loader loading={ loading }>
              <div data-hidden={ updated } className="w-full">
                { CAPTCHA_ENABLED && (
                  <div className={ stl.recaptcha }>
                    <ReCAPTCHA
                      ref={ recaptchaRef }
                      size="invisible"
                      data-hidden={ requested }
                      sitekey={ window.env.CAPTCHA_SITE_KEY }
                      onChange={ token => this.handleSubmit(token) }
                    />
                  </div>
                )}              

                { !resetting && !requested &&
                  <Form.Field>
                    <i className={ stl.inputIconUser } />
                    <Input
                      autoFocus={true}
                      autocomplete="email"
                      type="text"
                      placeholder="Email"
                      name="email"
                      onChange={ this.write }
                      className="w-full"
                      icon="user-alt"
                    />
                  </Form.Field>
                }

                {
                  requested && !errors && (
                    <div>Reset password link has been sent to your email.</div>
                  )
                }

                {
                  resetting && (
                    <React.Fragment>
                      <Form.Field>
                        <i className={ stl.inputIconPassword } />
                        <Input
                          autocomplete="new-password"
                          type="password"
                          placeholder="Password"
                          name="password"
                          onChange={ this.write }
                          className="w-full"
                        />
                      </Form.Field>
                      <div className={ stl.passwordPolicy } data-hidden={ !this.shouldShouwPolicy() }>
                        { PASSWORD_POLICY }
                      </div>
                      <Form.Field>
                        <i className={ stl.inputIconPassword } />
                        <Input
                          autocomplete="new-password"
                          type="password"
                          placeholder="Confirm Password"
                          name="passwordRepeat"
                          onChange={ this.write }
                          className="w-full"
                        />
                      </Form.Field>
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
            {/* <div className={ stl.formFooter }> */}
              {!(updated || requested) && (
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  disabled={ (resetting && this.isSubmitDisabled()) || (!resetting && !validEmail)}
                >
                  { resetting ? 'Create' : 'Reset' }
                </Button>
              )}

              <div className={ stl.links }>
                <Link to={ LOGIN }>
                  { updated && (<Button variant="primary" type="submit" primary >{ 'Login' }</Button>)}
                  <div data-hidden={ updated }>{'Back to Login'}</div>
                </Link>
              </div>
            {/* </div> */}
          </Form>
        </div>
      </div>
    );
  }
}
