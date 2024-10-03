import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import ReCAPTCHA from 'react-google-recaptcha';
import { Form, Input, Loader, Button, Icon, Message } from 'UI';
import stl from './forgotPassword.module.css';
import { validatePassword } from 'App/validate';
import { PASSWORD_POLICY } from 'App/constants';

const recaptchaRef = React.createRef();
const ERROR_DONT_MATCH = "Passwords don't match.";
const CAPTCHA_ENABLED = window.env.CAPTCHA_ENABLED === 'true';
const CAPTCHA_SITE_KEY = window.env.CAPTCHA_SITE_KEY;

interface Props {
  params: any;
}
function CreatePassword(props: Props) {
  const { params } = props;
  const { userStore } = useStore();
  const loading = userStore.loading;
  const resetPassword = userStore.resetPassword;
  const [error, setError] = React.useState<String | null>(null);
  const [validationError, setValidationError] = React.useState<String | null>(null);
  const [updated, setUpdated] = React.useState(false);
  const [passwordRepeat, setPasswordRepeat] = React.useState('');
  const [password, setPassword] = React.useState('');
  const pass = params.get('pass');
  const invitation = params.get('invitation');

  const handleSubmit = () => {
    if (!validatePassword(password)) {
      return;
    }
    resetPassword({ invitation, pass, password }).then((response: any) => {
      if (response && response.errors && response.errors.length > 0) {
        setError(response.errors[0]);
      } else {
        setUpdated(true);
      }
    });
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
      setValidationError(ERROR_DONT_MATCH);
    } else if (passwordRepeat.length > 0 && !validatePassword(password)) {
      setValidationError(PASSWORD_POLICY);
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

              <React.Fragment>
                <Form.Field>
                  <label>{'New password'}</label>
                  <Input
                    autoComplete="new-password"
                    type="password"
                    placeholder="Type here..."
                    name="password"
                    onChange={write}
                    className="w-full"
                    icon="key"
                    required
                  />
                </Form.Field>
                <Form.Field>
                  <label>{'Cofirm password'}</label>
                  <Input
                    autoComplete="new-password"
                    type="password"
                    placeholder="Re-enter your new password"
                    name="passwordRepeat"
                    onChange={write}
                    className="w-full"
                    icon="key"
                    required
                  />
                </Form.Field>
              </React.Fragment>
            </div>
          </Loader>
          <div className="mt-4">
            <div data-hidden={!updated} className="flex items-center flex-col text-center">
              <div className="w-10 h-10 bg-tealx-lightest rounded-full flex items-center justify-center mb-3">
                <Icon name="check" size="30" color="tealx" />
              </div>
              <span>{'Your password has been updated successfully.'}</span>
            </div>
          </div>

          {validationError && <Message error>{validationError}</Message>}

          <Button type="submit" variant="primary" loading={loading} className="w-full mt-4">
            Create
          </Button>
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
