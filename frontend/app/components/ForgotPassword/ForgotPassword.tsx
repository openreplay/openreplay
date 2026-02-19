import { Button } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { login as loginRoute } from 'App/routes';
import { useLocation } from 'App/routing';
import { Link } from 'UI';

import Copyright from 'Shared/Copyright';

import CreatePassword from './CreatePassword';
import ResetPassword from './ResetPasswordRequest';

const logo = new URL('../../assets/logo.svg', import.meta.url);
const LOGIN = loginRoute();

function ForgotPassword() {
  const { t } = useTranslation();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const pass = params.get('pass');
  const invitation = params.get('invitation');
  const creatingNewPassword = pass && invitation;

  return (
    <div className="flex items-center justify-center h-screen -mt-20">
      <div className="flex flex-col items-center">
        <div className="m-10 ">
          <img src={logo} width={200} />
        </div>
        <div
          className="border rounded-lg bg-white shadow-xs"
          style={{ width: '350px' }}
        >
          {creatingNewPassword ? (
            <h2 className="text-center text-lg font-medium mb-6 border-b p-5 w-full">
              {t('Welcome, join your organization by creating a new password')}
            </h2>
          ) : (
            <h2 className="text-center text-2xl font-medium mb-6 border-b p-5 w-full">
              {t('Reset Password')}
            </h2>
          )}

          <div className="w-full px-8">
            {creatingNewPassword ? (
              <CreatePassword params={params} />
            ) : (
              <ResetPassword />
            )}
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="my-8">
              <Link to={LOGIN}>
                <Button type="link">
                  <div className="color-blue link">{t('Back to Login')}</div>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Copyright />
    </div>
  );
}

export default ForgotPassword;
