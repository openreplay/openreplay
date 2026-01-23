import React from 'react';
import { Input, Table, Button } from 'antd';
import { useHistory, useLocation } from 'react-router-dom';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { Album } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import FullPagination from 'Shared/FullPagination';
import Tabs from 'Shared/Tabs';
import { fetchList } from './api';
import EventPropsPage from './EventPropsPage';
import UserPropsPage from './UserProperty';

function ListPage() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const defaultView = queryParams.get('view') as 'users' | 'events' | null;
  const pickedItem = queryParams.get('property');
  const limit = 10;
  const [page, setPage] = React.useState(1);
  const [query, setQuery] = React.useState('');
  const { t } = useTranslation();
  const [view, setView] = React.useState<'users' | 'events'>(
    defaultView ?? 'users',
  );
  const views = [
    {
      key: 'users',
      label: (
        <div className={'text-lg font-medium'}>{t('User Properties')}</div>
      ),
    },
    {
      key: 'events',
      label: (
        <div className={'text-lg font-medium'}>{t('Event Properties')}</div>
      ),
    },
  ];
  const { data = { properties: [], total: 0 }, isPending } = useQuery({
    queryKey: ['props-list', view],
    queryFn: () => fetchList(view),
  });
  const { projectsStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const history = useHistory();
  const openProp = (name: string) => {
    queryParams.set('property', name);
    return history.push({ search: queryParams.toString() });
  };

  React.useEffect(() => {
    setPage(1);
    queryParams.set('view', view);
    history.replace({
      search: queryParams.toString(),
    });
  }, [view]);

  const list = React.useMemo(() => {
    if (!data.properties) return [];
    if (!query) {
      return data.properties
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice((page - 1) * limit, page * limit);
    }
    const filtered = data.properties.filter(
      (prop) =>
        prop.name.toLowerCase().includes(query.toLowerCase()) ||
        prop.displayName.toLowerCase().includes(query.toLowerCase()) ||
        prop.description.toLowerCase().includes(query.toLowerCase()),
    );
    return filtered
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice((page - 1) * limit, page * limit);
  }, [page, data.properties, query]);

  if (pickedItem) {
    if (view === 'users') {
      const pickedUserProp = data.properties.find(
        (prop) => prop.name === pickedItem,
      );
      if (pickedUserProp) {
        const userWithFields = {
          name: pickedUserProp.name,
          fields: {
            displayName: { value: pickedUserProp.displayName, readonly: false },
            description: { value: pickedUserProp.description, readonly: false },
            volume: {
              value: pickedUserProp.usersCount?.toString() ?? 0,
              readonly: true,
            },
            type: { value: pickedUserProp.type, readonly: true },
          },
        };
        return (
          <UserPropsPage
            siteId={siteId!}
            properties={userWithFields}
            raw={pickedUserProp}
          />
        );
      }
    }
    if (view === 'events') {
      const pickedEventProp = data.properties.find(
        (prop) => prop.name === pickedItem,
      );
      if (pickedEventProp) {
        const evWithFields = {
          name: pickedEventProp.name,
          fields: {
            displayName: {
              value: pickedEventProp.displayName,
              readonly: false,
            },
            description: {
              value: pickedEventProp.description,
              readonly: false,
            },
            volume: { value: pickedEventProp.count.toString(), readonly: true },
            type: { value: pickedEventProp.type, readonly: true },
          },
        };
        return (
          <EventPropsPage
            raw={pickedEventProp}
            siteId={siteId!}
            event={evWithFields}
          />
        );
      }
    }
  }

  const openDocs = () => {
    const url = 'https://docs.openreplay.com/en/sdk/analytics/events/';
    window.open(url, '_blank');
  };
  return (
    <div
      className="flex flex-col rounded-lg border bg-white mx-auto"
      style={{ maxWidth: 1360 }}
    >
      <div className={'flex items-center justify-between border-b px-4'}>
        <Tabs activeKey={view} onChange={(key) => setView(key)} items={views} />
        <div className="flex items-center gap-2">
          <Button onClick={openDocs} type={'text'} icon={<Album size={14} />}>
            {t('Docs')}
          </Button>
          <Input.Search
            value={query}
            maxLength={256}
            onChange={(e) => setQuery(e.target.value)}
            size={'small'}
            placeholder={t('Name, email, ID')}
          />
        </div>
      </div>
      {view === 'users' ? (
        <UserPropsList
          list={list}
          page={page}
          isLoading={isPending}
          toUserProp={openProp}
          limit={limit}
          total={data.total}
          onPageChange={(page) => setPage(page)}
        />
      ) : (
        <EventPropsList
          list={list}
          limit={limit}
          total={data.total}
          page={page}
          isLoading={isPending}
          toEventProp={openProp}
          onPageChange={(page) => setPage(page)}
        />
      )}
    </div>
  );
}

