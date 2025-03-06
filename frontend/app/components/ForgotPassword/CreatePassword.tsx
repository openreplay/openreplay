import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import ReCAPTCHA from 'react-google-recaptcha';
import { Form, Input, Loader, Icon, Message } from 'UI';
import { Button } from 'antd';
import { validatePassword } from 'App/validate';
import { PASSWORD_POLICY } from 'App/constants';
import stl from './forgotPassword.module.css';
import { useTranslation } from 'react-i18next';

const recaptchaRef = React.createRef();
const ERROR_DONT_MATCH = (t) => t("Passwords don't match.");
const CAPTCHA_ENABLED = window.env.CAPTCHA_ENABLED === 'true';
const { CAPTCHA_SITE_KEY } = window.env;

interface Props {
  params: any;
}
function CreatePassword(props: Props) {
  const { t } = useTranslation();
  const { params } = props;
  const { userStore } = useStore();
  const { loading } = userStore;
  const { resetPassword } = userStore;
  const [error, setError] = React.useState<string | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(
    null,
  );
  const [updated, setUpdated] = React.useState(false);
  const [passwordRepeat, setPasswordRepeat] = React.useState('');
  const [password, setPassword] = React.useState('');
  const pass = params.get('pass');
  const invitation = params.get('invitation');

  const handleSubmit = () => {
    if (!validatePassword(password)) {
      return;
    }
    void resetPassword({ invitation, pass, password });
  };

  const onSubmit = (e: any) => {
    e.preventDefault();
    if (CAPTCHA_ENABLED && recaptchaRef.current) {
      recaptchaRef.current.execute();
    } else if (!CAPTCHA_ENABLED) {
      handleSubmit();
    }
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
  }, [passwordRepeat, password]);

  return (
    <Form
      onSubmit={onSubmit}
      style={{ minWidth: '50%' }}
      className="flex flex-col items-center justify-center"
    >
      {!error && (
        <>
          <Loader loading={loading}>
            <div data-hidden={updated} className="w-full">
              {CAPTCHA_ENABLED && (
                <div className={stl.recaptcha}>
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    size="invisible"
                    sitekey={CAPTCHA_SITE_KEY}
                    onChange={(token: any) => handleSubmit(token)}
                  />
                </div>
              )}

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
              loading={loading}
              className="w-full mt-4"
            >
              {t('Create')}
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

export default observer(CreatePassword);
