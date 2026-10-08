import { Button } from '@/ui/actions/button';
import { Notice } from '@/ui/feedback/Notice';
import { Field } from '@/ui/inputs/Field';
import { Input } from '@/ui/inputs/input';
import { PasswordInput } from '@/ui/inputs/password-input';
import { useToast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import withPageTitle from 'HOCs/withPageTitle';
import { Mail } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { type FormEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ENTERPRISE_REQUEIRED } from 'App/constants';
import { useStore } from 'App/mstore';
import { forgotPassword, signup } from 'App/routes';
import { useHistory, useLocation } from 'App/routing';
import withCaptcha, { WithCaptchaProps } from 'App/withRecaptcha';
import AuthScreen from 'Components/Auth/AuthScreen';
import { extKey } from 'Components/Spots/SpotsList/InstallCTA';

const ssoLink = () =>
  window !== window.top
    ? `${window.location.origin}/api/sso/saml2?iFrame=true`
    : `${window.location.origin}/api/sso/saml2`;

function Login({
  submitWithCaptcha,
  isVerifyingCaptcha,
  resetCaptcha,
}: WithCaptchaProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const location = useLocation();
  const history = useHistory();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [extExist, setExtExist] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const { loginStore, userStore } = useStore();
  const { errors } = userStore.loginRequest;
  const { authDetails } = userStore.authStore;
  const busy = loginStore.loading || isVerifyingCaptcha;
  const setJwt = userStore.updateJwt;
  const params = new URLSearchParams(location.search);

  useEffect(() => {
    let int: ReturnType<typeof setInterval> | null = null;
    if (localStorage.getItem(extKey)) {
      setExtExist(true);
      return undefined;
    }
    int = setInterval(() => {
      window.postMessage({ type: 'orspot:ping' }, '*');
    });
    const onSpotMsg = (e: any) => {
      if (e.data.type === 'orspot:pong') {
        setExtExist(true);
        localStorage.setItem(extKey, '1');
        if (int) clearInterval(int);
        int = null;
        window.removeEventListener('message', onSpotMsg);
      }
    };
    window.addEventListener('message', onSpotMsg);
    return () => {
      if (int) clearInterval(int);
    };
  }, []);

  useEffect(() => {
    if (authDetails && !authDetails.tenants) history.push(signup());
  }, [authDetails]);

  useEffect(() => {
    const jwt = params.get('jwt');
    const spotJwt = params.get('spotJwt');
    if (spotJwt) handleSpotLogin(spotJwt);
    if (jwt) setJwt({ jwt, spotJwt: spotJwt ?? undefined });
  }, []);

  useEffect(() => {
    if (errors?.length) passwordRef.current?.select();
  }, [errors]);

  const handleSpotLogin = (jwt: string) => {
    let tries = 0;
    let int: ReturnType<typeof setInterval>;
    const onSpotMsg = (event: any) => {
      if (event.data.type === 'orspot:logged' && extExist) {
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
      window.postMessage({ type: 'orspot:token', token: jwt }, '*');
      tries += 1;
    }, 250);
  };

  const handleSubmit = (token?: string) => {
    loginStore.setEmail(email.trim());
    loginStore.setPassword(password);
    if (token) loginStore.setCaptchaResponse(token);
    loginStore
      .generateJWT()
      .then((resp) => {
        if (!resp) return;
        userStore.syntheticLogin(resp);
        setJwt({ jwt: resp.jwt, spotJwt: resp.spotJwt ?? null });
        if (resp.spotJwt) handleSpotLogin(resp.spotJwt);
      })
      .catch((e) => {
        userStore.syntheticLoginError(e);
        resetCaptcha();
      });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    submitWithCaptcha({ email: email.trim(), password })
      .then((data) => handleSubmit(data['g-recaptcha-response']))
      .catch((error: any) => console.error('Captcha error:', error));
  };

  const provider = authDetails?.ssoProvider;
  const ssoLabel = provider
    ? t('Sign in with SSO ({{provider}})', { provider })
    : t('Sign in with SSO');
  const ssoBlocked = authDetails?.sso
    ? null
    : userStore.isSSOSupported
      ? t('SSO has not been configured. Please reach out to your admin.')
      : ENTERPRISE_REQUEIRED(t);

  if (authDetails?.enforceSSO) {
    return (
      <AuthScreen other="back">
        <div className="m-auth__form">
          <header className="m-auth__head">
            <h1 className="m-auth__title" id="m-auth-title">
              {t('Sign in')}
            </h1>
            <p className="m-auth__lede">
              {provider
                ? t('Your organization signs in with {{provider}}.', {
                    provider,
                  })
                : t('Your organization signs in with SSO.')}
            </p>
          </header>
          <div className="m-auth__sso-only">
            <Button
              variant="primary"
              size="md"
              className="m-auth__submit"
              onClick={() => window.location.assign(ssoLink())}
            >
              {ssoLabel}
            </Button>
          </div>
        </div>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen other="signup">
      <form className="m-auth__form" onSubmit={submit} noValidate>
        <header className="m-auth__head">
          <h1 className="m-auth__title" id="m-auth-title">
            {t('Sign in')}
          </h1>
          <p className="m-auth__lede">{t('Welcome back.')}</p>
        </header>
        <div className="m-auth__fields">
          <Field label={t('Email')} htmlFor="auth-email">
            <Input
              id="auth-email"
              data-test-id="login"
              type="email"
              size="md"
              prefix={<Mail />}
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              autoComplete="username"
              autoFocus
              placeholder={t('e.g. john@example.com')}
              value={email}
              disabled={busy}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field
            label={t('Password')}
            htmlFor="auth-password"
            aside={
              <button
                type="button"
                className="m-auth__link"
                onClick={() => history.push(forgotPassword())}
              >
                {t('Forgot your password?')}
              </button>
            }
          >
            <PasswordInput
              ref={passwordRef}
              id="auth-password"
              data-test-id="password"
              mark
              size="md"
              autoComplete="current-password"
              placeholder={t('Password')}
              value={password}
              disabled={busy}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {errors?.length ? (
            <Notice kind="danger">
              {errors.map((e: string) => (
                <div key={e}>{e}</div>
              ))}
            </Notice>
          ) : null}
          <Button
            type="submit"
            data-test-id="log-button"
            variant="primary"
            size="md"
            className="m-auth__submit"
            loading={busy}
            disabled={!email.trim() || !password}
          >
            {isVerifyingCaptcha
              ? t('Verifying…')
              : loginStore.loading
                ? t('Signing in…')
                : t('Sign in')}
          </Button>
        </div>
        {authDetails ? (
          <div className="m-auth__sso">
            {ssoBlocked ? (
              <Tooltip title={ssoBlocked} side="bottom">
                <span tabIndex={0} aria-label={`${ssoLabel}: ${ssoBlocked}`}>
                  <Button
                    type="button"
                    variant="subtle"
                    disabled
                    aria-hidden="true"
                    tabIndex={-1}
                  >
                    {ssoLabel}
                  </Button>
                </span>
              </Tooltip>
            ) : (
              <Button
                type="button"
                variant="subtle"
                disabled={busy}
                onClick={() => window.location.assign(ssoLink())}
              >
                {ssoLabel}
              </Button>
            )}
          </div>
        ) : null}
      </form>
    </AuthScreen>
  );
}

export default withPageTitle('Login - OpenReplay')(
  withCaptcha(observer(Login)),
);
