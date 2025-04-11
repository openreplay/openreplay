import { Duration } from 'luxon';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';

import { PlayerContext } from 'App/components/Session/playerContext';
import { getRE } from 'App/utils';
import TimeTable from 'Components/shared/DevTools/TimeTable';
import { CloseButton, Input, NoContent, SlideModal } from 'UI';

import BottomBlock from '../BottomBlock';
import GQLDetails from './GQLDetails';
import { useTranslation } from 'react-i18next';

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

function GraphQL({ panelHeight }: { panelHeight: number }) {
  const { player, store } = React.useContext(PlayerContext);
  const { time, livePlay, tabStates, currentTab } = store.get();
  const { graphqlList: list = [], graphqlListNow: listNow = [] } =
    tabStates[currentTab];

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
    <>
      <SlideModal
        size="middle"
        right
        title={
          <div className="flex justify-between">
            <h1>{t('GraphQL')}</h1>
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
          <span className="font-semibold color-gray-medium mr-4">
            {t('GraphQL')}
          </span>
          <div className="flex items-center">
            <Input
              // className="input-small"
              placeholder={t('Filter by name or type')}
              icon="search"
              name="filter"
              onChange={onFilterChange}
            />
          </div>
        </BottomBlock.Header>
        <BottomBlock.Content>
          <NoContent
            size="small"
            title={t('No recordings found')}
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
                  label: t('Start'),
                  width: 90,
                  render: renderStart,
                },
                {
                  label: t('Type'),
                  dataKey: 'operationKind',
                  width: 80,
                },
                {
                  label: t('Name'),
                  width: 300,
                  render: renderName,
                },
              ]}
            </TimeTable>
          </NoContent>
        </BottomBlock.Content>
      </BottomBlock>
    </>
  );
}

export default observer(GraphQL);
