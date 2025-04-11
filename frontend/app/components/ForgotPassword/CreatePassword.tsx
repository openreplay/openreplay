import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { Form, Input, Loader, Icon, Message } from 'UI';
import { Button } from 'antd';
import { validatePassword } from 'App/validate';
import { PASSWORD_POLICY } from 'App/constants';
import { useTranslation } from 'react-i18next';
import withCaptcha, { WithCaptchaProps } from 'App/withRecaptcha';

const ERROR_DONT_MATCH = (t) => t("Passwords don't match.");

interface Props {
  params: any;
}

function CreatePassword(props: Props & WithCaptchaProps) {
  const { t } = useTranslation();
  const { params } = props;
  const { userStore } = useStore();
  const { loading } = userStore;
  const { resetPassword } = userStore;
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [password, setPassword] = useState('');

  const pass = params.get('pass');
  const invitation = params.get('invitation');

  const { submitWithCaptcha, isVerifyingCaptcha, resetCaptcha } = props;

  const handleSubmit = (token?: string) => {
    if (!validatePassword(password)) {
      return;
    }

    resetPassword({
      invitation,
      pass,
      password,
      'g-recaptcha-response': token
    })
      .then(() => {
        setUpdated(true);
      })
      .catch((err) => {
        setError(err.message);
        // Reset captcha for the next attempt
        resetCaptcha();
      });
  };

  const onSubmit = () => {
    // Validate before attempting captcha verification
    if (!validatePassword(password) || password !== passwordRepeat) {
      setValidationError(
        password !== passwordRepeat
          ? ERROR_DONT_MATCH(t)
          : PASSWORD_POLICY(t)
      );
      return;
    }

    // Reset any previous errors
    setError(null);
    setValidationError(null);

    submitWithCaptcha({ pass, invitation, password })
      .then((data) => {
        handleSubmit(data['g-recaptcha-response']);
      })
      .catch((error) => {
        console.error('Captcha verification failed:', error);
        // The component will handle showing appropriate messages
      });
  };

  const write = (e: any) => {
    const { name, value } = e.target;
    if (name === 'password') setPassword(value);
    if (name === 'passwordRepeat') setPasswordRepeat(value);
  };

  useEffect(() => {
    if (passwordRepeat.length > 0 && passwordRepeat !== password) {
      setValidationError(ERROR_DONT_MATCH(t));
    } else if (passwordRepeat.length > 0 && !validatePassword(password)) {
      setValidationError(PASSWORD_POLICY(t));
    } else {
      setValidationError(null);
    }
  }, [passwordRepeat, password, t]);

  return (
    <Form
      onSubmit={onSubmit}
      style={{ minWidth: '50%' }}
      className="flex flex-col items-center justify-center"
    >
      {!error && (
        <>
          <Loader loading={loading || isVerifyingCaptcha}>
            <div data-hidden={updated} className="w-full">
              <Form.Field>
                <label>{t('New password')}</label>
                <Input
                  autoComplete="new-password"
                  type="password"
                  placeholder={t('Type here...')}
                  name="password"
                  onChange={write}
                  className="w-full"
                  icon="key"
                  required
                />
              </Form.Field>
              <Form.Field>
                <label>{t('Confirm password')}</label>
                <Input
                  autoComplete="new-password"
                  type="password"
                  placeholder={t('Re-enter your new password')}
                  name="passwordRepeat"
                  onChange={write}
                  className="w-full"
                  icon="key"
                  required
                />
              </Form.Field>
            </div>
          </Loader>
          <div className="mt-4">
            <div
              data-hidden={!updated}
              className="flex items-center flex-col text-center"
            >
              <div className="w-10 h-10 bg-tealx-lightest rounded-full flex items-center justify-center mb-3">
                <Icon name="check" size="30" color="tealx" />
              </div>
              <span>{t('Your password has been updated successfully.')}</span>
            </div>
          </div>

          {validationError && <Message error>{validationError}</Message>}

          {updated ? null : (
            <Button
              htmlType="submit"
              type="primary"
              loading={loading || isVerifyingCaptcha}
              disabled={loading || isVerifyingCaptcha || validationError !== null}
              className="w-full mt-4"
            >
              {isVerifyingCaptcha
                ? t('Verifying...')
                : loading
                  ? t('Processing...')
                  : t('Create')}
            </Button>
          )}
        </>
      )}

      {error && (
        <div className="flex items-center flex-col text-center">
          <div className="w-16 h-16 rounded-full bg-red-lightest flex items-center justify-center mb-2">
            <Icon name="envelope-x" size="30" color="red" />
          </div>
          {error}
        </div>
      )}
    </Form>
  );
}

export default withCaptcha(observer(CreatePassword));
