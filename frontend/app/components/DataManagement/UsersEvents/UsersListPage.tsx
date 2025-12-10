import React from 'react';
import { Input, Button } from 'antd';
import { useHistory, useParams } from 'react-router-dom';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { withSiteId, dataManagement } from 'App/routes';
import { Album } from 'lucide-react';
import UsersList from './components/UsersList';
import EventsList from './components/EventsList';
import { debounce } from 'App/utils';

function UsersListPage() {
  const [search, setSearch] = React.useState('');
  const [query, setQuery] = React.useState('');
  const params = useParams<{ view: string }>();
  const view = params.view || 'users';
  const { projectsStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const history = useHistory();
  const toUser = (id: string) =>
    history.push(withSiteId(dataManagement.userPage(id), siteId));
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

  return (
    <div
      className="flex flex-col gap-4 rounded-lg border bg-white mx-auto"
      style={{ maxWidth: 1360 }}
    >
      <div className={'flex items-center justify-between border-b px-4 pt-2 '}>
        <div className={'font-semibold text-lg capitalize'}>{view}</div>
        <div className="flex items-center gap-2">
          <Button type={'text'} icon={<Album size={14} />}>
            Docs
          </Button>
          <Input.Search
            size={'small'}
            placeholder={'Name, email, ID'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      {view === 'users' ? (
        <UsersList toUser={toUser} query={search} />
      ) : (
        <EventsList toEvent={toEvent} />
      )}
    </div>
  );
}

export default observer(UsersListPage);
