import React, { useState } from 'react';
import { Loader, Icon } from 'UI';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { Form, Input, Button, Typography } from 'antd';
import { SquareArrowOutUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import withCaptcha, { WithCaptchaProps } from 'App/withRecaptcha';

interface Props {
}

function ResetPasswordRequest(props: Props & WithCaptchaProps) {
  const { t } = useTranslation();
  const { userStore } = useStore();
  const { loading } = userStore;
  const { requestResetPassword } = userStore;
  const [requested, setRequested] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [smtpError, setSmtpError] = useState<boolean>(false);

  const { submitWithCaptcha, isVerifyingCaptcha, resetCaptcha } = props;

  const write = (e: any) => {
    const { name, value } = e.target;
    if (name === 'email') setEmail(value);
  };

  const onSubmit = () => {
    // Validation check
    if (!email || email.trim() === '') {
      return;
    }

    submitWithCaptcha({ email: email.trim() })
      .then((data) => {
        handleSubmit(data['g-recaptcha-response']);
      })
      .catch((error: any) => {
        console.error('Captcha verification failed:', error);
      });
  };

  const handleSubmit = (token?: string) => {
    setError(null);
    requestResetPassword({ email: email.trim(), 'g-recaptcha-response': token })
      .catch((err: any) => {
        if (err.message?.toLowerCase().includes('smtp')) {
          setSmtpError(true);
        }

        setError(err.message);
        // Reset captcha for the next attempt
        resetCaptcha();
      })
      .finally(() => {
        setRequested(true);
      });
  };

  return (
    <Form
      onFinish={onSubmit}
      style={{ minWidth: '50%' }}
      className="flex flex-col"
    >
      <Loader loading={loading || isVerifyingCaptcha}>
        {!requested && (
          <>
            <Form.Item>
              <label>{t('Email Address')}</label>
              <Input
                autoFocus
                autoComplete="email"
                type="email"
                placeholder={t('Email')}
                name="email"
                onChange={write}
                className="w-full"
                prefix={<Icon name="envelope" size={16} />}
                required
              />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading || isVerifyingCaptcha}
              disabled={loading || isVerifyingCaptcha}
            >
              {isVerifyingCaptcha
                ? t('Verifying...')
                : loading
                  ? t('Processing...')
                  : t('Email Password Reset Link')}
            </Button>
          </>
        )}

        {requested && !error && (
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-tealx-light flex items-center justify-center mb-2">
              <Icon name="envelope-check" size={30} color="tealx" />
            </div>
            <div>
              {t('Alright! a reset link was emailed to')}{' '}
              <span className="font-medium">{email}</span>.{' '}
              {t('Click on it to reset')}
              {t('your account password.')}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center flex-col text-center">
            <div className="w-16 h-16 rounded-full bg-red-lightest flex items-center justify-center mb-2">
              <Icon name="envelope-x" size="30" color="red" />
            </div>
            {smtpError ? (
              <Typography.Text>
                {t('Email delivery failed due to invalid SMTP configuration. Please contact your admin.')}
                <a
                  href="https://docs.openreplay.com/en/configuration/configure-smtp/"
                  className="!text-neutral-900 hover:!underline flex items-center justify-center gap-1 mt-2"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('Learn More')}
                  <SquareArrowOutUpRight
                    size={12}
                    strokeWidth={1.5}
                    className="inline"
                  />
                </a>
              </Typography.Text>
            ) : (
              <Typography.Text>{error}</Typography.Text>
            )}
          </div>
        )}
      </Loader>
    </Form>
  );
}

export default withCaptcha(observer(ResetPasswordRequest));
