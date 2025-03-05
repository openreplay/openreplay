import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { CopyButton, Form, Input } from 'UI';
import { useTranslation } from 'react-i18next';

function ApiKeySettings() {
  const { t } = useTranslation();
  const { userStore } = useStore();

  const { apiKey } = userStore.account;
  return (
    <Form.Field>
      <label htmlFor="apiKey">{t('Organization API Key')}</label>
      <Input
        name="apiKey"
        id="apiKey"
        type="text"
        readOnly
        value={apiKey}
        className="!w-72"
        leadingButton={<CopyButton content={apiKey} />}
      />
    </Form.Field>
  );
}

export default observer(ApiKeySettings);
