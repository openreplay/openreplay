import React, { useEffect, useRef, useState } from 'react';
import { connectPlayer, jump } from 'Player';
import Log from 'Types/session/log';
import BottomBlock from '../BottomBlock';
import { LEVEL } from 'Types/session/log';
import { Tabs, Input, Icon, NoContent } from 'UI';
import cn from 'classnames';
import ConsoleRow from '../ConsoleRow';
import { getRE } from 'App/utils';
import { List, CellMeasurer, CellMeasurerCache, AutoSizer } from 'react-virtualized';
import { useObserver } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import ErrorDetailsModal from 'App/components/Dashboard/components/Errors/ErrorDetailsModal';
import { useModal } from 'App/components/Modal';

const ALL = 'ALL';
const INFO = 'INFO';
const WARNINGS = 'WARNINGS';
const ERRORS = 'ERRORS';

const LEVEL_TAB = {
  [LEVEL.INFO]: INFO,
  [LEVEL.LOG]: INFO,
  [LEVEL.WARNING]: WARNINGS,
  [LEVEL.ERROR]: ERRORS,
  [LEVEL.EXCEPTION]: ERRORS,
};

const TABS = [ALL, ERRORS, WARNINGS, INFO].map((tab) => ({ text: tab, key: tab }));

function renderWithNL(s = '') {
  if (typeof s !== 'string') return '';
  return s.split('\n').map((line, i) => <div className={cn({ 'ml-20': i !== 0 })}>{line}</div>);
}

const getIconProps = (level: any) => {
  switch (level) {
    case LEVEL.INFO:
    case LEVEL.LOG:
      return {
        name: 'console/info',
        color: 'blue2',
      };
    case LEVEL.WARN:
    case LEVEL.WARNING:
      return {
        name: 'console/warning',
        color: 'red2',
      };
    case LEVEL.ERROR:
      return {
        name: 'console/error',
        color: 'red',
      };
  }
  return null;
};

const INDEX_KEY = 'console';
let timeOut: any = null;
const TIMEOUT_DURATION = 5000;
interface Props {
  logs: any;
  exceptions: any;
  time: any;
}
function ConsolePanel(props: Props) {
  const { logs, time } = props;
  const additionalHeight = 0;
  // const [activeTab, setActiveTab] = useState(ALL);
  // const [filter, setFilter] = useState('');
  const {
    sessionStore: { devTools },
  } = useStore();
  const [filteredList, setFilteredList] = useState([]);
  const filter = useObserver(() => devTools[INDEX_KEY].filter);
  const activeTab = useObserver(() => devTools[INDEX_KEY].activeTab);
  const activeIndex = useObserver(() => devTools[INDEX_KEY].index);
  const [pauseSync, setPauseSync] = useState(activeIndex > 0);
  const synRef: any = useRef({});
  const { showModal, component: modalActive } = useModal();

  const onTabClick = (activeTab: any) => devTools.update(INDEX_KEY, { activeTab });
  const onFilterChange = ({ target: { value } }: any) => {
    devTools.update(INDEX_KEY, { filter: value });
  };

  synRef.current = {
    pauseSync,
    activeIndex,
  };

  const removePause = () => {
    if (!!modalActive) return;
    clearTimeout(timeOut);
    timeOut = setTimeout(() => {
      devTools.update(INDEX_KEY, { index: getCurrentIndex() });
      setPauseSync(false);
    }, TIMEOUT_DURATION);
  };

  const onMouseLeave = () => {
    removePause();
  };

  useEffect(() => {
    if (pauseSync) {
      removePause();
    }

    return () => {
      clearTimeout(timeOut);
      if (!synRef.current.pauseSync) {
        devTools.update(INDEX_KEY, { index: 0 });
      }
    };
  }, []);

  const getCurrentIndex = () => {
    return filteredList.filter((item: any) => item.time <= time).length - 1;
  };

  useEffect(() => {
    const currentIndex = getCurrentIndex();
    if (currentIndex !== activeIndex && !pauseSync) {
      devTools.update(INDEX_KEY, { index: currentIndex });
    }
  }, [time]);

  const cache = new CellMeasurerCache({
    fixedWidth: true,
    keyMapper: (index: number) => filteredList[index],
  });
  const _list = React.useRef();

  const showDetails = (log: any) => {
    clearTimeout(timeOut);
    showModal(<ErrorDetailsModal errorId={log.errorId} />, { right: true, onClose: removePause });
    devTools.update(INDEX_KEY, { index: filteredList.indexOf(log) });
    setPauseSync(true);
  };

  const _rowRenderer = ({ index, key, parent, style }: any) => {
    const item = filteredList[index];

    return (
      // @ts-ignore
      <CellMeasurer cache={cache} columnIndex={0} key={key} rowIndex={index} parent={parent}>
        {({ measure }: any) => (
          <ConsoleRow
            style={style}
            log={item}
            jump={jump}
            iconProps={getIconProps(item.level)}
            renderWithNL={renderWithNL}
            onClick={() => showDetails(item)}
            recalcHeight={() => {
              measure();
              (_list as any).current.recomputeRowHeights(index);
            }}
          />
        )}
      </CellMeasurer>
    );
  };

  React.useMemo(() => {
    const filterRE = getRE(filter, 'i');
    let list = logs;

    list = list.filter(
      ({ value, level }: any) =>
        (!!filter ? filterRE.test(value) : true) &&
        (activeTab === ALL || activeTab === LEVEL_TAB[level])
    );
    setFilteredList(list);
  }, [logs, filter, activeTab]);

  useEffect(() => {
    if (_list.current) {
      // @ts-ignore
      _list.current.scrollToRow(activeIndex);
    }
  }, [activeIndex]);

  return (
    <BottomBlock
      style={{ height: 300 + additionalHeight + 'px' }}
      onMouseEnter={() => setPauseSync(true)}
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
          iconPosition="left"
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

export default connectPlayer((state: any) => {
  const logs = state.logList;
  const exceptions = state.exceptionsList; // TODO merge
  const logExceptions = exceptions.map(({ time, errorId, name, projectId }: any) =>
    Log({
      level: LEVEL.ERROR,
      value: name,
      time,
      errorId,
    })
  );
  return {
    time: state.time,
    logs: logs.concat(logExceptions),
  };
})(ConsolePanel);
