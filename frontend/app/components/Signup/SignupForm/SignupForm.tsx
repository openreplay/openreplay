import { Button } from '@/ui/actions/button';
import { Notice } from '@/ui/feedback/Notice';
import { Field } from '@/ui/inputs/Field';
import { PasswordRules } from '@/ui/inputs/PasswordRules';
import { Input } from '@/ui/inputs/input';
import { PasswordInput } from '@/ui/inputs/password-input';
import { SimpleSelect } from '@/ui/inputs/select';
import { Building2, Mail, UserRound } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { type FormEvent, useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { useTranslation } from 'react-i18next';

import { SITE_ID_STORAGE_KEY } from 'App/constants/storageKeys';
import { useStore } from 'App/mstore';
import { validateEmail, validatePassword } from 'App/validate';
import { LEGAL } from 'Components/Auth/AuthScreen';

import ENV from '../../../../env';

const CAPTCHA_ENABLED = ENV.CAPTCHA_ENABLED === 'true';

/** The first account of a self-hosted install. */
function SignupForm() {
  const { t } = useTranslation();
  const { userStore } = useStore();
  const { tenants } = userStore;
  const { errors, loading } = userStore.signUpRequest;
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [f, setF] = useState({
    tenantId: '',
    fullname: '',
    password: '',
    email: '',
    organizationName: '',
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((p) => ({ ...p, [k]: e.target.value }));
  const emailBad = f.email.length > 0 && !validateEmail(f.email);
  const ready =
    validateEmail(f.email) &&
    validatePassword(f.password) &&
    f.fullname.trim().length > 0 &&
    f.organizationName.trim().length > 0;

  const send = (token: string) => {
    if (!validatePassword(f.password)) return;
    localStorage.removeItem(SITE_ID_STORAGE_KEY);
    void userStore.signup({
      ...f,
      fullname: f.fullname.trim(),
      organizationName: f.organizationName.trim(),
      projectName: '',
      'g-recaptcha-response': token,
    });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    if (CAPTCHA_ENABLED) recaptchaRef.current?.execute();
    else send('');
  };

  return (
    <form className="m-auth__form" onSubmit={submit} noValidate>
      {CAPTCHA_ENABLED && (
        <ReCAPTCHA
          ref={recaptchaRef}
          size="invisible"
          sitekey={ENV.CAPTCHA_SITE_KEY}
          onChange={(token) => send(token || '')}
        />
      )}
      <header className="m-auth__head">
        <h1 className="m-auth__title" id="m-auth-title">
          {t('Create your account')}
        </h1>
        <p className="m-auth__lede">
          {t(
            'The first account of your organization. Everyone else joins by invitation.',
          )}
        </p>
      </header>
      <div className="m-auth__fields">
        {tenants.length > 0 && (
          <Field label={t('Existing accounts')}>
            <SimpleSelect<string>
              ariaLabel={t('Existing accounts')}
              placeholder={t('Select account')}
              value={f.tenantId || undefined}
              onChange={(v) => setF((p) => ({ ...p, tenantId: v ?? '' }))}
              options={tenants.map((x: any) => ({
                value: String(x.value),
                label: x.label,
              }))}
            />
          </Field>
        )}
        <Field
          label={t('Email')}
          htmlFor="auth-su-email"
          error={emailBad ? t('Enter a valid email address.') : undefined}
        >
          <Input
            id="auth-su-email"
            type="email"
            size="md"
            prefix={<Mail />}
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            autoComplete="username"
            autoFocus
            placeholder={t('e.g. email@yourcompany.com')}
            value={f.email}
            disabled={loading}
            onChange={set('email')}
          />
        </Field>
        <Field label={t('Password')} htmlFor="auth-su-password">
          <PasswordInput
            id="auth-su-password"
            mark
            size="md"
            autoComplete="new-password"
            placeholder={t('Min 8 characters')}
            value={f.password}
            disabled={loading}
            onChange={set('password')}
          />
          <PasswordRules password={f.password} />
        </Field>
        <Field label={t('Name')} htmlFor="auth-su-name">
          <Input
            id="auth-su-name"
            size="md"
            prefix={<UserRound />}
            autoComplete="name"
            placeholder={t('e.g. John Doe')}
            value={f.fullname}
            disabled={loading}
            onChange={set('fullname')}
          />
        </Field>
        <Field label={t('Organization')} htmlFor="auth-su-org">
          <Input
            id="auth-su-org"
            size="md"
            prefix={<Building2 />}
            autoComplete="organization"
            placeholder={t('e.g. Uber')}
            value={f.organizationName}
            disabled={loading}
            onChange={set('organizationName')}
          />
        </Field>
        {errors?.length ? <Notice kind="danger">{errors[0]}</Notice> : null}
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="m-auth__submit"
          loading={loading}
          disabled={!ready}
        >
          {loading ? t('Creating account…') : t('Create account')}
        </Button>
        <p className="m-auth__aside">
          {t('By signing up, you agree to our')}{' '}
          <a
            className="m-auth__link"
            href={LEGAL.terms}
            target="_blank"
            rel="noreferrer"
          >
            {t('terms of service')}
          </a>{' '}
          {t('and')}{' '}
          <a
            className="m-auth__link"
            href={LEGAL.privacy}
            target="_blank"
            rel="noreferrer"
          >
            {t('privacy policy')}
          </a>
          .
        </p>
      </div>
    </form>
  );
}

export default observer(SignupForm);
