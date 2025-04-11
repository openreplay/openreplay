import React, { useEffect, useRef, useState } from 'react';
import { LogLevel, ILog } from 'Player';
import { Tabs, Input, NoContent } from 'UI';
import cn from 'classnames';
import {
  IOSPlayerContext,
  MobilePlayerContext,
} from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { VList, VListHandle } from 'virtua';
import { useStore } from 'App/mstore';
import ErrorDetailsModal from 'App/components/Dashboard/components/Errors/ErrorDetailsModal';
import { useModal } from 'App/components/Modal';
import { InfoCircleOutlined, SearchOutlined } from '@ant-design/icons';
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
} as const;

const TABS = [ALL, ERRORS, WARNINGS, INFO].map((tab) => ({
  text: tab,
  key: tab,
}));

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
  } = useStore();

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
        <Input
          className="rounded-lg"
          placeholder="Filter by keyword"
          name="filter"
          onChange={onFilterChange}
          value={filter}
          size="small"
          prefix={<SearchOutlined className="text-neutral-400" />}
        />
      </BottomBlock.Header>
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
          <VList ref={_list} itemSize={25} count={filteredList.length || 1}>
            {filteredList.map((log, index) => (
              <ConsoleRow
                key={log.time + index}
                log={log}
                jump={jump}
                iconProps={getIconProps(log.level)}
                renderWithNL={renderWithNL}
                onClick={() => showDetails(log)}
                showSingleTab
              />
            ))}
          </VList>
        </NoContent>
      </BottomBlock.Content>
    </BottomBlock>
  );
}

export default observer(MobileConsolePanel);
