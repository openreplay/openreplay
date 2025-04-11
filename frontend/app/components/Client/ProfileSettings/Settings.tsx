import React from 'react';
import { Input, Form } from 'UI';
import { Button } from 'antd';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { toast } from 'react-toastify';
import styles from './profileSettings.module.css';
import { useTranslation } from 'react-i18next';

function Settings() {
  const { t } = useTranslation();
  const { userStore } = useStore();
  const { updateClient } = userStore;
  const storeAccountName = userStore.account.name;
  const storeOrganizationName = userStore.account.tenantName;
  const { loading } = userStore;
  const [accountName, setAccountName] = React.useState(storeAccountName);
  const [organizationName, setOrganizationName] = React.useState(
    storeOrganizationName,
  );
  const [changed, setChanged] = React.useState(false);

  const onAccNameChange = (e) => {
    setAccountName(e.target.value);
    setChanged(true);
  };

  const onOrgNameChange = (e) => {
    setOrganizationName(e.target.value);
    setChanged(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await updateClient({ name: accountName, tenantName: organizationName })
      .then(() => {
        setChanged(false);
        toast(t('Profile settings updated successfully'), { type: 'success' });
      })
      .catch((e) => {
        toast(e.message || t('Failed to update account settings'), {
          type: 'error',
        });
      });
  };

  return (
    <Form onSubmit={handleSubmit} className={styles.form}>
      <Form.Field>
        <label htmlFor="accountName">{t('Name')}</label>
        <Input
          name="accountName"
          id="accountName"
          type="text"
          onChange={onAccNameChange}
          value={accountName}
          maxLength={50}
        />
      </Form.Field>

      <Form.Field>
        <label htmlFor="organizationName">{t('Organization')}</label>
        <Input
          name="organizationName"
          id="organizationName"
          type="text"
          onChange={onOrgNameChange}
          value={organizationName}
          maxLength={50}
        />
      </Form.Field>

      <Button
        type="default"
        loading={loading}
        disabled={!changed}
        htmlType="submit"
      >
        {t('Update')}
      </Button>
    </Form>
  );
}

export default observer(Settings);
