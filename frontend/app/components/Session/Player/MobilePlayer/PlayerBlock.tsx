import React from 'react';
import cn from 'classnames';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import styles from 'Components/Session_/playerBlock.module.css';
import MobilePlayerSubheader from './MobilePlayerSubheader';
import Player from './PlayerInst';

interface IProps {
  fullscreen: boolean;
  sessionId: string;
  activeTab: string;
  jiraConfig: Record<string, any>;
  fullView?: boolean;
  setActiveTab: (tab: string) => void;
}

function PlayerBlock(props: IProps) {
  const { activeTab, fullView = false, setActiveTab } = props;
  const { uiPlayerStore, integrationsStore, sessionStore } = useStore();
  const { sessionId } = sessionStore.current;
  const jiraConfig = integrationsStore.issues.list[0];
  const { fullscreen } = uiPlayerStore;
  const shouldShowSubHeader = !fullscreen && !fullView;
  return (
    <div
      className={cn(styles.playerBlock, 'flex flex-col', 'overflow-x-hidden')}
    >
      {shouldShowSubHeader ? (
        <MobilePlayerSubheader
          sessionId={sessionId}
          jiraConfig={jiraConfig}
          setActiveTab={setActiveTab}
        />
      ) : null}
      <Player
        setActiveTab={setActiveTab}
        activeTab={activeTab}
        fullView={fullView}
      />
    </div>
  );
}

export default observer(PlayerBlock);
