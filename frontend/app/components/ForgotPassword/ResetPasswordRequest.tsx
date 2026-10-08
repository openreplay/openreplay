import { Button } from '@/ui/actions/button';
import { Notice } from '@/ui/feedback/Notice';
import { Field } from '@/ui/inputs/Field';
import { Input } from '@/ui/inputs/input';
import { Mail, MailCheck, SquareArrowOutUpRight } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { login } from 'App/routes';
import { useNavigate } from 'App/routing';
import { validateEmail } from 'App/validate';
import withCaptcha, { WithCaptchaProps } from 'App/withRecaptcha';

const SMTP_DOCS =
  'https://docs.openreplay.com/en/configuration/configure-smtp/';

function ResetPasswordRequest({
  submitWithCaptcha,
  isVerifyingCaptcha,
  resetCaptcha,
}: WithCaptchaProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userStore } = useStore();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [smtpError, setSmtpError] = useState(false);
  const busy = userStore.loading || isVerifyingCaptcha;

  const send = (token?: string) => {
    setError(null);
    setSmtpError(false);
    const to = email.trim();
    userStore
      .requestResetPassword({ email: to, 'g-recaptcha-response': token })
      .then(() => setSentTo(to))
      .catch((err: any) => {
        setSmtpError(!!err.message?.toLowerCase().includes('smtp'));
        setError(err.message || t('Something went wrong'));
        resetCaptcha();
      });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email.trim())) return;
    submitWithCaptcha({ email: email.trim() })
      .then((data) => send(data['g-recaptcha-response']))
      .catch((err: any) => console.error('Captcha verification failed:', err));
  };

  if (sentTo) {
    return (
      <div className="m-auth__done" role="status">
        <span className="m-auth__mark" aria-hidden="true">
          <MailCheck size={18} strokeWidth={1.75} />
        </span>
        <div>
          <h1 className="m-auth__title" id="m-auth-title">
            {t('Check your email')}
          </h1>
          <p className="m-auth__lede mt-2">
            {t('A reset link was sent to')} <strong>{sentTo}</strong>.{' '}
            {t('Open it to choose a new password.')}
          </p>
        </div>
        <div className="m-auth__done-actions">
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate(login())}
          >
            {t('Back to sign in')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className="m-auth__form" onSubmit={submit} noValidate>
      <header className="m-auth__head">
        <h1 className="m-auth__title" id="m-auth-title">
          {t('Reset your password')}
        </h1>
        <p className="m-auth__lede">
          {t(
            'Enter your email address and we’ll send you a link to choose a new one.',
          )}
        </p>
      </header>
      <div className="m-auth__fields">
        <Field label={t('Email')} htmlFor="auth-reset-email">
          <Input
            id="auth-reset-email"
            type="email"
            size="md"
            prefix={<Mail />}
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            autoComplete="email"
            autoFocus
            placeholder={t('e.g. john@example.com')}
            value={email}
            disabled={busy}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        {error && (
          <Notice kind="danger">
            {smtpError
              ? t(
                  'Email delivery failed due to invalid SMTP configuration. Please contact your admin.',
                )
              : error}
            {smtpError && (
              <>
                {' '}
                <a
                  className="m-auth__link"
                  href={SMTP_DOCS}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('Learn more')}
                  <SquareArrowOutUpRight
                    size={11}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="ml-1 inline align-[-1px]"
                  />
                </a>
              </>
            )}
          </Notice>
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="m-auth__submit"
          loading={busy}
          disabled={!validateEmail(email.trim())}
        >
          {isVerifyingCaptcha
            ? t('Verifying…')
            : userStore.loading
              ? t('Sending…')
              : t('Email me a reset link')}
        </Button>
      </div>
    </form>
  );
}

export default withCaptcha(observer(ResetPasswordRequest));
