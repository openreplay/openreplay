import React from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import ReloadButton from '../ReloadButton';

interface Props {
  onClick: () => void;
}

function LiveSessionReloadButton(props: Props) {
  const { sessionStore } = useStore();
  const { onClick } = props;
  const loading = sessionStore.loadingLiveSessions;
  return (
    <ReloadButton buttonSize="small" iconSize={14} loading={loading} onClick={onClick} className="cursor-pointer" />
  );
}

export default observer(LiveSessionReloadButton);
