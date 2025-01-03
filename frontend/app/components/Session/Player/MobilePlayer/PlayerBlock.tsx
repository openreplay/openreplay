import React from 'react';
import cn from 'classnames';
import Player from './PlayerInst';
import MobilePlayerSubheader from './MobilePlayerSubheader';
import { useStore } from 'App/mstore'
import { observer } from 'mobx-react-lite';
import styles from 'Components/Session_/playerBlock.module.css';

interface IProps {
  fullscreen?: boolean;
  activeTab: string;
  fullView?: boolean
  setActiveTab: (tab: string) => void
}

function PlayerBlock(props: IProps) {
  const {
    activeTab,
    fullView = false,
    setActiveTab,
  } = props;
  const { uiPlayerStore, integrationsStore, sessionStore } = useStore();
  const sessionId = sessionStore.current.sessionId;
  const jiraConfig = integrationsStore.issues.list[0];
  const fullscreen = uiPlayerStore.fullscreen;
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

export default observer(PlayerBlock)
