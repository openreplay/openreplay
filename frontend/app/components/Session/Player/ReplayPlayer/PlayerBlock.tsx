import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React from 'react';

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
  const { activeTab, fullView = false, setActiveTab } = props;
  const { uiPlayerStore, sessionStore, integrationsStore } = useStore();
  const jiraConfig = integrationsStore.issues.list[0];
  const { sessionId } = sessionStore.current;
  const { fullscreen } = uiPlayerStore;
  const shouldShowSubHeader = !fullscreen && !fullView;
  return (
    <div
      className={cn(styles.playerBlock, 'flex flex-col', 'overflow-x-hidden')}
    >
      {shouldShowSubHeader ? (
        <SubHeader
          setActiveTab={setActiveTab}
          sessionId={sessionId}
          jiraConfig={jiraConfig}
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
