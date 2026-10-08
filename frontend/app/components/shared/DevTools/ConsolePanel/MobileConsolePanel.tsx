import { ILog, LogLevel } from 'Player';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VList, VListHandle } from 'virtua';

import ErrorDetailsModal from 'App/components/Dashboard/components/Errors/ErrorDetailsModal';
import { useModal } from 'App/components/Modal';
import {
  IOSPlayerContext,
  MobilePlayerContext,
} from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';

import BottomBlock from '../BottomBlock';
import ConsoleRow from '../ConsoleRow';
import { Keyword, NoData, PanelTabs } from '../PanelKit';
import useAutoscroll, { getLastItemTime } from '../useAutoscroll';
import { useRegExListFilterMemo, useTabListFilterMemo } from '../useListFilter';

const ALL = 'ALL';
const INFO = 'INFO';
const WARNINGS = 'WARNINGS';
const ERRORS = 'ERRORS';

const LEVEL_TAB = {
  [LogLevel.INFO]: INFO,
  [LogLevel.LOG]: INFO,
  [LogLevel.WARN]: WARNINGS,
  [LogLevel.ERROR]: ERRORS,
  [LogLevel.EXCEPTION]: ERRORS,
} as const;

function renderWithNL(s: string | null = '') {
  if (typeof s !== 'string') return '';
  return s.split('\n').map((line, i) => (
    <div key={i + line.slice(0, 6)} className={cn({ 'ml-20': i !== 0 })}>
      {line}
    </div>
  ));
}

const getIconProps = (level: any) => {
  switch (level) {
    case LogLevel.INFO:
    case LogLevel.LOG:
      return {
        name: 'console/info',
        color: 'blue2',
      };
    case LogLevel.WARN:
      return {
        name: 'console/warning',
        color: 'red2',
      };
    case LogLevel.ERROR:
      return {
        name: 'console/error',
        color: 'red',
      };
  }
  return null;
};

const INDEX_KEY = 'console';

function MobileConsolePanel() {
  const {
    sessionStore: { devTools },
    sessionStore,
  } = useStore();
  const { sessionId } = sessionStore.current;

  const { t } = useTranslation();
  const { filter } = devTools[INDEX_KEY];
  const { activeTab } = devTools[INDEX_KEY];
  // Why do we need to keep index in the store? if we could get read of it it would simplify the code
  const activeIndex = devTools[INDEX_KEY].index;
  const [isDetailsModalActive, setIsDetailsModalActive] = useState(false);
  const { showModal } = useModal();

  const { player, store } =
    React.useContext<IOSPlayerContext>(MobilePlayerContext);
  const jump = (t: number) => player.jump(t);

  const { logList, logListNow, exceptionsListNow } = store.get();

  const list = logList as ILog[];
  let filteredList = useRegExListFilterMemo(list, (l) => l.value, filter);
  filteredList = useTabListFilterMemo(
    filteredList,
    (l) => LEVEL_TAB[l.level],
    ALL,
    activeTab,
  );

  const onTabClick = (activeTab: any) =>
    devTools.update(INDEX_KEY, { activeTab });
  const onFilterChange = (value: string) =>
    devTools.update(INDEX_KEY, { filter: value });
  const counts = useMemo(() => {
    const c: Record<string, number> = { [ALL]: list.length };
    for (const l of list) {
      const k = LEVEL_TAB[l.level as keyof typeof LEVEL_TAB];
      if (k) c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [list]);

  // AutoScroll
  const [timeoutStartAutoscroll, stopAutoscroll] = useAutoscroll(
    filteredList,
    getLastItemTime(logListNow, exceptionsListNow),
    activeIndex,
    (index) => devTools.update(INDEX_KEY, { index }),
  );
  const onMouseEnter = stopAutoscroll;
  const onMouseLeave = () => {
    if (isDetailsModalActive) {
      return;
    }
    timeoutStartAutoscroll();
  };

  const _list = useRef<VListHandle>(null); // TODO: fix react-virtualized types & encapsulate scrollToRow logic
  useEffect(() => {
    if (_list.current) {
      // @ts-ignore
      _list.current.scrollToIndex(activeIndex);
    }
  }, [activeIndex]);

  const showDetails = (log: any) => {
    setIsDetailsModalActive(true);
    showModal(<ErrorDetailsModal errorId={log.errorId} />, {
      right: true,
      size: 'wide',
      onClose: () => {
        setIsDetailsModalActive(false);
        timeoutStartAutoscroll();
      },
    });
    devTools.update(INDEX_KEY, { index: filteredList.indexOf(log) });
    stopAutoscroll();
  };

  return (
    <BottomBlock
      style={{ height: '100%' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <BottomBlock.Header>
        <PanelTabs
          label={t('Log level')}
          active={activeTab}
          onSelect={onTabClick}
          items={[
            { key: ALL, label: t('All'), count: counts[ALL] },
            { key: ERRORS, label: t('Errors'), count: counts[ERRORS] ?? 0 },
            {
              key: WARNINGS,
              label: t('Warnings'),
              count: counts[WARNINGS] ?? 0,
            },
            { key: INFO, label: t('Info'), count: counts[INFO] ?? 0 },
          ]}
        />
        <div className="m-dt__bar-right">
          <Keyword value={filter} onChange={onFilterChange} />
        </div>
      </BottomBlock.Header>
      <BottomBlock.Content>
        {filteredList.length === 0 ? (
          <NoData
            hint={
              filter
                ? t('Nothing in the logs matches that.')
                : t('Nothing was logged at this level.')
            }
          />
        ) : (
          <VList ref={_list} itemSize={25} data={filteredList}>
            {(log, index) => (
              <ConsoleRow
                key={log.time + index}
                log={log}
                jump={jump}
                iconProps={getIconProps(log.level)}
                renderWithNL={renderWithNL}
                onClick={() => showDetails(log)}
                sessionId={sessionId}
                showSingleTab
              />
            )}
          </VList>
        )}
      </BottomBlock.Content>
    </BottomBlock>
  );
}

export default observer(MobileConsolePanel);
