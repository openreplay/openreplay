import { Button } from '@/ui/actions/button';
import { EntityDrawer } from '@/ui/overlays/EntityDrawer';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { MODULES } from 'Components/Client/Modules/extra';

import { RecordingsSection } from '../CoBrowsePage';

/** SAAS:
function TrainingVideosBtn() {
  return null
}
 */
function TrainingVideosBtn() {
  const { t } = useTranslation();
  const { userStore } = useStore();
  const modules = userStore.account.settings?.modules ?? [];
  const { isEnterprise } = userStore;
  const [open, setOpen] = React.useState(false);

  if (!isEnterprise || modules.includes(MODULES.OFFLINE_RECORDINGS)) {
    return null;
  }
  return (
    <>
      <Button onClick={() => setOpen(true)}>{t('Training Videos')}</Button>
      <EntityDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={t('Training videos')}
        size="wide"
      >
        {open && <RecordingsSection />}
      </EntityDrawer>
    </>
  );
}

export default observer(TrainingVideosBtn);
