import React from 'react';
import cn from 'classnames';
import Player from './LivePlayerInst';
import SubHeader from './LivePlayerSubHeader';

import styles from 'Components/Session_/playerBlock.module.css';

interface IProps {
  fullView?: boolean;
  isMultiview?: boolean;
}

function LivePlayerBlock(props: IProps) {
  const { fullView = false, isMultiview } = props;

  const shouldShowSubHeader = !fullView && !isMultiview

  return (
    <div className={cn(styles.playerBlock, 'flex flex-col', 'overflow-x-hidden')} style={{ zIndex: undefined, minWidth: isMultiview ? '100%' : undefined }}>
      {shouldShowSubHeader ? (
        <SubHeader live />
      ) : null}
      <Player
        fullView={fullView}
        isMultiview={isMultiview}
      />
    </div>
  );
}

export default LivePlayerBlock