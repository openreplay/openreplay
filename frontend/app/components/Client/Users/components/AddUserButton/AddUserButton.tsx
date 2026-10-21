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
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    userStore.ensureLimits().catch((e) => {
      console.error('Could not load the users limit', e);
      setFailed(true);
    });
  }, []);
  // inviting waits until the limit is known: the UI is where it is enforced
  const known = userStore.limitsLoaded && typeof limtis.teamMember === 'number';
  const cannAddUser =
    isAdmin && known && (limtis.teamMember === -1 || limtis.teamMember > 0);

  const blocked = !isAdmin
    ? PERMISSION_WARNING(t)
    : failed || (userStore.limitsLoaded && !known)
      ? t('Could not check the users limit. Reload to try again.')
      : !known
        ? t('Checking the users limit…')
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
