import React from 'react';
import { Input, Button } from 'antd';
import { useHistory } from 'react-router-dom';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { withSiteId, dataManagement } from 'App/routes';
import { Album } from 'lucide-react';
import withPermissions from 'HOCs/withPermissions';
import UsersList from './components/UsersList';
import { debounce } from 'App/utils';
import { useTranslation } from 'react-i18next';

function UsersListPage() {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState('');
  const [query, setQuery] = React.useState('');
  const { projectsStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const history = useHistory();
  const toUser = (id: string) =>
    history.push(withSiteId(dataManagement.userPage(id), siteId));

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
      className="flex flex-col rounded-lg border bg-white mx-auto"
      style={{ maxWidth: 1360 }}
    >
      <div className={'flex items-center justify-between border-b px-4 py-2'}>
        <div className={'font-semibold text-lg capitalize'}>People</div>
        <div className="flex items-center gap-2">
          <a
            href="https://docs.openreplay.com/en/product-analytics/data-management/"
            target="_blank"
            rel="noreferrer"
          >
            <Button type={'text'} icon={<Album size={14} />}>
              {t('Docs')}
            </Button>
          </a>
          <div className="w-[320px]">
            <Input.Search
              size={'small'}
              placeholder={'Name, email, ID'}
              value={query}
              allowClear
              maxLength={256}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>
      <UsersList toUser={toUser} query={search} />
    </div>
  );
}

export default withPermissions(
  ['DATA_MANAGEMENT'],
  '',
  false,
  false,
)(observer(UsersListPage));
