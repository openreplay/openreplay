import React from 'react';
import EventDetailsModal, {
  Triangle,
} from 'Components/DataManagement/Activity/EventDetailsModal';
import Event from 'App/mstore/types/Analytics/Event';
import { Eye, EyeOff } from 'lucide-react';
import Select from 'Shared/Select';
import { tsToCheckRecent } from 'App/date';
import { useModal } from 'App/components/Modal';
import EventsByDay from './EventsByDay';
import { useStore } from 'App/mstore';
import { useQuery } from '@tanstack/react-query';
import { useHistory } from 'react-router';
import { sessions, withSiteId } from 'App/routes';
import SelectDateRange from 'Shared/SelectDateRange/SelectDateRange';
import Period, { LAST_7_DAYS } from 'Types/app/period';
import { observer } from 'mobx-react-lite';
import { Button } from 'antd';
import FilterEntriesModal from 'Components/DataManagement/FilterEntriesModal';

const card = 'rounded-lg border bg-white';

function Activity({ userId }: { userId: string }) {
  const history = useHistory();
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
  const [shownTypes, setShownTypes] =
    React.useState<{ title: string; key: string }[]>(eventTypes);
  const [hiddenTypes, setHiddenTypes] = React.useState<string[]>([]);
  const [editCols, setEditCols] = React.useState(false);
  const { showModal, hideModal } = useModal();
  const [sort, setSort] = React.useState<'asc' | 'desc'>('desc');
  const { data: list } = useQuery({
    queryKey: [
      'user-events',
      userId,
      sort,
      period.start,
      period.end,
      hiddenTypes,
    ],
    queryFn: async () => {
      const response = await analyticsStore.fetchUserEvents(
        userId,
        sort,
        period,
        hiddenTypes,
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

  const toSessions = () => {
    const filter = filterStore.findEvent({ name: 'distinctId' });
    if (filter) {
      filter.value = [userId];
      searchStore.addFilter(filter);
    }
    history.push(withSiteId(sessions(), projectsStore.activeSiteId ?? ''));
  };

  const getName = (filterName: string) =>
    filterStore.getFilterDisplayName(filterName);

  const saveShownTypes = (cols: any[]) => {
    const selected = eventTypes.filter((et) => cols.includes(et.key));
    setShownTypes(selected);
    setHiddenTypes(
      eventTypes
        .map((et) => et.key)
        .filter((key) => !selected.find((st) => st.key === key)),
    );
    setEditCols(false);
  };
  return (
    <div className={card}>
      <div className={'px-4 py-2 flex items-center gap-2 relative'}>
        <div className={'text-lg font-semibold'}>Activity</div>
        <div className={'link flex gap-1 items-center'} onClick={toSessions}>
          <span>Play Sessions</span>
          <Triangle size={10} color={'blue'} />
        </div>
        <div className={'ml-auto relative'}>
          {editCols ? (
            <FilterEntriesModal
              left
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
        </div>
        <Button
          className={'flex items-center gap-2'}
          type={'text'}
          size={'small'}
          onClick={toggleEvents}
        >
          <EyeOff size={16} />
          <span className={'font-medium'}>Hide Events</span>
        </Button>
        <SelectDateRange isAnt period={period} onChange={onDateChange} right />
      </div>
      <EventsByDay
        getName={getName}
        byDays={byDays}
        onItemClick={onItemClick}
      />
    </div>
  );
}

export default observer(Activity);
