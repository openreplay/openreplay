import React from 'react';
import cn from 'classnames';
import { connect } from 'react-redux';
import Player from './PlayerInst';
import SubHeader from 'Components/Session_/Subheader';

import styles from 'Components/Session_/playerBlock.module.css';

interface IProps {
  fullscreen: boolean;
  sessionId: string;
  disabled: boolean;
  activeTab: string;
  jiraConfig: Record<string, any>
  fullView?: boolean
  isClickmap?: boolean
}

function PlayerBlock(props: IProps) {
  const {
    fullscreen,
    sessionId,
    disabled,
    activeTab,
    jiraConfig,
    fullView = false,
    isClickmap
  } = props;

  const shouldShowSubHeader = !fullscreen && !fullView && !isClickmap
  return (
    <div
      className={cn(styles.playerBlock, 'flex flex-col', !isClickmap ? 'overflow-x-hidden' : 'overflow-visible')}
      style={{ zIndex: isClickmap ? 1 : undefined, minWidth: isClickmap ? '100%' : undefined }}
    >
      {shouldShowSubHeader ? (
        <SubHeader sessionId={sessionId} disabled={disabled} jiraConfig={jiraConfig} />
      ) : null}
      <Player
        activeTab={activeTab}
        fullView={fullView}
        isClickmap={isClickmap}
      />
    </div>
  );
}

export default connect((state: any) => ({
  fullscreen: state.getIn(['components', 'player', 'fullscreen']),
  sessionId: state.getIn(['sessions', 'current']).sessionId,
  disabled: state.getIn(['components', 'targetDefiner', 'inspectorMode']),
  jiraConfig: state.getIn(['issues', 'list'])[0],
}))(PlayerBlock)