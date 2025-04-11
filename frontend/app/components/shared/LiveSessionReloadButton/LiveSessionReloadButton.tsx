import React from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import ReloadButton from '../ReloadButton';
import { useTranslation } from 'react-i18next';

function LiveSessionReloadButton() {
  const { t } = useTranslation();
  const { searchStoreLive } = useStore();
  const onClick = searchStoreLive.fetchSessions
  const loading = searchStoreLive.loading;
  return (
    <ReloadButton label={t('Refresh')} buttonSize={'small'} iconSize={14} loading={loading} onClick={onClick} className="cursor-pointer" />
  );
}

export default observer(LiveSessionReloadButton);
