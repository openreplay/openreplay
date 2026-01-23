import React from 'react';
import withPageTitle from 'HOCs/withPageTitle';
import { PageTitle } from 'UI';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import LanguageSwitcher from "App/components/LanguageSwitcher";
import Settings from './Settings';
import ChangePassword from './ChangePassword';
import Api from './Api';
import TenantKey from './TenantKey';
import OptOut from './OptOut';
import Licenses from './Licenses';
import { useTranslation } from 'react-i18next';

function ProfileSettings() {
  const { t } = useTranslation();
  const { userStore } = useStore();
  const { account } = userStore;
  const { isEnterprise } = userStore;
  return (
    <div className="bg-white rounded-lg  border shadow-xs">
      <PageTitle title={<div className="px-4 pt-4">{t('Account')}</div>} />
      <Section
        title={t('Profile')}
        description={t('Your email address is your identity on OpenReplay and is used to login.')}
        children={<Settings />}
      />

      <div className="border-b my-4 md:my-10" />

      {account.hasPassword && (
        <>
          <Section
            title={t('Change Password')}
            description={t('Updating your password from time to time enhaces your account’s security')}
            children={<ChangePassword />}
          />

          <div className="border-b my-10" />
        </>
      )}

      <Section
        title={t('Interface Language')}
        description={t('Select the language in which OpenReplay will appear.')}
        children={<LanguageSwitcher />}
      />

      <Section
        title={t('Organization API Key')}
        description={t('Your API key gives you access to an extra set of services.')}
        children={<Api />}
      />

      {isEnterprise && (account.admin || account.superAdmin) && (
        <>
          <div className="border-b my-10" />
          <Section
            title={t('Tenant Key')}
            description={t('For SSO (SAML) authentication.')}
            children={<TenantKey />}
          />
        </>
      )}

      {!isEnterprise && (
        <>
          <div className="border-b my-10" />
          <Section
            title={t('Data Collection')}
            description={t('Enables you to control how OpenReplay captures data on your organization’s usage to improve our product.')}
            children={<OptOut />}
          />
        </>
      )}

      {account.license && (
        <>
          <div className="border-b my-10" />
          <Section title={t('License')} description={t('License key and expiration date.')} children={<Licenses />} />
        </>
      )}
    </div>
  );
}

function Section({ title, description, children }: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex md:items-center flex-col md:flex-row">
      <div className={'px-4 py-2 md:p-5 w-full md:w-80'}>
        <h4 className="text-lg mb-0 md:mb-4">{title}</h4>
        <div className={"text-disabled-text"}>
          {description}
        </div>
      </div>
      <div>
        {children}
      </div>
    </div>
  )
}

export default withPageTitle('Account - OpenReplay Preferences')(
  observer(ProfileSettings),
);
