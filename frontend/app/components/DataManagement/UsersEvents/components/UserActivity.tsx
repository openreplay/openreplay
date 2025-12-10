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

const card = 'rounded-lg border bg-white';

function Activity({ userId }: { userId: string }) {
  const history = useHistory();

  const { analyticsStore, projectsStore } = useStore();
  const [show, setShow] = React.useState(true);
  const { showModal, hideModal } = useModal();
  const [sort, setSort] = React.useState<'asc' | 'desc'>('desc');
  const { data: list } = useQuery({
    queryKey: ['user-events', userId, sort],
    queryFn: async () => {
      const response = await analyticsStore.fetchUserEvents(userId, sort);
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
        width: 420,
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
    setShow((prev) => !prev);
  };

  const toSessions = () => {
    history.push(
      withSiteId(sessions(), projectsStore.activeSiteId ?? ''),
    );
  }
  return (
    <div className={card}>
      <div className={'px-4 py-2 flex items-center gap-2'}>
        <div className={'text-lg font-semibold'}>Activity</div>
        <div className={'link flex gap-1 items-center'} onClick={toSessions}>
          <span>Play Sessions</span>
          <Triangle size={10} color={'blue'} />
        </div>
        <div className={'ml-auto'} />
        <div
          className={'flex items-center gap-2 cursor-pointer'}
          onClick={toggleEvents}
        >
          {!show ? <Eye size={16} /> : <EyeOff size={16} />}
          <span className={'font-medium'}>{show ? 'Hide' : 'Show'} Events</span>
        </div>
        <Select
          options={[
            { label: 'Newest', value: 'desc' },
            { label: 'Oldest', value: 'asc' },
          ]}
          value={sort}
          plain
          onChange={({ value }) => {
            setSort(value.value);
          }}
        />
      </div>
      <div className={show ? 'block' : 'hidden'}>
        <EventsByDay byDays={byDays} onItemClick={onItemClick} />
      </div>
    </div>
  );
}

export default Activity;
