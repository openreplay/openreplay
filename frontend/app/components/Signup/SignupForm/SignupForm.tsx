import { Alert, Button } from 'antd';
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
import { Form, Input, Link } from 'UI';

import Select from 'Shared/Select';
import { useTranslation } from 'react-i18next';

const LOGIN_ROUTE = login();

function SignupForm() {
  const { t } = useTranslation();
  const { userStore } = useStore();
  const { tenants } = userStore;
  const { signup } = userStore;
  const { errors } = userStore.signUpRequest;
  const { loading } = userStore.signUpRequest;
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
            t(
              "This email is already linked to an account or team on OpenReplay and can't be used again.",
            ),
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
      setPasswordError(t('Password must be at least 8 characters long'));
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
            {t('Create Account')}
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
                <label>{t('Existing Accounts')}</label>
                <Select
                  className="w-full"
                  placeholder={t('Select account')}
                  selection
                  options={tenants}
                  name="tenantId"
                  // value={ instance.currentPeriod }
                  onChange={writeOption}
                />
              </Form.Field>
            )}
            <Form.Field>
              <label>{t('Email Address')}</label>
              <Input
                autoFocus
                autoComplete="username"
                type="email"
                placeholder={t('E.g. email@yourcompany.com')}
                name="email"
                onChange={write}
                required
                icon="envelope"
                className="rounded-lg"
              />
            </Form.Field>
            <Form.Field>
              <label className="mb-2">{t('Password')}</label>
              <Input
                type="password"
                placeholder="Min 8 Characters"
                minLength={8}
                name="password"
                onChange={write}
                required
                icon="key"
                className="rounded-lg"
              />
            </Form.Field>
            <Form.Field>
              <label>{t('Name')}</label>
              <Input
                type="text"
                placeholder={t('E.g John Doe')}
                name="fullname"
                onChange={write}
                required
                icon="user-alt"
                className="rounded-lg"
              />
            </Form.Field>
            <Form.Field>
              <label>{t('Organization')}</label>
              <Input
                type="text"
                placeholder={t('E.g Uber')}
                name="organizationName"
                onChange={write}
                required
                icon="buildings"
                className="rounded-lg"
              />
            </Form.Field>

            {passwordError && (
              // <Alert type='error' message={PASSWORD_POLICY} banner icon={null} />
              <Alert
                className="my-3 rounded-lg"
                // message="Error Text"
                description={PASSWORD_POLICY(t)}
                type="error"
              />
            )}
            {errors && errors.length > 0 ? (
              <Alert
                className="my-3 rounded-lg"
                // message="Error Text"
                description={errors[0]}
                type="error"
              />
            ) : null}

            <Button
              htmlType="submit"
              type="primary"
              loading={loading}
              className="w-full rounded-lg"
            >
              {t('Create Account')}
            </Button>
            <div className="my-6">
              <div className="text-sm">
                {t('By signing up, you agree to our')}{' '}
                <a href="https://openreplay.com/terms.html" className="link">
                  {t('terms of service')}
                </a>{' '}
                {t('and')}{' '}
                <a href="https://openreplay.com/privacy.html" className="link">
                  {t('privacy policy')}
                </a>
                .
              </div>
            </div>
          </div>
        </>
      </Form>

      <div className="text-center py-6">
        {t('Already having an account?')}{' '}
        <span className="link">
          <Link to={LOGIN_ROUTE}>{t('Login')}</Link>
        </span>
      </div>
    </div>
  );
}

export default observer(SignupForm);
