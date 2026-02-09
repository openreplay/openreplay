import { useQuery } from '@tanstack/react-query';
import withPermissions from 'HOCs/withPermissions';
import { Button, Input } from 'antd';
import { Album } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';

import { useStore } from 'App/mstore';
import { dataManagement, withSiteId } from 'App/routes';

import ActionsList from './ActionsList';
import { fetchActions } from './api';

function ActionsListPage() {
  const { t } = useTranslation();
  const [query, setQuery] = React.useState('');
  const { projectsStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const history = useHistory();

  const limit = 10;
  const [page, setPage] = React.useState(1);
  const { data = { actions: [], total: 0 }, isPending } = useQuery({
    queryKey: ['actions-list', siteId],
    queryFn: () => fetchActions(),
  });

  const onPageChange = (page: number) => {
    setPage(page);
  };
  const onSearch = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const toAction = (id: string) => {
    history.push(withSiteId(dataManagement.actionPage(id), siteId!));
  };

  const toCreate = () => {
    history.push(withSiteId(dataManagement.actionPage('new'), siteId!));
  };

  const list = React.useMemo(() => {
    const sorted = [...data.actions].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    if (!query) {
      return sorted.slice((page - 1) * limit, page * limit);
    }
    const filtered = sorted.filter(
      (action) =>
        action.name.toLowerCase().includes(query.toLowerCase()) ||
        action.description.toLowerCase().includes(query.toLowerCase()),
    );
    return filtered.slice((page - 1) * limit, page * limit);
  }, [page, data.actions, query]);

  const total = query ? list.length : data.total;

  return (
    <div
      className="flex flex-col rounded-lg border bg-white mx-auto"
      style={{ maxWidth: 1360 }}
    >
      <div className={'flex items-center justify-between border-b px-4 py-2'}>
        <div className="flex items-center gap-2">
          <div className={'font-semibold text-lg capitalize'}>
            {t('Actions')}
          </div>
          <Button type="primary" size="small" onClick={toCreate}>
            {t('Create')}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://docs.openreplay.com/en/product-analytics/data-management/"
            target="_blank"
            rel="noreferrer"
          >
            <Button type="text" icon={<Album size={14} />}>{t('Docs')}</Button>
          </a>
          <div className="w-[320px]">
            <Input.Search
              size={'small'}
              placeholder={t('Search by name or description')}
              value={query}
              allowClear
              maxLength={256}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        </div>
      </div>
      <ActionsList
        list={list}
        page={page}
        limit={limit}
        total={total}
        listLen={list.length}
        isPending={isPending}
        onPageChange={onPageChange}
        toAction={toAction}
      />
    </div>
  );
}

export default withPermissions(
  ['DATA_MANAGEMENT'],
  '',
  false,
  false,
)(observer(ActionsListPage));
