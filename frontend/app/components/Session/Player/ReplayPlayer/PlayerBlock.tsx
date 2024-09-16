import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { connect } from 'react-redux';

import { useStore } from 'App/mstore';
import SubHeader from 'Components/Session_/Subheader';
import styles from 'Components/Session_/playerBlock.module.css';

import Player from './PlayerInst';

interface IProps {
  sessionId: string;
  activeTab: string;
  jiraConfig: Record<string, any>;
  fullView?: boolean;
  setActiveTab: (tab: string) => void;
}

function PlayerBlock(props: IProps) {
  const {
    sessionId,
    activeTab,
    fullView = false,
    setActiveTab,
    jiraConfig
  } = props;
  const { uiPlayerStore, } = useStore();
  const fullscreen = uiPlayerStore.fullscreen;
  const shouldShowSubHeader = !fullscreen && !fullView;
  return (
    <div
      className={cn(styles.playerBlock, 'flex flex-col', 'overflow-x-hidden')}
    >
      {shouldShowSubHeader ? (
        <SubHeader sessionId={sessionId} jiraConfig={jiraConfig} />
      ) : null}
      <Player
        setActiveTab={setActiveTab}
        activeTab={activeTab}
        fullView={fullView}
      />
    </div>
  );
}

export default connect((state: Record<string, any>) => ({
  sessionId: state.getIn(['sessions', 'current']).sessionId,
jiraConfig: state.getIn(['issues', 'list'])[0]
}))(observer(PlayerBlock));
