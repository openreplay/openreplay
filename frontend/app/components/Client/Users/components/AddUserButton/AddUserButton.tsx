import { PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { TFunction } from 'i18next';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { mobileScreen } from 'App/utils/isMobile';
import { Tooltip } from 'UI';

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
  const limtis = userStore.limits;
  const cannAddUser =
    isAdmin && (limtis.teamMember === -1 || limtis.teamMember > 0);

  return (
    <Tooltip
      title={`${!isAdmin ? PERMISSION_WARNING(t) : !cannAddUser ? LIMIT_WARNING(t) : t('Add team member')}`}
      disabled={isAdmin || cannAddUser}
    >
      <Button
        disabled={!cannAddUser || !isAdmin}
        type={btnVariant}
        size="small"
        onClick={onClick}
        icon={<PlusOutlined />}
      >
        {mobileScreen ? undefined : t('Add Team Member')}
      </Button>
    </Tooltip>
  );
}

export default observer(AddUserButton);
