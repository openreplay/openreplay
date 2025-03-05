import React from 'react';
import copy from 'copy-to-clipboard';
import { Form, Input } from 'UI';
import { Button } from 'antd';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { useTranslation } from 'react-i18next';

function TenantKey() {
  const { t } = useTranslation();
  const [copied, setCopied] = React.useState(false);
  const { userStore } = useStore();
  const { tenantKey } = userStore.account;

  const copyHandler = () => {
    setCopied(true);
    copy(tenantKey);
    setTimeout(() => {
      setCopied(false);
    }, 1000);
  };
  return (
    <Form.Field>
      <label htmlFor="tenantKey">{t('Tenant Key')}</label>
      <Input
        name="tenantKey"
        id="tenantKey"
        type="text"
        className="!w-72"
        readOnly
        value={tenantKey}
        leadingButton={
          <Button type="text" onClick={copyHandler}>
            {copied ? t('Copied') : t('Copy')}
          </Button>
        }
      />
    </Form.Field>
  );
}

export default observer(TenantKey);
