import { observer } from 'mobx-react-lite';
import React from 'react';

import '../../ReplayScreen/replay-player.css';
import Player from './PlayerInst';

interface IProps {
  activeTab: string;
  fullView?: boolean;
  setActiveTab: (tab: string) => void;
}

function PlayerBlock({ activeTab, fullView = false, setActiveTab }: IProps) {
  return (
    <section className="m-player">
      <Player
        setActiveTab={setActiveTab}
        activeTab={activeTab}
        fullView={fullView}
      />
    </section>
  );
}

export default observer(PlayerBlock);
