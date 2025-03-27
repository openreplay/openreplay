import React from 'react';
import cn from 'classnames';
import { Button, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { ENTERPRISE_REQUEIRED } from 'App/constants';
import stl from './login.module.css';
import { useStore } from 'App/mstore';

interface SSOLoginProps {
  authDetails: any;
  enforceSSO?: boolean;
}

const SSOLogin = ({ authDetails, enforceSSO = false }: SSOLoginProps) => {
  const { userStore } = useStore();
  const { t } = useTranslation();
  const { isSSOSupported } = userStore;

  const getSSOLink = () =>
    window !== window.top
      ? `${window.location.origin}/api/sso/saml2?iFrame=true`
      : `${window.location.origin}/api/sso/saml2`;

  const ssoLink = getSSOLink();
  const ssoButtonText = `${t('Login with SSO')} ${authDetails.ssoProvider ? `(${authDetails.ssoProvider})` : ''
  }`;

  if (enforceSSO) {
    return (
      <div className={cn('flex items-center w-96 justify-center my-8')}>
        <a href={ssoLink} rel="noopener noreferrer">
          <Button type="primary">{ssoButtonText}</Button>
        </a>
      </div>
    );
  }

  return (
    <div className={cn(stl.sso, 'py-2 flex flex-col items-center')}>
      {authDetails.sso ? (
        <a href={ssoLink} rel="noopener noreferrer">
          <Button type="text" htmlType="submit">
            {ssoButtonText}
          </Button>
        </a>
      ) : (
        <Tooltip
          title={
            <div className="text-center">
              {isSSOSupported ? (
                <span>
                  {t('SSO has not been configured.')}
                  <br />
                  {t('Please reach out to your admin.')}
                </span>
              ) : (
                ENTERPRISE_REQUEIRED(t)
              )}
            </div>
          }
          placement="top"
        >
          <span className="cursor-not-allowed">
            <Button
              type="text"
              htmlType="submit"
              disabled={true}
            >
              {ssoButtonText}
            </Button>
          </span>
        </Tooltip>
      )}
    </div>
  );
};

export default SSOLogin;
