import { Duration } from 'luxon';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';

import { PlayerContext, MobilePlayerContext } from 'App/components/Session/playerContext';
import { getRE } from 'App/utils';
import TimeTable from 'Components/shared/DevTools/TimeTable';
import { CloseButton, Input, NoContent, SlideModal } from 'UI';

import BottomBlock from '../BottomBlock';
import GQLDetails from './GQLDetails';
import { useTranslation } from 'react-i18next';
import { IWebPlayerStore, IIOSPlayerStore } from 'App/player/create';

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
  onFilterChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  filteredList: Array<any>;
  current: any;
  renderName: (item: any) => React.ReactNode;
  panelHeight: number;
  closeModal: () => void;
  currentIndex: number;
  setCurrent: (item: any, index: number) => void;
  lastActiveItem?: any;
  onJump?: ({ time }: { time: number }) => void;
}

const GraphQLComponent = ({
  onFilterChange,
  filteredList,
  current,
  renderName,
  panelHeight,
  closeModal,
  currentIndex,
  setCurrent,
  lastActiveItem,
  onJump,
}: Props) => {
  return (
    <React.Fragment>
      <SlideModal
        size="middle"
        right
        title={
          <div className="flex justify-between">
            <h1>GraphQL</h1>
            <div className="flex items-center">
              <CloseButton onClick={closeModal} size="18" className="ml-2" />
            </div>
          </div>
        }
        isDisplayed={current != null}
        content={
          current && (
            <GQLDetails
              gql={current}
              first={currentIndex === 0}
              last={currentIndex === filteredList.length - 1}
            />
          )
        }
        onClose={closeModal}
      />
      <BottomBlock>
        <BottomBlock.Header>
          <span className="font-semibold color-gray-medium mr-4">GraphQL</span>
          <div className="flex items-center">
            <Input
              // className="input-small"
              placeholder="Filter by name or type"
              icon="search"
              name="filter"
              onChange={onFilterChange}
            />
          </div>
        </BottomBlock.Header>
        <BottomBlock.Content>
          <NoContent
            size="small"
            title="No recordings found"
            show={filteredList.length === 0}
          >
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
          </NoContent>
        </BottomBlock.Content>
      </BottomBlock>
    </React.Fragment>
  );
};

function GraphQL({ panelHeight, isMobile }: { panelHeight: number, isMobile?: boolean }) {
  const context = isMobile ? MobilePlayerContext : PlayerContext;
  // @ts-ignore
  const { player, store } = React.useContext(context);
  const { time, livePlay } = store.get();
  let list: any[] = [];
  let listNow: any[] = [];
  if (isMobile) {
    const { graphqlList = [], graphqlListNow = [] } = (store as unknown as IIOSPlayerStore).get();
    list = graphqlList;
    listNow = graphqlListNow;
  } else {
    const { tabStates, currentTab } = (store as unknown as IWebPlayerStore).get();
    const { graphqlList = [], graphqlListNow = [] } = tabStates[currentTab];
    list = graphqlList;
    listNow = graphqlListNow;
  }

  const defaultState = {
    filter: '',
    filteredList: list,
    filteredListNow: listNow,
    // @ts-ignore
    current: null,
    currentIndex: 0,
    showFetchDetails: false,
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

  const onFilterChange = ({
    target: { value },
  }: React.ChangeEvent<HTMLInputElement>) => {
    const filtered = filterList(list, value);
    setState((prevState) => ({
      ...prevState,
      filter: value,
      filteredList: filtered,
      currentIndex: 0,
    }));
  };

  const setCurrent = (item: any, index: number) => {
    setState((prevState) => ({
      ...prevState,
      current: item,
      currentIndex: index,
    }));
  };

  const onJump = ({ time }: { time: number }) => {
    if (!livePlay) {
      player.pause();
      player.jump(time);
    }
  };

  const closeModal = () =>
    setState((prevState) => ({
      ...prevState,
      current: null,
      showFetchDetails: false,
    }));

  useEffect(() => {
    const filtered = filterList(listNow, state.filter);
    if (filtered.length !== lastActiveItem) {
      setState((prevState) => ({
        ...prevState,
        lastActiveItem: listNow.length,
      }));
    }
  }, [time]);

  const { current, currentIndex, filteredList, lastActiveItem } = state;

  return (
    <GraphQLComponent
      onFilterChange={onFilterChange}
      filteredList={filteredList}
      current={current}
      renderName={renderName}
      panelHeight={panelHeight}
      closeModal={closeModal}
      currentIndex={currentIndex}
      setCurrent={setCurrent}
      lastActiveItem={lastActiveItem}
      onJump={onJump}
    />
  );
}

export default observer(GraphQL);
