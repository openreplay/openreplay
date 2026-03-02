import { useQuery } from '@tanstack/react-query';
import { Table } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { dataManagement, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';
import { TextEllipsis } from 'UI';

import FullPagination from 'Shared/FullPagination';

import { fetchListByProp } from '../Events/api';

function EventsWithProp({ propName }: { propName: string }) {
  const { projectsStore } = useStore();
  const siteId = projectsStore.activeSiteId!;
  const history = useHistory();
  const path = dataManagement.eventsList() + '?event=';
  const onRow = (record: any) => {
    return {
      onClick: () => {
        history.push(withSiteId(path + record.name, siteId));
      },
    };
  };
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
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
    },
    {
      title: t('Display Name'),
      dataIndex: 'displayName',
      key: 'displayName',
      width: '20%',
      sorter: (a: any, b: any) => a.displayName.localeCompare(b.displayName),
      render: (text: string) => (
        <TextEllipsis className="link" maxWidth={'185px'} text={text} />
      ),
    },
    {
      title: t('Description'),
      dataIndex: 'description',
      key: 'description',
      width: '65%',
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
        scroll={{ x: 'max-content' }}
        onRow={onRow}
        rowClassName={'cursor-pointer'}
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
