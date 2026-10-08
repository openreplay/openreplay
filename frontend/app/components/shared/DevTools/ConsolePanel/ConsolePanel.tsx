import { LogLevel } from 'Player';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VList, VListHandle } from 'virtua';

import ErrorDetailsModal from 'App/components/Dashboard/components/Errors/ErrorDetailsModal';
import { useModal } from 'App/components/Modal';
import { PlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';

import BottomBlock from '../BottomBlock';
import ConsoleRow from '../ConsoleRow';
import { Keyword, NoData, PanelMenu, PanelTabs } from '../PanelKit';
import TabSelector from '../TabSelector';
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
  [LogLevel.DEBUG]: INFO,
} as const;

export const TABS = [ALL, ERRORS, WARNINGS, INFO].map((tab) => ({
  text: tab,
  key: tab,
}));

const urlRegex = /(https?:\/\/[^\s)]+)/g;

export function renderWithNL(s: string | null = '') {
  if (typeof s !== 'string') return '';

  return s.split('\n').map((line, i) => {
    const parts = line.split(urlRegex);

    const formattedLine = parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={`link-${index}`}
            className="link text-main"
            href={part}
            target="_blank"
            rel="noopener noreferrer"
          >
            {part}
          </a>
        );
      }
      return part;
    });

    return (
      <div key={i + line.slice(0, 6)} className={cn({ 'ml-20': i !== 0 })}>
        {formattedLine}
      </div>
    );
  });
}

export const getIconProps = (level: LogLevel) => {
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
    default:
      return {
        name: 'console/info',
      };
  }
};

const INDEX_KEY = 'console';
const ERORRS_STORAGE_KEY = '_$_console_errors_only';

const getDefaultValue = () => {
  const stored = localStorage.getItem(ERORRS_STORAGE_KEY);
  return stored === 'true';
};

function ConsolePanel({ isLive }: { isLive?: boolean }) {
  const [showErrorsOnly, setShowErrorsOnly] = useState(getDefaultValue());
  const { t } = useTranslation();
  const {
    sessionStore: { devTools },
    uiPlayerStore,
    sessionStore,
  } = useStore();

  const zoomEnabled = uiPlayerStore.timelineZoom.enabled;
  const zoomStartTs = uiPlayerStore.timelineZoom.startTs;
  const zoomEndTs = uiPlayerStore.timelineZoom.endTs;
  const sessionId = sessionStore.current.sessionId;
  const _list = useRef<VListHandle>(null);
  const { filter } = devTools[INDEX_KEY];
  const { activeTab } = devTools[INDEX_KEY];
  // Why do we need to keep index in the store? if we could get read of it it would simplify the code
  const activeIndex = devTools[INDEX_KEY].index;
  const [isDetailsModalActive, setIsDetailsModalActive] = useState(false);
  const { showModal } = useModal();

  const { player, store } = React.useContext(PlayerContext);
  const jump = (t: number) => player.jump(t);

  const { currentTab, tabStates } = store.get();
  const tabsArr = Object.keys(tabStates);
  const tabValues = Object.values(tabStates);
  const { dataSource } = uiPlayerStore;
  const showSingleTab = dataSource === 'current';
  const {
    logList = [],
    exceptionsList = [],
    logListNow = [],
    exceptionsListNow = [],
  } = React.useMemo(() => {
    if (showSingleTab) {
      return tabStates[currentTab] ?? {};
    }
    const logList = tabValues.flatMap((tab) => tab.logList);
    const exceptionsList = tabValues.flatMap((tab) => tab.exceptionsList);
    const logListNow = isLive ? tabValues.flatMap((tab) => tab.logListNow) : [];
    const exceptionsListNow = isLive
      ? tabValues.flatMap((tab) => tab.exceptionsListNow)
      : [];
    return {
      logList,
      exceptionsList,
      logListNow,
      exceptionsListNow,
    };
  }, [currentTab, tabStates, dataSource, tabValues, isLive]);
  const getTabNum = (tab: string) => tabsArr.findIndex((t) => t === tab) + 1;

  const list = useMemo(() => {
    if (isLive) {
      return logListNow
        .concat(exceptionsListNow)
        .sort((a, b) => a.time - b.time);
    }
    const logs = logList.concat(exceptionsList).sort((a, b) => a.time - b.time);
    return zoomEnabled
      ? logs.filter((l) => l.time >= zoomStartTs && l.time <= zoomEndTs)
      : logs;
  }, [
    isLive,
    logList.length,
    exceptionsList.length,
    logListNow.length,
    exceptionsListNow.length,
    zoomEnabled,
    zoomStartTs,
    zoomEndTs,
  ]);
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

  const changeErrorsOnly = (value: boolean) => {
    setShowErrorsOnly(value);
    localStorage.setItem(ERORRS_STORAGE_KEY, value.toString());
  };

  const hasErrors = useMemo(
    () => list.some((log) => LEVEL_TAB[log.level] === ERRORS),
    [list],
  );

  useEffect(() => {
    const flipDefaulTab = showErrorsOnly && hasErrors;
    if (flipDefaulTab) {
      onTabClick(ERRORS);
    }
  }, [showErrorsOnly, hasErrors]);

  return (
    <BottomBlock
      style={{ height: '100%' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <BottomBlock.Header>
        <PanelTabs
          label={t('Console level')}
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
          <TabSelector />
          <Keyword value={filter} onChange={onFilterChange} />
          <PanelMenu
            toggles={[
              {
                key: 'errors',
                label: t('Open errors by default'),
                checked: showErrorsOnly,
                onChange: changeErrorsOnly,
              },
            ]}
          />
        </div>
      </BottomBlock.Header>
      <BottomBlock.Content>
        {filteredList.length === 0 ? (
          <NoData
            hint={
              filter
                ? t('Nothing in the console matches that.')
                : t('Nothing was logged at this level.')
            }
          />
        ) : (
          <VList ref={_list} itemSize={25} data={filteredList}>
            {(log, i) => (
              <ConsoleRow
                log={log}
                key={i}
                jump={jump}
                sessionId={sessionId}
                onClick={() => showDetails(log)}
                showSingleTab={showSingleTab || tabsArr.length < 2}
                getTabNum={getTabNum}
              />
            )}
          </VList>
        )}
      </BottomBlock.Content>
    </BottomBlock>
  );
}

export default observer(ConsolePanel);
