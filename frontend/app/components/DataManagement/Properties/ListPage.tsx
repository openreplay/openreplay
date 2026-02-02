import React from 'react';
import { Input, Table, Button, Tooltip, Switch } from 'antd';
import { useHistory, useLocation } from 'react-router-dom';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { Album, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import FullPagination from 'Shared/FullPagination';
import Tabs from 'Shared/Tabs';
import { fetchList } from './api';
import EventPropsPage from './EventPropsPage';
import UserPropsPage from './UserProperty';
import { TextEllipsis } from 'UI';

const showHiddenKey = 'data-management-properties-show-hidden';
function getShowHidden(): boolean {
  const stored = localStorage.getItem(showHiddenKey);
  if (stored === 'false') return false;
  return true;
}

function HiddenItem() {
  return (
    <Tooltip title="This property is hidden from search and analytics">
      <EyeOff className="text-disabled-text" size={14} />
    </Tooltip>
  );
}

function ListPage() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const defaultView = queryParams.get('view') as 'users' | 'events' | null;
  const pickedItem = queryParams.get('property');
  const limit = 10;
  const [page, setPage] = React.useState(1);
  const [query, setQuery] = React.useState('');
  const [showHidden, setShowHidden] = React.useState(getShowHidden);
  const { t } = useTranslation();
  const [view, setView] = React.useState<'users' | 'events'>(
    defaultView ?? 'users',
  );

  const onSearch = (value: string) => {
    setQuery(value);
    setPage(1);
  };

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
  const {
    data = { properties: [], total: 0 },
    isPending,
    refetch,
  } = useQuery({
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
    let filtered = data.properties;
    if (!showHidden) {
      filtered = filtered.filter((prop) => prop.status === 'visible');
    }
    if (query) {
      const regexTest = new RegExp(query, 'i');
      const isIncluded = (text: string) => regexTest.test(text);
      filtered = filtered.filter(
        (prop) =>
          isIncluded(prop.name) ||
          isIncluded(prop.displayName) ||
          isIncluded(prop.description),
      );
    }
    return filtered
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice((page - 1) * limit, page * limit);
  }, [page, data.properties, query, showHidden]);

  if (pickedItem) {
    if (view === 'users') {
      const pickedUserProp = data.properties.find(
        (prop) => prop.name === pickedItem,
      );
      if (pickedUserProp) {
        const userWithFields = {
          name: pickedUserProp.name,
          status: pickedUserProp.status,
          fields: {
            displayName: { value: pickedUserProp.displayName, readonly: false },
            description: { value: pickedUserProp.description, readonly: false },
            volume: {
              value: pickedUserProp.usersCount?.toString() ?? 0,
              readonly: true,
            },
            type: { value: pickedUserProp.dataType, readonly: true },
          },
        };
        return (
          <UserPropsPage
            siteId={siteId!}
            properties={userWithFields}
            raw={pickedUserProp}
            refetchList={refetch}
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
          status: pickedEventProp.status,
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
            type: { value: pickedEventProp.dataType, readonly: true },
          },
        };
        return (
          <EventPropsPage
            raw={pickedEventProp}
            siteId={siteId!}
            event={evWithFields}
            refetchList={refetch}
          />
        );
      }
    }
  }

  return (
    <div
      className="flex flex-col rounded-lg border bg-white mx-auto"
      style={{ maxWidth: 1360 }}
    >
      <div className={'flex items-center justify-between border-b px-4'}>
        <Tabs activeKey={view} onChange={(key) => setView(key)} items={views} />
        <div className="flex items-center gap-2">
          <Switch
            checked={showHidden}
            onChange={(checked) => {
              setShowHidden(checked);
              localStorage.setItem(showHiddenKey, String(checked));
            }}
            checkedChildren={t('All')}
            unCheckedChildren={t('Visible')}
          />
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
              value={query}
              maxLength={256}
              onChange={(e) => onSearch(e.target.value)}
              size={'small'}
              placeholder={t('Name or description')}
            />
          </div>
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
  const numberFormatter = Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
  });
  const columns = [
    {
      title: 'Property',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
      showSorterTooltip: false,
      className: 'cursor-pointer!',
      render: (text: string, record: any) => (
        <div className="flex items-center gap-2">
          <div>{text}</div>
          {record.status === 'hidden' && <HiddenItem />}
        </div>
      ),
    },
    {
      title: 'Display Name',
      dataIndex: 'displayName',
      key: 'displayName',
      sorter: (a: any, b: any) => a.displayName.localeCompare(b.displayName),
      render: (text: string) => (
        <TextEllipsis className="link" maxWidth={'185px'} text={text} />
      ),
      showSorterTooltip: false,
      className: 'cursor-pointer!',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '30-Day Volume',
      dataIndex: 'count',
      key: 'count',
      sorter: (a: any, b: any) => a.count - b.count,
      render: (text: string) => (
        <span>{numberFormatter.format(Number(text))}</span>
      ),
      showSorterTooltip: false,
      className: 'cursor-pointer!',
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
  const numberFormatter = Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
  });
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      showSorterTooltip: false,
      className: 'cursor-pointer!',
      render: (text: string, record: any) => (
        <div className="flex items-center gap-2">
          <div>{text}</div>
          {record.status === 'hidden' && <HiddenItem />}
        </div>
      ),
    },
    {
      title: 'Display Name',
      dataIndex: 'displayName',
      key: 'displayName',
      sorter: (a, b) => a.displayName.localeCompare(b.displayName),
      render: (text: string) => (
        <TextEllipsis className="link" maxWidth={'185px'} text={text} />
      ),
      showSorterTooltip: false,
      className: 'cursor-pointer!',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '# Users',
      dataIndex: 'usersCount',
      key: 'usersCount',
      sorter: (a, b) => a.usersCount - b.usersCount,
      render: (text: string) => (
        <span>{numberFormatter.format(Number(text))}</span>
      ),
      showSorterTooltip: false,
      className: 'cursor-pointer!',
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
