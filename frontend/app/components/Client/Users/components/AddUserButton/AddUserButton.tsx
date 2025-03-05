import React from 'react';
import { Tooltip } from 'UI';
import { Button } from 'antd';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

const PERMISSION_WARNING = (t: TFunction) =>
  t('You don’t have the permissions to perform this action.');
const LIMIT_WARNING = (t: TFunction) => t('You have reached users limit.');

function AddUserButton({
  isAdmin = false,
  onClick,
  btnVariant = 'primary',
}: any) {
  const { t } = useTranslation();
  const { userStore } = useStore();
  const limtis = useObserver(() => userStore.limits);
  const cannAddUser = useObserver(
    () => isAdmin && (limtis.teamMember === -1 || limtis.teamMember > 0),
  );
  return (
    <Tooltip
      title={`${!isAdmin ? PERMISSION_WARNING(t) : !cannAddUser ? LIMIT_WARNING(t) : t('Add team member')}`}
      disabled={isAdmin || cannAddUser}
    >
      <Button
        disabled={!cannAddUser || !isAdmin}
        type={btnVariant}
        onClick={onClick}
      >
        {t('Add Team Member')}
      </Button>
    </Tooltip>
  );
}

export default AddUserButton;
