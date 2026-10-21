import { IIOSPlayerStore, IWebPlayerStore } from 'Player/create';
import { Duration } from 'luxon';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'App/components/Modal';
import {
  MobilePlayerContext,
  PlayerContext,
} from 'App/components/Session/playerContext';
import { getRE } from 'App/utils';
import TimeTable from 'Components/shared/DevTools/TimeTable';

import { Keyword, NoData } from 'Shared/DevTools/PanelKit';
import GraphQLDetailsModal from 'Shared/GraphQLDetailsModal';

import BottomBlock from '../BottomBlock';

export function renderStart(r) {
  return (
    <div className="flex justify-between items-center grow-0 w-full">
      <span>{Duration.fromMillis(r.time).toFormat('mm:ss.SSS')}</span>
      {/* <Button
        variant="text"
        className="right-0 text-xs uppercase p-2 color-gray-500 hover:color-teal"
        onClick={(e) => {
          e.stopPropagation();
          jump(r.time);
        }}
      >
        Jump
    </Button> */}
    </div>
  );
}

interface Props {
  filter: string;
  onFilterChange: (value: string) => void;
  filteredList: Array<any>;
  renderName: (item: any) => React.ReactNode;
  panelHeight: number;
  setCurrent: (item: any) => void;
  lastActiveItem?: any;
  onJump?: ({ time }: { time: number }) => void;
}

const GraphQLComponent = ({
  filter,
  onFilterChange,
  filteredList,
  renderName,
  panelHeight,
  setCurrent,
  lastActiveItem,
  onJump,
}: Props) => {
  const { t } = useTranslation();
  return (
    <React.Fragment>
      <BottomBlock>
        <BottomBlock.Header>
          <span />
          <div className="m-dt__bar-right">
            <Keyword
              value={filter}
              onChange={onFilterChange}
              placeholder={t('Filter by name or type')}
            />
          </div>
        </BottomBlock.Header>
        <BottomBlock.Content>
          {filteredList.length === 0 ? (
            <NoData hint={t('No GraphQL operation matches that.')} />
          ) : (
            <TimeTable
              rows={filteredList}
              onRowClick={setCurrent}
              tableHeight={panelHeight - 102}
              hoverable
              activeIndex={lastActiveItem}
              onJump={onJump}
            >
              {[
                {
                  label: 'Start',
                  width: 90,
                  render: renderStart,
                },
                {
                  label: 'Type',
                  dataKey: 'operationKind',
                  width: 80,
                },
                {
                  label: 'Name',
                  width: 300,
                  render: renderName,
                },
              ]}
            </TimeTable>
          )}
        </BottomBlock.Content>
      </BottomBlock>
    </React.Fragment>
  );
};

function GraphQL({
  panelHeight,
  isMobile,
}: {
  panelHeight: number;
  isMobile?: boolean;
}) {
  const context = isMobile ? MobilePlayerContext : PlayerContext;
  // @ts-ignore
  const { player, store } = React.useContext(context);
  const { time, livePlay } = store.get();
  let list: any[] = [];
  let listNow: any[] = [];
  if (isMobile) {
    const { graphqlList = [], graphqlListNow = [] } = (
      store as unknown as IIOSPlayerStore
    ).get();
    list = graphqlList;
    listNow = graphqlListNow;
  } else {
    const { tabStates, currentTab } = (
      store as unknown as IWebPlayerStore
    ).get();
    const { graphqlList = [], graphqlListNow = [] } = tabStates[currentTab];
    list = graphqlList;
    listNow = graphqlListNow;
  }

  const defaultState = {
    filter: '',
    filteredList: list,
    filteredListNow: listNow,
    hasNextError: false,
    hasPreviousError: false,
    lastActiveItem: 0,
  };

  const [state, setState] = React.useState(defaultState);
  const { t } = useTranslation();

  function renderName(r: Record<string, any>) {
    return (
      <div className="flex justify-between items-center grow-0 w-full">
        <div>{r.operationName}</div>
      </div>
    );
  }

  const filterList = (list: any, value: string) => {
    const filterRE = getRE(value, 'i');

    return value
      ? list.filter(
          (r: any) =>
            filterRE.test(r.operationKind) ||
            filterRE.test(r.operationName) ||
            filterRE.test(r.variables),
        )
      : list;
  };

  const onFilterChange = (value: string) => {
    const filtered = filterList(list, value);
    setState((prevState) => ({
      ...prevState,
      filter: value,
      filteredList: filtered,
      currentIndex: 0,
    }));
  };

  const { showModal } = useModal();
  const setCurrent = (item: any) => {
    showModal(<GraphQLDetailsModal resource={item} />, { right: true });
  };

  const onJump = ({ time }: { time: number }) => {
    if (!livePlay) {
      player.pause();
      player.jump(time);
    }
  };

  useEffect(() => {
    const filtered = filterList(listNow, state.filter);
    if (filtered.length !== lastActiveItem) {
      setState((prevState) => ({
        ...prevState,
        lastActiveItem: listNow.length,
      }));
    }
  }, [time]);

  const { filteredList, lastActiveItem } = state;

  return (
    <GraphQLComponent
      filter={state.filter}
      onFilterChange={onFilterChange}
      filteredList={filteredList}
      renderName={renderName}
      panelHeight={panelHeight}
      setCurrent={setCurrent}
      lastActiveItem={lastActiveItem}
      onJump={onJump}
    />
  );
}

export default observer(GraphQL);
