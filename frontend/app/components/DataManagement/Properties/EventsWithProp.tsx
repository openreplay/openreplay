import React from 'react';
import { Table } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import FullPagination from 'Shared/FullPagination';
import { useStore } from '@/mstore';
import { observer } from 'mobx-react-lite';
import { fetchListByProp } from '../Events/api';
import { TextEllipsis } from 'UI';

function EventsWithProp({ propName }: { propName: string }) {
  const { filterStore } = useStore();
  const limit = 10;
  const [page, setPage] = React.useState(1);
  const onPageChange = (page: number) => {
    setPage(page);
  };
  const { t } = useTranslation();
  const { data = { events: [], total: 0 }, isPending } = useQuery({
    queryKey: ['distinct-event-props-list', propName],
    queryFn: () => fetchListByProp(propName),
  });

  const filteredEvents = React.useMemo(() => {
    const eventsWithDispNames = data.events.map((event) => {
      const eventDispName = filterStore.findEvent({
        name: event.name,
      })?.displayName;
      return {
        ...event,
        displayName: eventDispName || event.name,
      };
    });
    return eventsWithDispNames.slice((page - 1) * limit, page * limit);
  }, [data.events, page]);

  const tableCols = [
    {
      title: t('Event Name'),
      dataIndex: 'name',
      key: 'name',
      width: '15%',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
    },
    {
      title: t('Display Name'),
      dataIndex: 'displayName',
      key: 'displayName',
      width: '20%',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a: any, b: any) => a.displayName.localeCompare(b.displayName),
    },
    {
      title: t('Description'),
      dataIndex: 'description',
      key: 'description',
      width: '65%',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a: any, b: any) => a.description.localeCompare(b.description),
      render: (text: string) => <TextEllipsis text={text} maxWidth={'700px'} />,
    },
  ];
  return (
    <div className="flex flex-col gap-2 bg-white border rounded-lg">
      <div className="px-4 pt-4 font-semibold text-lg">
        {t('Events with this property')}
      </div>
      <Table
        // @ts-ignore
        columns={tableCols}
        dataSource={filteredEvents}
        rowKey="name"
        loading={isPending}
        pagination={false}
      />
      <FullPagination
        page={page}
        limit={limit}
        total={data.total}
        listLen={data.events.length}
        onPageChange={onPageChange}
        entity={'events'}
      />
    </div>
  );
}

export default observer(EventsWithProp);
