import React from 'react';
import { Input, Button, Dropdown, MenuProps } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useHistory, useLocation } from 'react-router-dom';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { Album } from 'lucide-react';
import withPermissions from 'HOCs/withPermissions';
import EventsList from './EventsList';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { fetchList } from './api';
import DistinctEventPage from './DistinctEvent';
import { sessions, withSiteId } from 'App/routes';

type EventFilter = 'all' | 'autocaptured' | 'my_events';

const localKey = 'data-management-events-filter';
function getDefaultValue(): EventFilter {
  const stored = localStorage.getItem(localKey);
  if (stored && ['all', 'autocaptured', 'my_events'].includes(stored)) {
    return stored as EventFilter;
  }
  return 'all';
}

function EventsListPage() {
  const [eventFilter, setEventFilter] = React.useState<EventFilter>(getDefaultValue);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const shownEvent = searchParams.get('event');
  const { t } = useTranslation();
  const [query, setQuery] = React.useState('');
  const { projectsStore, filterStore, searchStore } = useStore();
  const history = useHistory();
  const siteId = projectsStore.activeSiteId;
  const toEvent = (name: string) => {
    history.push({
      search: new URLSearchParams({ event: name }).toString(),
    });
  };

  const openDocs = () => {
    const url = 'https://docs.openreplay.com/en/sdk/analytics/events/';
    window.open(url, '_blank');
  };

  const limit = 10;
  const [page, setPage] = React.useState(1);
  const { data = { events: [], total: 0 }, isPending } = useQuery({
    queryKey: ['distinct-events-list', siteId],
    queryFn: () => fetchList(),
  });
  const onPageChange = (page: number) => {
    setPage(page);
  };
  const list = React.useMemo(() => {
    if (shownEvent) return [];
    const filteredByType = data.events.filter((e) => {
      if (eventFilter === 'all') return true;
      if (eventFilter === 'autocaptured') return e.autoCaptured;
      return !e.autoCaptured; // my_events
    });
    const sortedList = filteredByType.sort((a, b) => b.count - a.count);
    if (!query) {
      return sortedList.slice((page - 1) * limit, page * limit);
    }
    const filtered = sortedList.filter(
      (event) =>
        event.name.toLowerCase().includes(query.toLowerCase()) ||
        event.displayName.toLowerCase().includes(query.toLowerCase()) ||
        event.description.toLowerCase().includes(query.toLowerCase()),
    );
    return filtered.slice((page - 1) * limit, page * limit);
  }, [page, data.events, query, shownEvent, eventFilter]);

  if (shownEvent) {
    const event = data.events.find((e) => e.name === shownEvent);
    if (event) {
      const openSessions = () => {
        const filter = filterStore.findEvent({ name: event.name });
        const path = withSiteId(sessions(), siteId!);
        if (filter) {
          searchStore.addFilterOnce(filter);
          history.push(path);
        }
      };
      return (
        <DistinctEventPage
          event={event}
          siteId={siteId!}
          openSessions={openSessions}
        />
      );
    } else {
      return <div>{t('Event {{name}} not found', { name: shownEvent })}</div>;
    }
  }

  const filterOptions = [
    { key: 'all', label: t('All') },
    { key: 'autocaptured', label: t('Autocaptured events') },
    { key: 'my_events', label: t('My events') },
  ];

  const handleFilterChange: MenuProps['onClick'] = ({ key }) => {
    const newFilter = key as EventFilter;
    setEventFilter(newFilter);
    localStorage.setItem(localKey, newFilter);
  };

  const menuItems: MenuProps['items'] = filterOptions.map((option) => ({
    key: option.key,
    label: option.label,
  }));

  return (
    <div
      className="flex flex-col rounded-lg border bg-white mx-auto"
      style={{ maxWidth: 1360 }}
    >
      <div className={'flex items-center justify-between border-b px-4 py-2'}>
        <div className="flex items-center gap-2">
          <div className={'font-semibold text-lg capitalize'}>
            {t('Events')}
          </div>
          <Dropdown
            menu={{ items: menuItems, onClick: handleFilterChange }}
            trigger={['click']}
          >
            <Button type="text" size="small">
              {filterOptions.find((opt) => opt.key === eventFilter)?.label}
              <DownOutlined />
            </Button>
          </Dropdown>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openDocs} type={'text'} icon={<Album size={14} />}>
            {t('Docs')}
          </Button>
          <div className="w-[320px]">
            <Input.Search
              size={'small'}
              placeholder={t('Event name, display name, or description')}
              value={query}
              allowClear
              maxLength={256}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>
      <EventsList
        toEvent={toEvent}
        list={list}
        page={page}
        limit={limit}
        total={data.total}
        listLen={list.length}
        isPending={isPending}
        onPageChange={onPageChange}
      />
    </div>
  );
}

export default withPermissions(
  ['DATA_MANAGEMENT'],
  '',
  false,
  false,
)(observer(EventsListPage));
