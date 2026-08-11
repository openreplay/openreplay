import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import SubHeader from 'Components/Session_/Subheader';
import styles from 'Components/Session_/playerBlock.module.css';

import Player from './PlayerInst';

interface IProps {
  // read from the store below, not from props — optional so callers needn't pass them
  sessionId?: string;
  activeTab: string;
  jiraConfig?: Record<string, any>;
  fullView?: boolean;
  /** hosts that carry their own header (e.g. the issue player) keep the SubHeader
      tabs but drop its duplicated action cluster (share / menu / prev-next) */
  minimalSubHeader?: boolean;
  setActiveTab: (tab: string) => void;
}

function PlayerBlock(props: IProps) {
  const {
    activeTab,
    fullView = false,
    minimalSubHeader = false,
    setActiveTab,
  } = props;
  const { uiPlayerStore, sessionStore, integrationsStore } = useStore();
  const jiraConfig = integrationsStore.issues.list[0];
  const { sessionId } = sessionStore.current;
  const { fullscreen } = uiPlayerStore;
  const shouldShowSubHeader = !fullscreen && !fullView;
  return (
    <div className={cn(styles.playerBlock, 'flex flex-col', 'overflow-hidden')}>
      {shouldShowSubHeader ? (
        <SubHeader
          setActiveTab={setActiveTab}
          sessionId={sessionId}
          jiraConfig={jiraConfig}
          hideActions={minimalSubHeader}
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
