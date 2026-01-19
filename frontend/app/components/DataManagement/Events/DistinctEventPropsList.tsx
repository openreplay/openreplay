import React from 'react';
import { fetchList } from '../Properties/api';
import { Segmented, Table } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import FullPagination from 'Shared/FullPagination';

function DistinctEventPropsList({ eventName }: { eventName: string }) {
  const limit = 10;
  const [page, setPage] = React.useState(1);
  const onPageChange = (page: number) => {
    setPage(page);
  };
  const { t } = useTranslation();
  const [view, setView] = React.useState<'all' | 'default' | 'custom'>('all');
  const { data = { properties: [], total: 0 }, isPending } = useQuery({
    queryKey: ['distinct-event-props-list', eventName],
    queryFn: () => fetchList('events', eventName),
  });

  const filteredProps = React.useMemo(() => {
    let viewProps: any = [];
    if (view === 'all') {
      viewProps = data.properties;
    } else if (view === 'default') {
      viewProps = data.properties.filter((prop) => prop.autoCaptured);
    } else if (view === 'custom') {
      viewProps = data.properties.filter((prop) => !prop.autoCaptured);
    }
    return viewProps.slice((page - 1) * limit, page * limit);
  }, [data.properties, view, page]);

  const tableCols = [
    {
      title: t('Name'),
      dataIndex: 'name',
      key: 'name',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
    },
    {
      title: t('Display Name'),
      dataIndex: 'displayName',
      key: 'displayName',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a: any, b: any) => a.displayName.localeCompare(b.displayName),
    },
    {
      title: t('Description'),
      dataIndex: 'description',
      key: 'description',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a: any, b: any) => a.description.localeCompare(b.description),
    },
  ];
  return (
    <div className="flex flex-col gap-4 bg-white border rounded-lg">
      <div className="px-4 pt-4 flex items-center gap-4">
        <div className="font-semibold text-lg">{t('Event Properties')}</div>
        <Segmented
          options={[
            { label: t('All'), value: 'all' },
            { label: t('Your Properties'), value: 'custom' },
            { label: t('OpenReplay'), value: 'default' },
          ]}
          value={view}
          onChange={(value) => setView(value as 'all' | 'default' | 'custom')}
        />
      </div>
      <Table
        // @ts-ignore
        columns={tableCols}
        dataSource={filteredProps}
        rowKey="name"
        loading={isPending}
        pagination={false}
      />
      <FullPagination
        page={page}
        limit={limit}
        total={data.total}
        listLen={data.properties.length}
        onPageChange={onPageChange}
        entity={'properties'}
      />
    </div>
  );
}

export default DistinctEventPropsList;