function EventPropsList({
  toEventProp,
  list,
  limit,
  total,
  page,
  isLoading,
  onPageChange,
}: {
  toEventProp: (name: string) => void;
  onPageChange: (page: number) => void;
  list: any[];
  limit: number;
  total: number;
  page: number;
  isLoading: boolean;
}) {
  const numberFormatter = Intl.NumberFormat(navigator.language || 'en-US');
  const columns = [
    {
      title: 'Property',
      dataIndex: 'name',
      key: 'name',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
      render: (text: string) => <div className="link">{text}</div>,
    },
    {
      title: 'Display Name',
      dataIndex: 'displayName',
      key: 'displayName',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a: any, b: any) => a.displayName.localeCompare(b.displayName),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a: any, b: any) => a.description.localeCompare(b.description),
    },
    {
      title: '30 Day Volume',
      dataIndex: 'count',
      key: 'count',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a: any, b: any) => a.count - b.count,
      render: (text: string) => (
        <span>{numberFormatter.format(Number(text))}</span>
      ),
    },
  ];
  return (
    <div>
      <Table
        columns={columns}
        dataSource={list}
        pagination={false}
        onRow={(record) => ({
          onClick: () => toEventProp(record.name),
        })}
        rowHoverable
        rowClassName={'cursor-pointer'}
        loading={isLoading}
      />
      <FullPagination
        page={page}
        limit={limit}
        total={total}
        listLen={list.length}
        onPageChange={onPageChange}
        entity={'event properties'}
      />
    </div>
  );
}

function UserPropsList({
  toUserProp,
  list,
  limit,
  total,
  page,
  isLoading,
  onPageChange,
}: {
  toUserProp: (name: string) => void;
  onPageChange: (page: number) => void;
  list: any[];
  limit: number;
  total: number;
  page: number;
  isLoading: boolean;
}) {
  const numberFormatter = Intl.NumberFormat(navigator.language || 'en-US');
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string) => <div className="link">{text}</div>,
    },
    {
      title: 'Display Name',
      dataIndex: 'displayName',
      key: 'displayName',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a, b) => a.displayName.localeCompare(b.displayName),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a, b) => a.description.localeCompare(b.description),
    },
    {
      title: '# Users',
      dataIndex: 'usersCount',
      key: 'usersCount',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a, b) => a.usersCount - b.usersCount,
      render: (text: string) => (
        <span>{numberFormatter.format(Number(text))}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      <div className={'relative'}>
        <Table
          onRow={(record) => ({
            onClick: () => toUserProp(record.name),
          })}
          rowHoverable
          rowClassName={'cursor-pointer'}
          pagination={false}
          dataSource={list}
          columns={columns}
          loading={isLoading}
        />
      </div>
      <FullPagination
        page={page}
        limit={limit}
        total={total}
        listLen={list.length}
        onPageChange={onPageChange}
        entity={'user properties'}
      />
    </div>
  );
}

export default observer(ListPage);
