import { Button } from '@/ui/actions/button';
import { Tooltip } from '@/ui/overlays/tooltip';
import { TFunction } from 'i18next';
import { Plus } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

const PERMISSION_WARNING = (t: TFunction) =>
  t('You don’t have the permissions to perform this action.');
const LIMIT_WARNING = (t: TFunction) => t('You have reached users limit.');

function AddUserButton({ isAdmin = false, onClick }: any) {
  const { t } = useTranslation();
  const { userStore } = useStore();
  const limtis = userStore.limits;
  React.useEffect(() => {
    // unknown limits leave the action enabled; the server still enforces them
    userStore.ensureLimits().catch(() => {});
  }, []);
  // until the limits are known (or if they can't be loaded) don't claim the
  // limit is reached: the server still enforces it on invite
  const cannAddUser =
    isAdmin &&
    (!userStore.limitsLoaded ||
      limtis.teamMember == null ||
      limtis.teamMember === -1 ||
      limtis.teamMember > 0);

  const blocked = !isAdmin
    ? PERMISSION_WARNING(t)
    : !cannAddUser
      ? LIMIT_WARNING(t)
      : undefined;
  const button = (
    <Button variant="primary" disabled={!!blocked} onClick={onClick}>
      <Plus size={14} />
      {t('Invite')}
    </Button>
  );
  return blocked ? (
    <Tooltip title={blocked}>
      <span>{button}</span>
    </Tooltip>
  ) : (
    button
  );
}

export default observer(AddUserButton);
