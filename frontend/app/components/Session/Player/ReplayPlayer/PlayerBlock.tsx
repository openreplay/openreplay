import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import SubHeader from 'Components/Session_/Subheader';

import RequestSheetHost from 'Shared/FetchDetailsModal/RequestSheetHost';

import '../../ReplayScreen/replay-player.css';
import Player from './PlayerInst';

interface IProps {
  activeTab: string;
  fullView?: boolean;
  /** kept for hosts that pass it; the address bar has no actions any more */
  minimalSubHeader?: boolean;
  setActiveTab: (tab: string) => void;
}

function PlayerBlock({ activeTab, fullView = false, setActiveTab }: IProps) {
  const { uiPlayerStore } = useStore();
  const { fullscreen } = uiPlayerStore;
  return (
    <section className="m-player">
      {!fullscreen && !fullView ? <SubHeader /> : null}
      <Player
        setActiveTab={setActiveTab}
        activeTab={activeTab}
        fullView={fullView}
      />
      <RequestSheetHost />
    </section>
  );
}

export default observer(PlayerBlock);
