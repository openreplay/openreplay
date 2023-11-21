import React, { useEffect, useRef, useState } from 'react';
import { LogLevel, ILog } from 'Player';
import BottomBlock from '../BottomBlock';
import { Tabs, Input, Icon, NoContent } from 'UI';
import cn from 'classnames';
import ConsoleRow from '../ConsoleRow';
import { IOSPlayerContext, MobilePlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { List, CellMeasurer, AutoSizer } from 'react-virtualized';
import { useStore } from 'App/mstore';
import ErrorDetailsModal from 'App/components/Dashboard/components/Errors/ErrorDetailsModal';
import { useModal } from 'App/components/Modal';
import useAutoscroll, { getLastItemTime } from '../useAutoscroll';
import { useRegExListFilterMemo, useTabListFilterMemo } from '../useListFilter';
import useCellMeasurerCache from 'App/hooks/useCellMeasurerCache';

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

const TABS = [ALL, ERRORS, WARNINGS, INFO].map((tab) => ({ text: tab, key: tab }));

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

  const filter = devTools[INDEX_KEY].filter;
  const activeTab = devTools[INDEX_KEY].activeTab;
  // Why do we need to keep index in the store? if we could get read of it it would simplify the code
  const activeIndex = devTools[INDEX_KEY].index;
  const [isDetailsModalActive, setIsDetailsModalActive] = useState(false);
  const { showModal } = useModal();

  const { player, store } = React.useContext<IOSPlayerContext>(MobilePlayerContext);
  const jump = (t: number) => player.jump(t);

  const {
    logList,
    logListNow,
    exceptionsListNow,
  } = store.get();

  const list = logList as ILog[];
  let filteredList = useRegExListFilterMemo(list, (l) => l.value, filter);
  filteredList = useTabListFilterMemo(filteredList, (l) => LEVEL_TAB[l.level], ALL, activeTab);

  React.useEffect(() => {
    setTimeout(() => {
      cache.clearAll();
      _list.current?.recomputeRowHeights();
    }, 0);
  }, [activeTab, filter]);
  const onTabClick = (activeTab: any) => devTools.update(INDEX_KEY, { activeTab });
  const onFilterChange = ({ target: { value } }: any) =>
    devTools.update(INDEX_KEY, { filter: value });

  // AutoScroll
  const [timeoutStartAutoscroll, stopAutoscroll] = useAutoscroll(
    filteredList,
    getLastItemTime(logListNow, exceptionsListNow),
    activeIndex,
    (index) => devTools.update(INDEX_KEY, { index })
  );
  const onMouseEnter = stopAutoscroll;
  const onMouseLeave = () => {
    if (isDetailsModalActive) {
      return;
    }
    timeoutStartAutoscroll();
  };

  const _list = useRef<List>(null); // TODO: fix react-virtualized types & encapsulate scrollToRow logic
  useEffect(() => {
    if (_list.current) {
      // @ts-ignore
      _list.current.scrollToRow(activeIndex);
    }
  }, [activeIndex]);

  const cache = useCellMeasurerCache();

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
  const _rowRenderer = ({ index, key, parent, style }: any) => {
    const item = filteredList[index];

    return (
      // @ts-ignore
      <CellMeasurer cache={cache} columnIndex={0} key={key} rowIndex={index} parent={parent}>
        {({ measure, registerChild }) => (
          <div ref={registerChild} style={style}>
            <ConsoleRow
              log={item}
              jump={jump}
              iconProps={getIconProps(item.level)}
              renderWithNL={renderWithNL}
              onClick={() => showDetails(item)}
              recalcHeight={measure}
            />
          </div>
        )}
      </CellMeasurer>
    );
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
          <span className="font-semibold color-gray-medium mr-4">Console</span>
          <Tabs tabs={TABS} active={activeTab} onClick={onTabClick} border={false} />
        </div>
        <Input
          className="input-small h-8"
          placeholder="Filter by keyword"
          icon="search"
          name="filter"
          height={28}
          onChange={onFilterChange}
          value={filter}
        />
        {/* @ts-ignore */}
      </BottomBlock.Header>
      {/* @ts-ignore */}
      <BottomBlock.Content className="overflow-y-auto">
        <NoContent
          title={
            <div className="capitalize flex items-center mt-16">
              <Icon name="info-circle" className="mr-2" size="18" />
              No Data
            </div>
          }
          size="small"
          show={filteredList.length === 0}
        >
          {/* @ts-ignore */}
          <AutoSizer>
            {({ height, width }: any) => (
              // @ts-ignore
              <List
                ref={_list}
                deferredMeasurementCache={cache}
                overscanRowCount={5}
                estimatedRowSize={36}
                rowCount={Math.ceil(filteredList.length || 1)}
                rowHeight={cache.rowHeight}
                rowRenderer={_rowRenderer}
                width={width}
                height={height}
                // scrollToIndex={activeIndex}
                scrollToAlignment="center"
              />
            )}
          </AutoSizer>
        </NoContent>
        {/* @ts-ignore */}
      </BottomBlock.Content>
    </BottomBlock>
  );
}

export default observer(MobileConsolePanel);
