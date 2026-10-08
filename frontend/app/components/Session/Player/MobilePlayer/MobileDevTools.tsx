import { observer } from 'mobx-react-lite';
import React, { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { MobilePlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import {
  CONSOLE,
  EXCEPTIONS,
  GRAPHQL,
  NETWORK,
  OVERVIEW,
  PERFORMANCE,
  STACKEVENTS,
} from 'App/mstore/uiPlayerStore';
import { DevToolsFrame } from 'Components/Session/ReplayScreen/DevToolsFrame';
import SummaryButton from 'Components/Session_/Player/Controls/SummaryButton';

interface Props {
  disabled: boolean;
  height: number;
  onHeight: (h: number) => void;
  children: ReactNode;
}

/** The devtools strip for native app replays. */
function MobileDevTools({ disabled, height, onHeight, children }: Props) {
  const { t } = useTranslation();
  const { player, store } = React.useContext(MobilePlayerContext);
  const { uiPlayerStore, aiSummaryStore } = useStore();
  const { bottomBlock, toggleBottomBlock } = uiPlayerStore;
  const { exceptionsList, logMarkedCountNow, fetchMarkedCountNow } =
    store.get();
  const hasExceptions = exceptionsList.length > 0;

  const tabs = [
    {
      key: OVERVIEW,
      label: 'X-Ray',
      hint: t('Get a quick overview on the issues in this session.'),
      always: true,
    },
    {
      key: CONSOLE,
      label: t('Logs'),
      hint: t('What the app logged'),
      errors: logMarkedCountNow > 0 || hasExceptions,
    },
    {
      key: NETWORK,
      label: t('Network'),
      hint: t('Every request the app made'),
      errors: fetchMarkedCountNow > 0,
    },
    ...(hasExceptions
      ? [{ key: EXCEPTIONS, label: t('Exceptions'), errors: true }]
      : []),
    {
      key: STACKEVENTS,
      label: t('Events'),
      hint: t('Custom events and integration events'),
    },
    { key: GRAPHQL, label: 'GraphQL' },
    {
      key: PERFORMANCE,
      label: t('Performance'),
      hint: t('FPS, CPU and memory over time'),
    },
  ];

  const showSummary = () => {
    player.pause();
    if (bottomBlock !== OVERVIEW) toggleBottomBlock(OVERVIEW);
    aiSummaryStore.setToggleSummary(!aiSummaryStore.toggleSummary);
  };

  return (
    <DevToolsFrame
      tabs={tabs}
      open={bottomBlock || 0}
      onToggle={toggleBottomBlock}
      height={height}
      onHeight={onHeight}
      disabled={disabled}
      extras={<SummaryButton onClick={showSummary} />}
    >
      {children}
    </DevToolsFrame>
  );
}

export default observer(MobileDevTools);
