import React from 'react';
import cn from 'classnames';
import { connect } from 'react-redux';
import Player from './PlayerInst';
import SubHeader from 'Components/Session_/Subheader';
import AiSubheader from 'Components/Session/Player/ReplayPlayer/AiSubheader';
import styles from 'Components/Session_/playerBlock.module.css';

interface IProps {
  fullscreen: boolean;
  sessionId: string;
  disabled: boolean;
  activeTab: string;
  jiraConfig: Record<string, any>;
  fullView?: boolean;
  setActiveTab: (tab: string) => void;
}

function PlayerBlock(props: IProps) {
  const { fullscreen, sessionId, disabled, activeTab, jiraConfig, fullView = false, setActiveTab } = props;

  const originStr = window.env.ORIGIN || window.location.origin
  const isSaas = /api\.openreplay\.com/.test(originStr)

  const shouldShowSubHeader = !fullscreen && !fullView;
  return (
    <div className={cn(styles.playerBlock, 'flex flex-col', 'overflow-x-hidden')}>
      {shouldShowSubHeader ?
        isSaas
        ? <AiSubheader sessionId={sessionId} disabled={disabled} jiraConfig={jiraConfig} activeTab={activeTab} setActiveTab={setActiveTab} />
        : <SubHeader sessionId={sessionId} disabled={disabled} jiraConfig={jiraConfig} />
       : null}
      <Player activeTab={activeTab} fullView={fullView} />
    </div>
  );
}

export default connect((state: Record<string, any>) => ({
  fullscreen: state.getIn(['components', 'player', 'fullscreen']),
  sessionId: state.getIn(['sessions', 'current']).sessionId,
  disabled: state.getIn(['components', 'targetDefiner', 'inspectorMode']),
  jiraConfig: state.getIn(['issues', 'list'])[0],
}))(PlayerBlock);
