import React, { useEffect, useRef, useState, useMemo } from 'react';
import { LogLevel, ILog } from 'Player';
import { Tabs, Icon, NoContent } from 'UI';
import { Input } from 'antd';
import { SearchOutlined, InfoCircleOutlined } from '@ant-design/icons';
import cn from 'classnames';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import ErrorDetailsModal from 'App/components/Dashboard/components/Errors/ErrorDetailsModal';
import { useModal } from 'App/components/Modal';
import { VList, VListHandle } from 'virtua';
import TabSelector from '../TabSelector';
import useAutoscroll, { getLastItemTime } from '../useAutoscroll';
import { useRegExListFilterMemo, useTabListFilterMemo } from '../useListFilter';
import ConsoleRow from '../ConsoleRow';
import BottomBlock from '../BottomBlock';
import { useTranslation } from 'react-i18next';

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

function ConsolePanel({ isLive }: { isLive?: boolean }) {
  const { t } = useTranslation();
  const {
    sessionStore: { devTools },
    uiPlayerStore,
  } = useStore();

  const zoomEnabled = uiPlayerStore.timelineZoom.enabled;
  const zoomStartTs = uiPlayerStore.timelineZoom.startTs;
  const zoomEndTs = uiPlayerStore.timelineZoom.endTs;

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
  const onFilterChange = ({ target: { value } }: any) =>
    devTools.update(INDEX_KEY, { filter: value });

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
      width: 1200,
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
      {/* @ts-ignore */}
      <BottomBlock.Header>
        <div className="flex items-center">
          <span className="font-semibold color-gray-medium mr-4">
            {t('Console')}
          </span>
          <Tabs
            tabs={TABS}
            active={activeTab}
            onClick={onTabClick}
            border={false}
          />
        </div>
        <div className="flex items-center gap-2">
          <TabSelector />
          <Input
            className="rounded-lg"
            placeholder={t('Filter by keyword')}
            name="filter"
            onChange={onFilterChange}
            value={filter}
            size="small"
            prefix={<SearchOutlined className="text-neutral-400" />}
          />
        </div>
        {/* @ts-ignore */}
      </BottomBlock.Header>
      {/* @ts-ignore */}
      <BottomBlock.Content className="overflow-y-auto">
        <NoContent
          title={
            <div className="capitalize flex items-center mt-16 gap-2">
              <InfoCircleOutlined size={18} />
              {t('No Data')}
            </div>
          }
          size="small"
          show={filteredList.length === 0}
        >
          <VList ref={_list} itemSize={25}>
            {filteredList.map((log) => (
              <ConsoleRow
                log={log}
                jump={jump}
                iconProps={getIconProps(log.level)}
                renderWithNL={renderWithNL}
                onClick={() => showDetails(log)}
                showSingleTab={showSingleTab}
                getTabNum={getTabNum}
              />
            ))}
          </VList>
        </NoContent>
        {/* @ts-ignore */}
      </BottomBlock.Content>
    </BottomBlock>
  );
}

export default observer(ConsolePanel);
