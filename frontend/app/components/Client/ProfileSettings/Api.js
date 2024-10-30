import React from 'react';
import { observer } from 'mobx-react-lite'
import { useStore } from 'App/mstore';
import { CopyButton, Form, Input } from 'UI';

function ApiKeySettings() {
  const { userStore } = useStore();

  const apiKey = userStore.account.apiKey;
  return (
    <Form.Field>
      <label htmlFor="apiKey">{'Organization API Key'}</label>
      <Input
        name="apiKey"
        id="apiKey"
        type="text"
        readOnly={true}
        value={apiKey}
        className={'w-72'}
        leadingButton={<CopyButton content={apiKey} />}
      />
    </Form.Field>
  );
}

export default observer(ApiKeySettings);