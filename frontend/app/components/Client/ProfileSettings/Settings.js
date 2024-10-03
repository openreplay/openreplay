import React from 'react';
import { Button, Input, Form } from 'UI';
import styles from './profileSettings.module.css';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';

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
    await updateClient({ name: accountName, tenantName: organizationName });
    setChanged(false);
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

      <Button variant="outline" loading={loading} disabled={!changed} type="submit">
        {'Update'}
      </Button>
    </Form>
  );
}

export default observer(Settings);
