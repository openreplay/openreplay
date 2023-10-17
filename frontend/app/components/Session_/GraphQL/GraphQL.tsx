import {Duration} from "luxon";
import React, { useEffect } from 'react';
import { NoContent, Input, SlideModal, CloseButton, Button } from 'UI';
import { getRE } from 'App/utils';
import BottomBlock from '../BottomBlock';
import TimeTable from '../TimeTable';
import GQLDetails from './GQLDetails';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';

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


function renderDefaultStatus() {
  return '2xx-3xx';
}

function GraphQL() {
  const { player, store } = React.useContext(PlayerContext);
  const { time, livePlay, tabStates, currentTab } = store.get();
  const { graphqlList: list = [], graphqlListNow: listNow = [] } = tabStates[currentTab]

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

  function renderName(r: Record<string, any>) {
    return (
      <div className="flex justify-between items-center grow-0 w-full">
        <div>{r.operationName}</div>
        <Button
          variant="text"
          className="right-0 text-xs uppercase p-2 color-gray-500 hover:color-teal"
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            player.jump(r.time);
          }}
        >
          Jump
        </Button>
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
            filterRE.test(r.variables)
        )
      : list;
  };

  const onFilterChange = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    const filtered = filterList(list, value);
    setState((prevState) => ({
      ...prevState,
      filter: value,
      filteredList: filtered,
      currentIndex: 0,
    }));
  };

  const setCurrent = (item: any, index: number) => {
    if (!livePlay) {
      player.pause();
      player.jump(item.time);
    }
    setState((prevState) => ({ ...prevState, current: item, currentIndex: index }));
  };

  const closeModal = () =>
    setState((prevState) => ({ ...prevState, current: null, showFetchDetails: false }));

  useEffect(() => {
    const filtered = filterList(listNow, state.filter);
    if (filtered.length !== lastActiveItem) {
      setState((prevState) => ({ ...prevState, lastActiveItem: listNow.length }));
    }
  }, [time]);

  const { current, currentIndex, filteredList, lastActiveItem } = state;

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
          <NoContent size="small" title="No recordings found" show={filteredList.length === 0}>
            <TimeTable
              rows={filteredList}
              onRowClick={setCurrent}
              hoverable
              activeIndex={lastActiveItem}
            >
              {[
                {
                  label: 'Start',
                  width: 90,
                  render: renderStart,
                },
                {
                  label: 'Status',
                  width: 70,
                  render: renderDefaultStatus,
                },
                {
                  label: 'Type',
                  dataKey: 'operationKind',
                  width: 60,
                },
                {
                  label: 'Name',
                  width: 240,
                  render: renderName,
                },
              ]}
            </TimeTable>
          </NoContent>
        </BottomBlock.Content>
      </BottomBlock>
    </React.Fragment>
  );
}

export default observer(GraphQL);
