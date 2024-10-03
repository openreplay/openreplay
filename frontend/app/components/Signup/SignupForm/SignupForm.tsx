import { Alert } from 'antd';
import { observer } from 'mobx-react-lite';
import React, {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { toast } from 'react-toastify';

import { PASSWORD_POLICY } from 'App/constants';
import { SITE_ID_STORAGE_KEY } from 'App/constants/storageKeys';
import { useStore } from 'App/mstore';
import { login } from 'App/routes';
import { validatePassword } from 'App/validate';
import { Button, Form, Input, Link } from 'UI';

import Select from 'Shared/Select';

const LOGIN_ROUTE = login();

const SignupForm = () => {
  const { userStore } = useStore();
  const tenants = userStore.tenants;
  const signup = userStore.signup;
  const errors = userStore.signUpRequest.errors;
  const loading = userStore.signUpRequest.loading;
  const [state, setState] = useState({
    tenantId: '',
    fullname: '',
    password: '',
    email: '',
    projectName: '',
    organizationName: '',
    reload: false,
    CAPTCHA_ENABLED: window.env.CAPTCHA_ENABLED === 'true',
  });
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSubmit = (token: string) => {
    const {
      tenantId,
      fullname,
      password,
      email,
      projectName,
      organizationName,
      auth,
    } = state;
    if (!validatePassword(password)) return;
    localStorage.removeItem(SITE_ID_STORAGE_KEY);
    signup({
      tenantId,
      fullname,
      password,
      email,
      projectName,
      organizationName,
      auth,
      'g-recaptcha-response': token,
    }).then((resp: any) => {
      if (
        resp &&
        resp.errors &&
        Array.isArray(resp.errors) &&
        resp.errors.length > 0
      ) {
        if ((resp.errors[0] as string).includes('in use')) {
          toast.error(
            "This email is already linked to an account or team on OpenReplay and can't be used again."
          );
        } else {
          resp.errors[0]
            ? toast.error(resp.errors[0])
            : toast.error('Something went wrong');
        }
      }
    });
    setState({ ...state, reload: true });
  };

  const write = ({ target: { value, name } }: ChangeEvent<HTMLInputElement>) =>
    setState({ ...state, [name]: value });

  const writeOption = ({
    name,
    value,
  }: {
    name: string;
    value: { value: string };
  }) => setState({ ...state, [name]: value.value });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { CAPTCHA_ENABLED } = state;
    if (CAPTCHA_ENABLED && recaptchaRef.current) {
      recaptchaRef.current.execute();
    } else if (!CAPTCHA_ENABLED) {
      handleSubmit('');
    }
  };

  useEffect(() => {
    if (state.password && !validatePassword(state.password)) {
      setPasswordError('Password must be at least 8 characters long');
    } else {
      setPasswordError(null);
    }
  }, [state.password]);

  return (
    <div className="flex flex-col items-center">
      <div className="m-10 ">
        <img src="/assets/logo.svg" width={200} alt="Logo" />
      </div>
      <Form
        onSubmit={onSubmit}
        className="bg-white border rounded-lg shadow-sm"
        style={{ maxWidth: '420px' }}
      >
        <div className="mb-8">
          <h2 className="text-center text-2xl font-medium mb-6 border-b p-5 w-full">
            Create Account
          </h2>
        </div>
        <>
          {state.CAPTCHA_ENABLED && (
            <ReCAPTCHA
              ref={recaptchaRef}
              size="invisible"
              sitekey={window.env.CAPTCHA_SITE_KEY}
              onChange={(token) => handleSubmit(token || '')}
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
                  onChange={writeOption}
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
                onChange={write}
                required={true}
                icon="envelope"
                className="rounded-lg"
              />
            </Form.Field>
            <Form.Field>
              <label className="mb-2">Password</label>
              <Input
                type="password"
                placeholder="Min 8 Characters"
                minLength={8}
                name="password"
                onChange={write}
                required={true}
                icon="key"
                className="rounded-lg"
              />
            </Form.Field>
            <Form.Field>
              <label>Name</label>
              <Input
                type="text"
                placeholder="E.g John Doe"
                name="fullname"
                onChange={write}
                required={true}
                icon="user-alt"
                className="rounded-lg"
              />
            </Form.Field>
            <Form.Field>
              <label>Organization</label>
              <Input
                type="text"
                placeholder="E.g Uber"
                name="organizationName"
                onChange={write}
                required={true}
                icon="buildings"
                className="rounded-lg"
              />
            </Form.Field>

            {passwordError && (
              // <Alert type='error' message={PASSWORD_POLICY} banner icon={null} />
              <Alert
                className="my-3 rounded-lg"
                // message="Error Text"
                description={PASSWORD_POLICY}
                type="error"
              />
            )}
            {errors && errors.length && (
              <Alert
                className="my-3 rounded-lg"
                // message="Error Text"
                description={errors[0]}
                type="error"
              />
            )}

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full rounded-lg"
            >
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
      </Form>

      <div className="text-center py-6">
        Already having an account?{' '}
        <span className="link">
          <Link to={LOGIN_ROUTE}>Login</Link>
        </span>
      </div>
    </div>
  );
};

export default observer(SignupForm);
