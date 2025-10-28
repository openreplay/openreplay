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
    <div className="px-4 py-2 md:p-0">
      <Input
        name="apiKey"
        id="apiKey"
        type="text"
        readOnly
        value={apiKey}
        className="!w-72"
        leadingButton={<CopyButton content={apiKey} />}
      />
    </div>
  );
}

export default observer(ApiKeySettings);
