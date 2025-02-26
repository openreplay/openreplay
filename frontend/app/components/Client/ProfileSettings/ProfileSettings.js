import React from 'react';
import withPageTitle from 'HOCs/withPageTitle';
import { PageTitle } from 'UI';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import Settings from './Settings';
import ChangePassword from './ChangePassword';
import styles from './profileSettings.module.css';
import Api from './Api';
import TenantKey from './TenantKey';
import OptOut from './OptOut';
import Licenses from './Licenses';

function ProfileSettings() {
  const { userStore } = useStore();
  const { account } = userStore;
  const { isEnterprise } = userStore;
  return (
    <div className="bg-white rounded-lg  border shadow-sm p-5">
      <PageTitle title={<div>Account</div>} />
      <div className="flex items-center">
        <div className={styles.left}>
          <h4 className="text-lg mb-4">Profile</h4>
          <div className={styles.info}>Your email address is your identity on OpenReplay and is used to login.</div>
        </div>
        <div>
          <Settings />
        </div>
      </div>

      <div className="border-b my-10" />

      {account.hasPassword && (
        <>
          <div className="flex items-center">
            <div className={styles.left}>
              <h4 className="text-lg mb-4">Change Password</h4>
              <div className={styles.info}>Updating your password from time to time enhances your account’s security.</div>
            </div>
            <div>
              <ChangePassword />
            </div>
          </div>

          <div className="border-b my-10" />
        </>
      )}

      <div className="flex items-center">
        <div className={styles.left}>
          <h4 className="text-lg mb-4">Organization API Key</h4>
          <div className={styles.info}>Your API key gives you access to an extra set of services.</div>
        </div>
        <div>
          <Api />
        </div>
      </div>

      {isEnterprise && (account.admin || account.superAdmin) && (
        <>
          <div className="border-b my-10" />
          <div className="flex items-center">
            <div className={styles.left}>
              <h4 className="text-lg mb-4">Tenant Key</h4>
              <div className={styles.info}>For SSO (SAML) authentication.</div>
            </div>
            <div>
              <TenantKey />
            </div>
          </div>
        </>
      )}

      {!isEnterprise && (
        <>
          <div className="border-b my-10" />
          <div className="flex items-center">
            <div className={styles.left}>
              <h4 className="text-lg mb-4">Data Collection</h4>
              <div className={styles.info}>
                Enables you to control how OpenReplay captures data on your organization’s usage to improve our product.
              </div>
            </div>
            <div>
              <OptOut />
            </div>
          </div>
        </>
      )}

      {account.license && (
        <>
          <div className="border-b my-10" />

          <div className="flex items-center">
            <div className={styles.left}>
              <h4 className="text-lg mb-4">License</h4>
              <div className={styles.info}>License key and expiration date.</div>
            </div>
            <div>
              <Licenses />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default withPageTitle('Account - OpenReplay Preferences')(observer(ProfileSettings));
