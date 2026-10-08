import { Button } from '@/ui/actions/button';
import { Field } from '@/ui/inputs/Field';
import { PasswordRules } from '@/ui/inputs/PasswordRules';
import { PasswordInput } from '@/ui/inputs/password-input';
import { Check, LinkIcon } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { forgotPassword, login } from 'App/routes';
import { useNavigate } from 'App/routing';
import { validatePassword } from 'App/validate';
import withCaptcha, { WithCaptchaProps } from 'App/withRecaptcha';

interface Props {
  params: URLSearchParams;
}

/** Where both the invitation and the reset email land. */
function CreatePassword({
  params,
  submitWithCaptcha,
  isVerifyingCaptcha,
  resetCaptcha,
}: Props & WithCaptchaProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userStore } = useStore();
  const [pw, setPw] = useState({ next: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);
  const busy = userStore.loading || isVerifyingCaptcha;
  const pass = params.get('pass');
  const invitation = params.get('invitation');
  const mismatch = pw.confirm.length > 0 && pw.confirm !== pw.next;
  const ready = validatePassword(pw.next) && pw.next === pw.confirm;

  const send = (token?: string) => {
    userStore
      .resetPassword({
        invitation,
        pass,
        password: pw.next,
        'g-recaptcha-response': token,
      })
      .then(() => setUpdated(true))
      .catch((err: any) => {
        // only a rejected link ends the flow; network / server / validation
        // errors keep the form (the store has already toasted the reason)
        if (err?.rejectedLink)
          setError(err.message || t('Something went wrong'));
        resetCaptcha();
      });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setError(null);
    submitWithCaptcha({ pass, invitation, password: pw.next })
      .then((data) => send(data['g-recaptcha-response']))
      .catch((err: any) => console.error('Captcha verification failed:', err));
  };

  if (error) {
    return (
      <div className="m-auth__done" role="alert">
        <span className="m-auth__mark is-danger" aria-hidden="true">
          <LinkIcon size={17} strokeWidth={1.75} />
        </span>
        <div>
          <h1 className="m-auth__title" id="m-auth-title">
            {t('This link no longer works')}
          </h1>
          <p className="m-auth__lede mt-2">{error}</p>
        </div>
        <div className="m-auth__done-actions">
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate(forgotPassword())}
          >
            {t('Request a new link')}
          </Button>
          <Button variant="subtle" size="md" onClick={() => navigate(login())}>
            {t('Back to sign in')}
          </Button>
        </div>
      </div>
    );
  }

  if (updated) {
    return (
      <div className="m-auth__done" role="status">
        <span className="m-auth__mark" aria-hidden="true">
          <Check size={18} strokeWidth={2} />
        </span>
        <div>
          <h1 className="m-auth__title" id="m-auth-title">
            {t('Password updated')}
          </h1>
          <p className="m-auth__lede mt-2">
            {t('Your password has been updated. You’re signed in.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className="m-auth__form" onSubmit={submit} noValidate>
      <header className="m-auth__head">
        <h1 className="m-auth__title" id="m-auth-title">
          {t('Choose your password')}
        </h1>
        <p className="m-auth__lede">
          {t('Welcome to OpenReplay. Set a password and you’re signed in.')}
        </p>
      </header>
      <div className="m-auth__fields">
        <Field label={t('New password')} htmlFor="auth-np-1">
          <PasswordInput
            id="auth-np-1"
            mark
            size="md"
            autoComplete="new-password"
            autoFocus
            placeholder={t('Type here…')}
            value={pw.next}
            disabled={busy}
            onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
          />
          <PasswordRules password={pw.next} />
        </Field>
        <Field
          label={t('Confirm password')}
          htmlFor="auth-np-2"
          error={mismatch ? t('Passwords don’t match.') : undefined}
        >
          <PasswordInput
            id="auth-np-2"
            mark
            size="md"
            autoComplete="new-password"
            placeholder={t('Re-enter your new password')}
            value={pw.confirm}
            disabled={busy}
            onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
          />
        </Field>
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="m-auth__submit"
          loading={busy}
          disabled={!ready}
        >
          {isVerifyingCaptcha
            ? t('Verifying…')
            : userStore.loading
              ? t('Saving…')
              : t('Set password')}
        </Button>
      </div>
    </form>
  );
}

export default withCaptcha(observer(CreatePassword));
