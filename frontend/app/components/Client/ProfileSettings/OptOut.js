import React from 'react'
import { Checkbox } from 'UI'
import { observer } from 'mobx-react-lite'
import { useStore } from "App/mstore";

function OptOut() {
  const { userStore } = useStore();
  const optOut = userStore.account.optOut;
  const updateClient = userStore.updateClient;

  const onChange = () => {
    void updateClient({ optOut: !optOut });
  }

  return (
    <div>
      <Checkbox
        name="isPublic"
        type="checkbox"
        checked={ optOut }
        onClick={ onChange }
        className="font-medium mr-8"
        label="Anonymize"
      />
    </div>
  )
}

export default observer(OptOut);
