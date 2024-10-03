import React from 'react';
import ReloadButton from '../ReloadButton';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

interface Props {
  onClick: () => void;
}

function LiveSessionReloadButton(props: Props) {
  const { sessionStore } = useStore();
  const { onClick } = props;
  const loading = sessionStore.loadingLiveSessions;
  return (
    <ReloadButton loading={loading} onClick={onClick} className="cursor-pointer" />
  );
}

export default observer(LiveSessionReloadButton);
