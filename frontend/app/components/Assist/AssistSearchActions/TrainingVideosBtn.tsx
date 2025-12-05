import React from 'react';
import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import { MODULES } from 'Components/Client/Modules/extra';
import Recordings from '../RecordingsList/Recordings';

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

  const { showModal } = useModal();

  const showRecords = () => {
    showModal(<Recordings />, { right: true, width: 960 });
  };
  return (
    isEnterprise && !modules.includes(MODULES.OFFLINE_RECORDINGS)
       ? <Button size={'small'} onClick={showRecords}>{t('Training Videos')}</Button> : null
  )
}

export default observer(TrainingVideosBtn);
