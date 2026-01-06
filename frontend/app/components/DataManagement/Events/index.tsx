import React from 'react';
import { Input, Button } from 'antd';
import { useHistory } from 'react-router-dom';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { withSiteId, dataManagement } from 'App/routes';
import { Album } from 'lucide-react';
import withPermissions from 'HOCs/withPermissions';
import EventsList from './EventsList';
import { debounce } from 'App/utils';

function EventsListPage() {
  const [search, setSearch] = React.useState('');
  const [query, setQuery] = React.useState('');
  const { projectsStore } = useStore();
  const history = useHistory();
  const siteId = projectsStore.activeSiteId;
  const toEvent = (id: string) =>
    history.push(withSiteId(dataManagement.eventPage(id), siteId));

  const debouncedSetSearch = React.useRef(
    debounce((value: string) => {
      setSearch(value);
    }, 300),
  ).current;
  React.useEffect(() => {
    debouncedSetSearch(query);
  }, [query]);

  const openDocs = () => {
    const url = 'https://docs.openreplay.com/sdk/analytics';
    window.open(url, '_blank');
  };
  return (
    <div
      className="flex flex-col rounded-lg border bg-white mx-auto"
      style={{ maxWidth: 1360 }}
    >
      <div className={'flex items-center justify-between border-b px-4 py-2'}>
        <div className={'font-semibold text-lg capitalize'}>Events</div>
        <div className="flex items-center gap-2">
          <Button onClick={openDocs} type={'text'} icon={<Album size={14} />}>
            Docs
          </Button>
          <Input.Search
            size={'small'}
            placeholder={'Name, email, ID'}
            value={query}
            allowClear
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <EventsList toEvent={toEvent} />
    </div>
  );
}

export default withPermissions(
  ['DATA_MANAGEMENT'],
  '',
  false,
  false,
)(observer(EventsListPage));
