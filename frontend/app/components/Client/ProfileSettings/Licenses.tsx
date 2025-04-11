import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { useTranslation } from 'react-i18next';

function Licenses() {
  const { t } = useTranslation();
  const { userStore } = useStore();
  const { account } = userStore;
  return (
    <div>
      <div>{account.license}</div>
      {account.expirationDate && (
        <div className="">
          ({t('Expires on')}&nbsp;
          {account.expirationDate.toFormat('LLL dd, yyyy')})
        </div>
      )}
    </div>
  );
}

export default observer(Licenses);
