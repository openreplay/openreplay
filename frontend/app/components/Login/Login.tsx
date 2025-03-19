import withPageTitle from 'HOCs/withPageTitle';
import cn from 'classnames';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { toast } from 'react-toastify';
import { forgotPassword, signup } from 'App/routes';
import { Icon, Link, Loader } from 'UI';
import { Button, Form, Input } from 'antd';
import Copyright from 'Shared/Copyright';
import { useTranslation } from 'react-i18next';
import { useStore } from 'App/mstore';
import LanguageSwitcher from '../LanguageSwitcher';
import withCaptcha, { WithCaptchaProps } from 'App/withRecaptcha';
import SSOLogin from './SSOLogin';

const FORGOT_PASSWORD = forgotPassword();
const SIGNUP_ROUTE = signup();

interface LoginProps {
  location: Location;
}

function Login({
  location,
  submitWithCaptcha,
  isVerifyingCaptcha,
  resetCaptcha,
}: LoginProps & WithCaptchaProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { loginStore, userStore } = useStore();
  const { errors } = userStore.loginRequest;
  const { loading } = loginStore;
  const { authDetails } = userStore.authStore;
  const setJwt = userStore.updateJwt;
  const history = useHistory();
  const params = new URLSearchParams(location.search);

  useEffect(() => {
    if (authDetails && !authDetails.tenants) {
      history.push(SIGNUP_ROUTE);
    }
  }, [authDetails]);

  useEffect(() => {
    const jwt = params.get('jwt');
    const spotJwt = params.get('spotJwt');
    if (spotJwt) {
      handleSpotLogin(spotJwt);
    }
    if (jwt) {
      setJwt({ jwt, spotJwt });
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
        toast.success(t('You have been logged into Spot successfully'));
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
        '*',
      );
      tries += 1;
    }, 250);
  };

  const handleSubmit = (token?: string) => {
    if (!email || !password) {
      return;
    }
    loginStore.setEmail(email.trim());
    loginStore.setPassword(password);
    if (token) {
      loginStore.setCaptchaResponse(token);
    }
    loginStore
      .generateJWT()
      .then((resp) => {
        if (resp) {
          userStore.syntheticLogin(resp);
          setJwt({ jwt: resp.jwt, spotJwt: resp.spotJwt ?? null });
          if (resp.spotJwt) {
            handleSpotLogin(resp.spotJwt);
          }
        }
      })
      .catch((e) => {
        userStore.syntheticLoginError(e);
        resetCaptcha();
      });
  };

  const onSubmit = () => {
    if (!email || !password) {
      return;
    }

    submitWithCaptcha({ email: email.trim(), password })
      .then((data) => {
        handleSubmit(data['g-recaptcha-response']);
      })
      .catch((error: any) => {
        console.error('Captcha error:', error);
      });
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center">
        <div className="m-10 ">
          <img src="/assets/logo.svg" width={200} alt="Company Logo" />
        </div>
        <div className="border rounded-lg bg-white shadow-sm">
          <h2 className="text-center text-2xl font-medium mb-6 border-b p-5 w-full">
            {t('Login to your account')}
          </h2>
          <div className={cn(authDetails?.enforceSSO ? '!hidden' : '')}>
            <Form
              onFinish={onSubmit}
              className={cn('flex items-center justify-center flex-col')}
              style={{ width: '350px' }}
            >
              <Loader loading={loading || isVerifyingCaptcha}>
                <div style={{ width: '350px' }} className="px-8">
                  <Form.Item>
                    <label>{t('Email Address')}</label>
                    <Input
                      data-test-id="login"
                      autoFocus
                      autoComplete="username"
                      type="email"
                      placeholder={t('e.g. john@example.com')}
                      name="email"
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      prefix={<Icon name="envelope" size={16} />}
                    />
                  </Form.Item>
                  <Form.Item>
                    <label className="mb-2">{t('Password')}</label>
                    <Input
                      data-test-id="password"
                      autoComplete="current-password"
                      type="password"
                      placeholder={t('Password')}
                      name="password"
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      prefix={<Icon name="key" size={16} />}
                    />
                  </Form.Item>
                </div>
              </Loader>
              {errors && errors.length ? (
                <div className="px-8 my-2 w-full">
                  {errors.map((error, index) => (
                    <div key={index} className="flex items-center bg-red-lightest rounded p-3">
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
                  data-test-id="log-button"
                  className="mt-2 w-full text-center rounded-lg"
                  type="primary"
                  htmlType="submit"
                  loading={loading || isVerifyingCaptcha}
                  disabled={loading || isVerifyingCaptcha}
                >
                  {isVerifyingCaptcha
                    ? t('Verifying...')
                    : loading
                      ? t('Logging in...')
                      : t('Login')}
                </Button>

                <div className="my-8 flex justify-center items-center flex-wrap">
                  <span className="color-gray-medium">
                    {t('Having trouble logging in?')}
                  </span>{' '}
                  <Link to={FORGOT_PASSWORD} className="link ml-1">
                    {t('Reset password')}
                  </Link>
                </div>
              </div>
            </Form>

            <SSOLogin authDetails={authDetails} />
          </div>

          {authDetails?.enforceSSO && (
            <SSOLogin authDetails={authDetails} enforceSSO={true} />
          )}
        </div>
      </div>

      <Copyright />
      <div className="absolute bottom-0 right-0 p-4">
        <LanguageSwitcher />
      </div>
    </div>
  );
}

export default withPageTitle('Login - OpenReplay')(
  withCaptcha(observer(Login))
);
