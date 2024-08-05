import { observer } from 'mobx-react-lite';
import React from 'react';
import { AutoSizer, CellMeasurer, List } from 'react-virtualized';

import useCellMeasurerCache from 'App/hooks/useCellMeasurerCache';
import BottomBlock from 'Components/shared/DevTools/BottomBlock';
import {
  TABS,
  getIconProps,
  renderWithNL,
} from 'Components/shared/DevTools/ConsolePanel/ConsolePanel';
import ConsoleRow from 'Components/shared/DevTools/ConsoleRow';
import { Icon, NoContent, Tabs } from 'UI';

import spotPlayerStore from '../../spotPlayerStore';

function SpotConsole({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = React.useState(TABS[0]);
  const _list = React.useRef<List>(null);
  const cache = useCellMeasurerCache();
  const onTabClick = (tab: any) => {
    setActiveTab(tab);
  };
  const logs = spotPlayerStore.logs;
  const filteredList = React.useMemo(() => {
    return logs.filter((log) => {
      const tabType = activeTab.text.toLowerCase();
      if (tabType === 'all') return true;
      return tabType.includes(log.level);
    });
  }, [activeTab]);
  const jump = (t: number) => {
    spotPlayerStore.setTime(t / 1000);
  };
  const _rowRenderer = ({ index, key, parent, style }: any) => {
    const item = filteredList[index];

    return (
      // @ts-ignore
      <CellMeasurer
        cache={cache}
        columnIndex={0}
        key={key}
        rowIndex={index}
        parent={parent}
      >
        {({ measure, registerChild }) => (
          // @ts-ignore
          <div ref={registerChild} style={style}>
            <ConsoleRow
              log={item}
              jump={jump}
              iconProps={getIconProps(item.level)}
              renderWithNL={renderWithNL}
              recalcHeight={measure}
            />
          </div>
        )}
      </CellMeasurer>
    );
  };

  return (
    <BottomBlock>
      <BottomBlock.Header onClose={onClose}>
        <div className="flex items-center">
          <span className="font-semibold color-gray-medium mr-4">Console</span>
          <Tabs
            tabs={TABS}
            active={activeTab}
            onClick={onTabClick}
            border={false}
          />
        </div>
      </BottomBlock.Header>
      <BottomBlock.Content className={'overflow-y-auto'}>
        <NoContent
          title={
            <div className="capitalize flex items-center">
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
                estimatedRowSize={24}
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

export default observer(SpotConsole);
