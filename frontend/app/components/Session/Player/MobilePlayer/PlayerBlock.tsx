import React from 'react';
import cn from 'classnames';
import { connect } from 'react-redux';
import Player from './PlayerInst';
import MobilePlayerSubheader from './MobilePlayerSubheader';

import styles from 'Components/Session_/playerBlock.module.css';

interface IProps {
  fullscreen: boolean;
  sessionId: string;
  activeTab: string;
  jiraConfig: Record<string, any>
  fullView?: boolean
  setActiveTab: (tab: string) => void
}

function PlayerBlock(props: IProps) {
  const {
    fullscreen,
    sessionId,
    activeTab,
    jiraConfig,
    fullView = false,
    setActiveTab,
  } = props;

  const shouldShowSubHeader = !fullscreen && !fullView
  return (
    <div
      className={cn(styles.playerBlock, 'flex flex-col', 'overflow-x-hidden')}
    >
      {shouldShowSubHeader ? (
        <MobilePlayerSubheader sessionId={sessionId} jiraConfig={jiraConfig} />
      ) : null}
      <Player
        setActiveTab={setActiveTab}
        activeTab={activeTab}
        fullView={fullView}
      />
    </div>
  );
}

export default connect((state: any) => ({
  fullscreen: state.getIn(['player', 'fullscreen']),
  sessionId: state.getIn(['sessions', 'current']).sessionId,
  jiraConfig: state.getIn(['issues', 'list'])[0],
}))(PlayerBlock)