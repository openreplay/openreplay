import React from 'react';
import { Checkbox } from 'UI';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { toast } from 'react-toastify';

function OptOut() {
  const { userStore } = useStore();
  const updateClient = userStore.updateClient;
  const [optOut, setOptOut] = React.useState(userStore.account.optOut);

  const onChange = () => {
    setOptOut(!optOut);
    void updateClient({ optOut: !optOut }).then(() => {
      toast('Account settings updated successfully', { type: 'success' });
    }).catch((e) => {
      toast(e.message || 'Failed to update account settings', { type: 'error' });
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
