import React from 'react';
import { Input, Form } from 'UI';
import { Button } from 'antd'
import styles from './profileSettings.module.css';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { toast } from 'react-toastify';

function Settings() {
  const { userStore } = useStore();
  const updateClient = userStore.updateClient;
  const storeAccountName = userStore.account.name;
  const storeOrganizationName = userStore.account.tenantName;
  const loading = userStore.loading;
  const [accountName, setAccountName] = React.useState(storeAccountName);
  const [organizationName, setOrganizationName] = React.useState(storeOrganizationName);
  const [changed, setChanged] = React.useState(false);

  const onAccNameChange = (e) => {
    setAccountName(e.target.value);
    setChanged(true);
  }

  const onOrgNameChange = (e) => {
    setOrganizationName(e.target.value);
    setChanged(true);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    await updateClient({ name: accountName, tenantName: organizationName }).then(() => {
      setChanged(false);
      toast('Profile settings updated successfully', { type: 'success' });
    }).catch((e) => {
      toast(e.message || 'Failed to update account settings', { type: 'error' });
    });
  }

  return (
    <Form onSubmit={handleSubmit} className={styles.form}>
      <Form.Field>
        <label htmlFor="accountName">{'Name'}</label>
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
        <label htmlFor="organizationName">{'Organization'}</label>
        <Input
          name="organizationName"
          id="organizationName"
          type="text"
          onChange={onOrgNameChange}
          value={organizationName}
          maxLength={50}
        />
      </Form.Field>

      <Button type="default" loading={loading} disabled={!changed} htmlType="submit">
        {'Update'}
      </Button>
    </Form>
  );
}

export default observer(Settings);
