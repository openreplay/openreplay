import { IIOSPlayerStore, IWebPlayerStore } from 'Player/create';
import { Duration } from 'luxon';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'App/components/Modal';
import {
  MobilePlayerContext,
  PlayerContext,
} from 'App/components/Session/playerContext';
import TimeTable from 'Components/shared/DevTools/TimeTable';

import { Keyword, NoData } from 'Shared/DevTools/PanelKit';
import { useRegExListFilterMemo } from 'Shared/DevTools/useListFilter';
import GraphQLDetailsModal from 'Shared/GraphQLDetailsModal';

import BottomBlock from '../BottomBlock';

const searchable = (r: any) => [r.operationKind, r.operationName, r.variables];

function renderStart(r: any) {
  return (
    <div className="flex justify-between items-center grow-0 w-full">
      <span>{Duration.fromMillis(r.time).toFormat('mm:ss.SSS')}</span>
    </div>
  );
}

function renderName(r: any) {
  return (
    <div className="flex justify-between items-center grow-0 w-full">
      <div>{r.operationName}</div>
    </div>
  );
}

function GraphQL({
  panelHeight,
  isMobile,
}: {
  panelHeight: number;
  isMobile?: boolean;
}) {
  const { t } = useTranslation();
  const context = isMobile ? MobilePlayerContext : PlayerContext;
  // @ts-ignore
  const { player, store } = React.useContext(context);
  const { livePlay } = store.get();
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

  const [filter, setFilter] = React.useState('');
  const filteredList = useRegExListFilterMemo(list, searchable, filter);
  const played = useRegExListFilterMemo(listNow, searchable, filter).length;
  // the last operation played; past the end once all have, like useAutoscroll
  const activeIndex =
    played === filteredList.length ? played : played - 1;

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

  return (
    <BottomBlock>
      <BottomBlock.Header>
        <span />
        <div className="m-dt__bar-right">
          <Keyword
            value={filter}
            onChange={setFilter}
            placeholder={t('Filter by name or type')}
          />
        </div>
      </BottomBlock.Header>
      <BottomBlock.Content>
        {filteredList.length === 0 ? (
          <NoData
            mark="network"
            hint={t('No GraphQL operation matches that.')}
          />
        ) : (
          <TimeTable
            rows={filteredList}
            onRowClick={setCurrent}
            tableHeight={panelHeight - 102}
            hoverable
            activeIndex={activeIndex}
            onJump={onJump}
          >
            {[
              { label: 'Start', width: 90, render: renderStart },
              { label: 'Type', dataKey: 'operationKind', width: 80 },
              { label: 'Name', width: 300, render: renderName },
            ]}
          </TimeTable>
        )}
      </BottomBlock.Content>
    </BottomBlock>
  );
}

export default observer(GraphQL);
