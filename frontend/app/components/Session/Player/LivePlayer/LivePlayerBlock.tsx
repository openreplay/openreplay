import React from 'react';

import 'Components/Session/ReplayScreen/replay-player.css';

import Player from './LivePlayerInst';
import SubHeader from './LivePlayerSubHeader';

interface IProps {
  fullView?: boolean;
  isMultiview?: boolean;
}

function LivePlayerBlock({ fullView = false, isMultiview }: IProps) {
  return (
    <section
      className="m-player"
      style={{ minWidth: isMultiview ? '100%' : undefined }}
    >
      {!fullView && !isMultiview ? <SubHeader /> : null}
      <Player fullView={fullView} isMultiview={isMultiview} />
    </section>
  );
}

export default LivePlayerBlock;
