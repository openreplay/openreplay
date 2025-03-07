import React from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import ReloadButton from '../ReloadButton';
import { useTranslation } from 'react-i18next';

interface Props {
  onClick: () => void;
}

function LiveSessionReloadButton(props: Props) {
  const { t } = useTranslation();
  const { sessionStore } = useStore();
  const { onClick } = props;
  const loading = sessionStore.loadingLiveSessions;
  return (
    <ReloadButton label={t('Refresh')} buttonSize={'small'} iconSize={14} loading={loading} onClick={onClick} className="cursor-pointer" />
  );
}

export default observer(LiveSessionReloadButton);
