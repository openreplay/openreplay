import { WebNetworkPanel } from '@/components/shared/DevTools/NetworkPanel';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  ILivePlayerContext,
  PlayerContext,
} from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import { CONSOLE, NETWORK } from 'App/mstore/uiPlayerStore';
import {
  debounceUpdate,
  getDefaultPanelHeight,
} from 'Components/Session/Player/ReplayPlayer/PlayerInst';
import { DevToolsFrame } from 'Components/Session/ReplayScreen/DevToolsFrame';
import stl from 'Components/Session_/Player/player.module.css';

import ConsolePanel from 'Shared/DevTools/ConsolePanel';

import LiveControls from './LiveControls';
import Overlay from './Overlay';

interface IProps {
  fullView: boolean;
  isMultiview?: boolean;
}

function Player({ fullView, isMultiview }: IProps) {
  const { t } = useTranslation();
  const { uiPlayerStore, sessionStore } = useStore();
  const isAssist = window.location.pathname.includes('/assist/');
  const closedLive =
    sessionStore.fetchFailed || (isAssist && !sessionStore.current.live);
  const defaultHeight = getDefaultPanelHeight();
  const [panelHeight, setPanelHeight] = React.useState(defaultHeight);
  // @ts-ignore TODO
  const playerContext = React.useContext<ILivePlayerContext>(PlayerContext);
  const screenWrapper = React.useRef<HTMLDivElement>(null);
  const { ready } = playerContext.store.get();
  const { bottomBlock } = uiPlayerStore;

  React.useEffect(() => {
    if (!closedLive || isMultiview) {
      const parentElement = screenWrapper.current; // TODO: good architecture
      if (parentElement) {
        playerContext.player.attach(parentElement);
        playerContext.player.play();
      }
    }
  }, []);

  React.useEffect(() => {
    playerContext.player.scale();
  }, [playerContext.player, ready]);

  if (!playerContext.player) return null;

  const tab =
    playerContext.store.get().tabStates?.[playerContext.store.get().currentTab];
  const consoleErrors =
    (tab?.logMarkedCountNow ?? 0) > 0 || (tab?.exceptionsList?.length ?? 0) > 0;

  return (
    <div className={cn(stl.playerBody, 'flex flex-1 flex-col relative')}>
      <div className="relative flex-1 overflow-hidden">
        <Overlay closedLive={closedLive} />
        <div
          className={cn(stl.screenWrapper, stl.checkers)}
          ref={screenWrapper}
        />
      </div>
      {!fullView && !isMultiview ? (
        <DevToolsFrame
          tabs={[
            { key: CONSOLE, label: t('Console'), errors: consoleErrors },
            { key: NETWORK, label: t('Network') },
          ]}
          open={
            bottomBlock === CONSOLE || bottomBlock === NETWORK ? bottomBlock : 0
          }
          onToggle={(k) => uiPlayerStore.toggleBottomBlock(k)}
          height={panelHeight}
          onHeight={(h) => {
            setPanelHeight(h);
            playerContext.player.scale();
            debounceUpdate(h);
          }}
        >
          {bottomBlock === CONSOLE ? <ConsolePanel isLive /> : null}
          {bottomBlock === NETWORK ? (
            <WebNetworkPanel isLive panelHeight={panelHeight} />
          ) : null}
        </DevToolsFrame>
      ) : null}
      {!fullView && !isMultiview ? (
        <LiveControls jump={playerContext.player.jump} />
      ) : null}
    </div>
  );
}

export default observer(Player);
