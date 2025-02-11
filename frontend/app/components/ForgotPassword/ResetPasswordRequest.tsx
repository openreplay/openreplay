import React from 'react';
import { Loader, Icon } from 'UI';
import ReCAPTCHA from 'react-google-recaptcha';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import {Form, Input, Button } from 'antd'

function ResetPasswordRequest() {
  const { userStore } = useStore();
  const loading = userStore.loading;
  const requestResetPassword = userStore.requestResetPassword;
  const recaptchaRef = React.createRef();
  const [requested, setRequested] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState(null);
  const CAPTCHA_ENABLED = window.env.CAPTCHA_ENABLED === 'true';
  const CAPTCHA_SITE_KEY = window.env.CAPTCHA_SITE_KEY;

  const write = (e: any) => {
    const { name, value } = e.target;
    if (name === 'email') setEmail(value);
  };

  const onSubmit = () => {
    // e.preventDefault();
    if (CAPTCHA_ENABLED && recaptchaRef.current) {
      recaptchaRef.current.execute();
    } else if (!CAPTCHA_ENABLED) {
      handleSubmit();
    }
  };

  const handleSubmit = (token?: any) => {
    if (CAPTCHA_ENABLED && recaptchaRef.current && (token === null || token === undefined)) return;

    setError(null);
    requestResetPassword({ email: email.trim(), 'g-recaptcha-response': token })
      .then((response: any) => {
        setRequested(true);
        // if (response && response.errors && response.errors.length > 0) {
        //   setError(response.errors[0]);
        // }
      }).catch((err: any) => {
      setRequested(false);
    });
  };
  return (
    <Form onFinish={onSubmit} style={{ minWidth: '50%' }} className="flex flex-col">
      <Loader loading={false}>
        {CAPTCHA_ENABLED && (
          <div className="flex justify-center">
            <ReCAPTCHA
              ref={recaptchaRef}
              size="invisible"
              data-hidden={requested}
              sitekey={CAPTCHA_SITE_KEY}
              onChange={(token: any) => handleSubmit(token)}
            />
          </div>
        )}
        {!requested && (
          <>
            <Form.Item>
              <label>{'Email Address'}</label>
              <Input
                autoFocus={true}
                autoComplete="email"
                type="email"
                placeholder="Email"
                name="email"
                onChange={write}
                className="w-full"
                prefix={<Icon name="envelope" size={16} />}
                required
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} disabled={loading}>
              Email Password Reset Link
            </Button>
          </>
        )}

        {requested && !error && (
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-tealx-light flex items-center justify-center mb-2">
              <Icon name="envelope-check" size={30} color="tealx" />
            </div>
            <div>
              Alright! a reset link was emailed to <span className="font-medium">{email}</span>.
              Click on it to reset your account password.
            </div>
          </div>
        )}

        {/*{error && (*/}
        {/*  <div className="flex items-center flex-col text-center">*/}
        {/*    <div className="w-16 h-16 rounded-full bg-red-lightest flex items-center justify-center mb-2">*/}
        {/*      <Icon name="envelope-x" size="30" color="red" />*/}
        {/*    </div>*/}
        {/*    {error}*/}
        {/*  </div>*/}
        {/*)}*/}
      </Loader>
    </Form>
  );
}

export default observer(ResetPasswordRequest);
