import React from 'react';
import copy from 'copy-to-clipboard';
import { Form, Input, Button } from "UI";
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';


function TenantKey() {
  const [ copied, setCopied ] = React.useState(false);
  const { userStore } = useStore();
  const tenantKey = userStore.account.tenantKey;

  const copyHandler = () => {
    setCopied(true);
    copy(tenantKey);
    setTimeout(() => {
      setCopied(false);
    }, 1000);
  }
  return (
      <Form.Field>
        <label htmlFor="tenantKey">{ 'Tenant Key' }</label>
          <Input
            name="tenantKey"
            id="tenantKey"
            type="text"
            className={'!w-72'}
            readOnly={ true }
            value={ tenantKey }
            leadingButton={
              <Button
                variant="text-primary"
                role="button"
                onClick={ copyHandler }
              >
                { copied ? 'Copied' : 'Copy' }
              </Button>
            }
          />
      </Form.Field>
  );
}

export default observer(TenantKey);
