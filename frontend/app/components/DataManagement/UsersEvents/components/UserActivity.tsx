import React from 'react';
import EventDetailsModal, {
  Triangle,
} from 'Components/DataManagement/Activity/EventDetailsModal';
import Event from 'App/mstore/types/Analytics/Event';
import { EyeOff } from 'lucide-react';
import { tsToCheckRecent } from 'App/date';
import { useModal } from 'App/components/Modal';
import EventsByDay from './EventsByDay';
import { useStore } from 'App/mstore';
import { useQuery } from '@tanstack/react-query';
import SelectDateRange from 'Shared/SelectDateRange/SelectDateRange';
import Period, { LAST_7_DAYS } from 'Types/app/period';
import { observer } from 'mobx-react-lite';
import { Button } from 'antd';
import FilterEntriesModal from 'Components/DataManagement/FilterEntriesModal';
import FullPagination from 'Shared/FullPagination';
import { hashString } from 'App/types/session/session';
import UserSessionsModal from 'Shared/UserSessionsModal';

const card = 'rounded-lg border bg-white';

function Activity({ userId }: { userId: string }) {
  const limit = 50;
  const [page, setPage] = React.useState(1);
  const [period, setPeriod] = React.useState<{
    start: number;
    end: number;
    rangeName: string;
  }>(Period({ rangeName: LAST_7_DAYS }));

  const onDateChange = (period: any) => {
    const { start, end, rangeName } = period;
    setPeriod(Period({ start, end, rangeName }));
  };
  const { analyticsStore, projectsStore, searchStore, filterStore } =
    useStore();
  const eventTypes = filterStore
    .getCurrentProjectFilters()
    .filter((f) => f.isEvent)
    .map((f) => ({ title: f.displayName ?? f.name, key: f.name }));
  const [hiddenTypes, setHiddenTypes] = React.useState<string[]>([]);
  const [editCols, setEditCols] = React.useState(false);
  const { showModal, hideModal } = useModal();
  const { data: list, isPending } = useQuery({
    queryKey: [
      'user-events',
      userId,
      period.start,
      period.end,
      hiddenTypes,
      page,
    ],
    queryFn: async () => {
      const response = await analyticsStore.fetchUserEvents(
        userId,
        'desc',
        period,
        hiddenTypes,
        page,
        limit,
      );
      return response;
    },
  });

  const onItemClick = (ev: Event) => {
    if (!projectsStore.activeSiteId) return;
    showModal(
      <EventDetailsModal
        event_id={ev.event_id}
        siteId={projectsStore.activeSiteId}
        onClose={hideModal}
      />,
      {
        width: 620,
        right: true,
      },
    );
  };

  const byDays: Record<string, Event[]> = (list?.events ?? []).reduce(
    (acc, ev) => {
      const date = tsToCheckRecent(ev.created_at, 'LLL dd, yyyy');
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(ev);
      return acc;
    },
    {},
  );

  const toggleEvents = () => {
    setTimeout(() => {
      setEditCols(true);
    }, 0);
  };

  const getName = (filterName: string) =>
    filterStore.getFilterDisplayName(filterName);

  const saveShownTypes = (cols: any[]) => {
    const selected = eventTypes.filter((et) => cols.includes(et.key));
    setHiddenTypes(
      eventTypes
        .map((et) => et.key)
        .filter((key) => !selected.find((st) => st.key === key)),
    );
    setEditCols(false);
  };

  const total = list?.total ?? 0;
  const onPageChange = (newPage: number) => {
    setPage(newPage);
  };

  const openSessions = () => {
    const hash = hashString(userId) as unknown as string;
    showModal(<UserSessionsModal userId={userId} name="User" />, {
      width: 700,
      right: true,
    });
  };
  return (
    <div className={card}>
      <div className={'px-4 py-2 flex items-center gap-2 relative'}>
        <div className={'text-lg font-semibold'}>Activity</div>
        <div className={'link flex gap-1 items-center'} onClick={openSessions}>
          <span>Play Sessions</span>
          <Triangle size={10} color={'blue'} />
        </div>
        <div className={'ml-auto'} />
        <div className="relative">
          {editCols ? (
            <FilterEntriesModal
              columns={eventTypes}
              onSelect={saveShownTypes}
              onClose={() => setEditCols(false)}
              hiddenCols={hiddenTypes}
              topOffset={'top-8'}
              header={'Show/Hide Event Types'}
              subheader={'Select event types to display in the activity feed.'}
              searchText={'Search event types'}
              confirmText={'Show Selected'}
            />
          ) : null}
          <Button
            className={'flex items-center gap-2'}
            type={'text'}
            size={'small'}
            onClick={toggleEvents}
          >
            <EyeOff size={16} />
            <span className={'font-medium'}>Hide Events</span>
          </Button>
        </div>
        <SelectDateRange isAnt period={period} onChange={onDateChange} right />
      </div>
      {isPending ? (
        <div className="p-4">Loading...</div>
      ) : (list?.events ?? []).length === 0 ? (
        <div className="p-4">
          No events found for the selected period or user.
        </div>
      ) : null}
      <EventsByDay
        getName={getName}
        byDays={byDays}
        onItemClick={onItemClick}
      />
      {list && total > limit ? (
        <FullPagination
          page={page}
          limit={limit}
          total={total}
          listLen={list?.events.length}
          onPageChange={onPageChange}
          entity={'events'}
        />
      ) : null}
    </div>
  );
}

export default observer(Activity);
