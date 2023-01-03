import React, { useEffect, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Tooltip, Tabs, Input, NoContent, Icon, Toggler } from 'UI';
import { List, CellMeasurer, AutoSizer } from 'react-virtualized';
import { PlayerContext } from 'App/components/Session/playerContext';
import BottomBlock from '../BottomBlock';
import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import { typeList } from 'Types/session/stackEvent';
import StackEventRow from 'Shared/DevTools/StackEventRow';

import StackEventModal from '../StackEventModal';
import useAutoscroll, { getLastItemTime } from '../useAutoscroll';
import { useRegExListFilterMemo, useTabListFilterMemo } from '../useListFilter'
import useCellMeasurerCache from 'App/hooks/useCellMeasurerCache'

const INDEX_KEY = 'stackEvent';
const ALL = 'ALL';
const TAB_KEYS = [ ALL, ...typeList] as const
const TABS = TAB_KEYS.map((tab) => ({ text: tab, key: tab }))

function StackEventPanel() {
  const { player, store } = React.useContext(PlayerContext)
  const jump = (t: number) => player.jump(t)
  const { stackList: list, stackListNow: listNow } = store.get()

  const {
    sessionStore: { devTools },
  } = useStore();
  const { showModal } = useModal();
  const [isDetailsModalActive, setIsDetailsModalActive] = useState(false) // TODO:embed that into useModal
  const filter = devTools[INDEX_KEY].filter
  const activeTab = devTools[INDEX_KEY].activeTab
  const activeIndex = devTools[INDEX_KEY].index

  let filteredList = useRegExListFilterMemo(list, it => it.name, filter)  
  filteredList = useTabListFilterMemo(filteredList, it => it.source, ALL, activeTab)

  const onTabClick = (activeTab: typeof TAB_KEYS[number]) => devTools.update(INDEX_KEY, { activeTab })
  const onFilterChange = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => devTools.update(INDEX_KEY, { filter: value })
  const tabs = useMemo(() => 
    TABS.filter(({ key }) => key === ALL || list.some(({ source }) => key === source)), 
    [ list.length ],
  )

  const [
    timeoutStartAutoscroll,
    stopAutoscroll,
  ] = useAutoscroll(
    filteredList,
    getLastItemTime(listNow),
    activeIndex,
    index => devTools.update(INDEX_KEY, { index })
  )
  const onMouseEnter = stopAutoscroll
  const onMouseLeave = () => {
    if (isDetailsModalActive) { return }
    timeoutStartAutoscroll()
  }

  const cache = useCellMeasurerCache(filteredList)

  const showDetails = (item: any) => {
    setIsDetailsModalActive(true)
    showModal(
      <StackEventModal event={item} />, 
      { 
        right: true,
        onClose: () => {
          setIsDetailsModalActive(false)
          timeoutStartAutoscroll()
        } 
      }
    )
    devTools.update(INDEX_KEY, { index: filteredList.indexOf(item) })
    stopAutoscroll()
  }

  const _list = React.useRef()
  useEffect(() => {
    if (_list.current) {
      // @ts-ignore
      _list.current.scrollToRow(activeIndex)
    }
  }, [ activeIndex ])


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
              stopAutoscroll()
              devTools.update(INDEX_KEY, { index: filteredList.indexOf(item) });
              jump(item.time);
            }}
            onClick={() => showDetails(item)}
          />
        )}
      </CellMeasurer>
    );
  }

  return (
    <BottomBlock
      style={{ height: '300px' }}
      onMouseEnter={onMouseEnter}
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

export default observer(StackEventPanel)
