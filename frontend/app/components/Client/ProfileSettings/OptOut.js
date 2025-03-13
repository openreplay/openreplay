import React from 'react';
import { Checkbox } from 'UI';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { toast } from 'react-toastify';
import { t } from 'i18next';

function OptOut() {
  const { userStore } = useStore();
  const { updateClient } = userStore;
  const [optOut, setOptOut] = React.useState(userStore.account.optOut);

  const onChange = () => {
    setOptOut(!optOut);
    void updateClient({ optOut: !optOut })
      .then(() => {
        toast(t('Account settings updated successfully'), { type: 'success' });
      })
      .catch((e) => {
        toast(e.message || t('Failed to update account settings'), {
          type: 'error',
        });
        setOptOut(optOut);
      });
  };

  return (
    <div>
      <Checkbox
        name="isPublic"
        type="checkbox"
        checked={optOut}
        onClick={onChange}
        className="font-medium mr-8"
        label="Anonymize"
      />
    </div>
  );
}

export default observer(OptOut);
