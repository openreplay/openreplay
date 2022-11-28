import React, { useEffect, useMemo, useRef, useState } from 'react';
import { hideHint } from 'Duck/components/player';
import { Tabs, Input, NoContent, Icon } from 'UI';
import { getRE } from 'App/utils';
import { List, CellMeasurer, CellMeasurerCache, AutoSizer } from 'react-virtualized';

import BottomBlock from '../BottomBlock';
import { connectPlayer, jump } from 'Player';
import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import { DATADOG, SENTRY, STACKDRIVER, typeList } from 'Types/session/stackEvent';
import { connect } from 'react-redux';
import StackEventRow from 'Shared/DevTools/StackEventRow';
import StackEventModal from '../StackEventModal';

let timeOut: any = null;
const TIMEOUT_DURATION = 5000;
const INDEX_KEY = 'stackEvent';
const ALL = 'ALL';
const TABS = [ALL, ...typeList].map((tab) => ({ text: tab, key: tab }));

interface Props {
  list: any;
  hideHint: any;
  time: any;
}
function StackEventPanel(props: Props) {
  const { list, time } = props;
  const additionalHeight = 0;
  const {
    sessionStore: { devTools },
  } = useStore();
  const { showModal, component: modalActive } = useModal();
  const [filteredList, setFilteredList] = useState([]);
  const filter = useObserver(() => devTools[INDEX_KEY].filter);
  const activeTab = useObserver(() => devTools[INDEX_KEY].activeTab);
  const activeIndex = useObserver(() => devTools[INDEX_KEY].index);
  const [pauseSync, setPauseSync] = useState(activeIndex > 0);
  const synRef: any = useRef({});
  synRef.current = {
    pauseSync,
    activeIndex,
  };
  const _list = React.useRef();

  const onTabClick = (activeTab: any) => devTools.update(INDEX_KEY, { activeTab });
  const onFilterChange = ({ target: { value } }: any) => {
    devTools.update(INDEX_KEY, { filter: value });
  };

  const getCurrentIndex = () => {
    return filteredList.filter((item: any) => item.time <= time).length - 1;
  };

  const removePause = () => {
    if (!!modalActive) return;
    clearTimeout(timeOut);
    timeOut = setTimeout(() => {
      devTools.update(INDEX_KEY, { index: getCurrentIndex() });
      setPauseSync(false);
    }, TIMEOUT_DURATION);
  };

  useEffect(() => {
    const currentIndex = getCurrentIndex();
    if (currentIndex !== activeIndex && !pauseSync) {
      devTools.update(INDEX_KEY, { index: currentIndex });
    }
  }, [time]);

  const onMouseLeave = () => {
    removePause();
  };

  React.useMemo(() => {
    const filterRE = getRE(filter, 'i');
    let list = props.list;

    list = list.filter(
      ({ name, source }: any) =>
        (!!filter ? filterRE.test(name) : true) && (activeTab === ALL || activeTab === source)
    );

    setFilteredList(list);
  }, [filter, activeTab]);

  const tabs = useMemo(() => {
    return TABS.filter(({ key }) => key === ALL || list.some(({ source }: any) => key === source));
  }, []);

  const cache = new CellMeasurerCache({
    fixedWidth: true,
    keyMapper: (index: number) => filteredList[index],
  });

  const showDetails = (item: any) => {
    clearTimeout(timeOut);
    showModal(<StackEventModal event={item} />, { right: true, onClose: removePause });
    devTools.update(INDEX_KEY, { index: filteredList.indexOf(item) });
    setPauseSync(true);
  };

  const _rowRenderer = ({ index, key, parent, style }: any) => {
    const item = filteredList[index];

    return (
      // @ts-ignore
      <CellMeasurer cache={cache} columnIndex={0} key={key} rowIndex={index} parent={parent}>
        {() => (
          <StackEventRow
            isActive={activeIndex === index}
            style={style}
            key={item.key}
            event={item}
            onJump={() => {
              setPauseSync(true);
              devTools.update(INDEX_KEY, { index: filteredList.indexOf(item) });
              jump(item.time);
            }}
            onClick={() => showDetails(item)}
          />
        )}
      </CellMeasurer>
    );
  };

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
      <BottomBlock.Header>
        <div className="flex items-center">
          <span className="font-semibold color-gray-medium mr-4">Stack Events</span>
          <Tabs tabs={tabs} active={activeTab} onClick={onTabClick} border={false} />
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
      </BottomBlock.Header>
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
          <AutoSizer>
            {({ height, width }: any) => (
              <List
                ref={_list}
                deferredMeasurementCache={cache}
                overscanRowCount={5}
                rowCount={Math.ceil(filteredList.length || 1)}
                rowHeight={cache.rowHeight}
                rowRenderer={_rowRenderer}
                width={width}
                height={height}
                scrollToAlignment="center"
              />
            )}
          </AutoSizer>
        </NoContent>
      </BottomBlock.Content>
    </BottomBlock>
  );
}

export default connect(
  (state: any) => ({
    hintIsHidden:
      state.getIn(['components', 'player', 'hiddenHints', 'stack']) ||
      !state.getIn(['site', 'list']).some((s: any) => s.stackIntegrations),
  }),
  { hideHint }
)(
  connectPlayer((state: any) => ({
    list: state.stackList,
    time: state.time,
  }))(StackEventPanel)
);
