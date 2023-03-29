import React from 'react';
import { Form, Input, Icon, Button, Link } from 'UI';
import { login } from 'App/routes';
import ReCAPTCHA from 'react-google-recaptcha';
import stl from './signup.module.css';
import { signup } from 'Duck/user';
import { connect } from 'react-redux';
import Select from 'Shared/Select';
import { SITE_ID_STORAGE_KEY } from 'App/constants/storageKeys';

const LOGIN_ROUTE = login();
const recaptchaRef = React.createRef();

@connect(
  (state) => ({
    tenants: state.getIn(['user', 'tenants']),
    errors: state.getIn(['user', 'signupRequest', 'errors']),
    loading: state.getIn(['user', 'signupRequest', 'loading']),
  }),
  { signup }
)
export default class SignupForm extends React.Component {
  state = {
    tenantId: '',
    fullname: '',
    password: '',
    email: '',
    projectName: '',
    organizationName: '',
    reload: false,
    CAPTCHA_ENABLED: window.env.CAPTCHA_ENABLED === 'true',
  };

  static getDerivedStateFromProps(props, state) {
    if (props.errors && props.errors.size > 0 && state.reload) {
      recaptchaRef.current.reset();
      return {
        reload: false,
      };
    }
    return null;
  }

  handleSubmit = (token) => {
    const { tenantId, fullname, password, email, projectName, organizationName, auth } = this.state;
    localStorage.removeItem(SITE_ID_STORAGE_KEY);
    this.props.signup({
      tenantId,
      fullname,
      password,
      email,
      projectName,
      organizationName,
      auth,
      'g-recaptcha-response': token,
    });
    this.setState({ reload: true });
  };

  write = ({ target: { value, name } }) => this.setState({ [name]: value });
  writeOption = ({ name, value }) => this.setState({ [name]: value.value });

  onSubmit = (e) => {
    e.preventDefault();
    const { CAPTCHA_ENABLED } = this.state;
    if (CAPTCHA_ENABLED && recaptchaRef.current) {
      recaptchaRef.current.execute();
    } else if (!CAPTCHA_ENABLED) {
      this.handleSubmit();
    }
  };
  render() {
    const { loading, errors, tenants } = this.props;
    const { CAPTCHA_ENABLED } = this.state;

    return (
      <div className="flex flex-col items-center">
        <div className="m-10 ">
          <img src="/assets/logo.svg" width={200} />
        </div>
        <Form onSubmit={this.onSubmit} className="bg-white border rounded">
          <div className="mb-8">
            <h2 className="text-center text-2xl font-medium mb-6 border-b p-5 w-full">
              Create Account
            </h2>
          </div>
          <>
            {CAPTCHA_ENABLED && (
              <ReCAPTCHA
                ref={recaptchaRef}
                size="invisible"
                sitekey={window.env.CAPTCHA_SITE_KEY}
                onChange={(token) => this.handleSubmit(token)}
              />
            )}
            <div className="px-8">
              {tenants.length > 0 && (
                <Form.Field>
                  <label>Existing Accounts</label>
                  <Select
                    className="w-full"
                    placeholder="Select account"
                    selection
                    options={tenants}
                    name="tenantId"
                    // value={ instance.currentPeriod }
                    onChange={this.writeOption}
                  />
                </Form.Field>
              )}
              <Form.Field>
                <label>Email Address</label>
                <Input
                  autoFocus={true}
                  autoComplete="username"
                  type="email"
                  placeholder="E.g. email@yourcompany.com"
                  name="email"
                  onChange={this.write}
                  required="true"
                  icon="envelope"
                />
              </Form.Field>
              <Form.Field>
                <label className="mb-2">Password</label>
                <Input
                  type="password"
                  placeholder="Min 8 Characters"
                  minLength="8"
                  name="password"
                  onChange={this.write}
                  required="true"
                  icon="key"
                />
              </Form.Field>
              <Form.Field>
                <label>Name</label>
                <Input
                  type="text"
                  placeholder="E.g John Doe"
                  name="fullname"
                  onChange={this.write}
                  required="true"
                  icon="user-alt"
                />
              </Form.Field>
              <Form.Field>
                <label>Organization</label>
                <Input
                  type="text"
                  placeholder="E.g Uber"
                  name="organizationName"
                  onChange={this.write}
                  required="true"
                  icon="buildings"
                />
              </Form.Field>

              <Button type="submit" variant="primary" loading={loading} className="w-full">
                Create Account
              </Button>
              <div className="my-6">
                <div className="text-sm">
                  By signing up, you agree to our{' '}
                  <a href="https://openreplay.com/terms.html" className="link">
                    terms of service
                  </a>{' '}
                  and{' '}
                  <a href="https://openreplay.com/privacy.html" className="link">
                    privacy policy
                  </a>
                  .
                </div>
              </div>
            </div>
          </>
          {errors && (
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
          )}
        </Form>

        <div className="text-center py-6">
            Already having an account?{' '}
            <span className="link">
              <Link to={LOGIN_ROUTE}>Login</Link>
            </span>
          </div>
      </div>
    );
  }
}
