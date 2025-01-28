import React from 'react';
import { EventsList, FilterList } from 'Shared/Filters/FilterList';
import { Table, Dropdown } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import { numberWithCommas } from 'App/utils';
import { Pagination } from 'UI';
import Event from './data/Event';

function ActivityPage() {
  const [hiddenCols, setHiddenCols] = React.useState([]);
  const appliedFilter = { filters: [] };
  const onAddFilter = () => {};
  const onUpdateFilter = () => {};
  const onRemoveFilter = () => {};
  const onChangeEventsOrder = () => {};
  const saveRequestPayloads = () => {};
  const onFilterMove = () => {};
  const [editCols, setEditCols] = React.useState(false);

  const dropdownItems = [
    {
      label: 'Show/Hide Columns',
      key: 'edit-columns',
      onClick: () => setEditCols(true),
    }
  ]

  const columns = [
    {
      title: 'Event Name',
      dataIndex: 'name',
      key: 'name',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text, row) => (
        <div className={'flex items-center gap-2'}>
          {row.$_isAutoCapture && (
            <span className={'text-gray-500'}>[auto]</span>
          )}
          <span>{row.name}</span>
        </div>
      ),
    },
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a, b) => a.time - b.time,
    },
    {
      title: 'Distinct ID',
      dataIndex: 'userId',
      key: 'userId',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a, b) => a.userId.localeCompare(b.userId),
      render: (text) => <div className={'link'}>{text}</div>,
    },
    {
      title: 'City',
      dataIndex: 'userCity',
      key: 'userCity',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a, b) => a.userCiry.localeCompare(b.userCity),
    },
    {
      title: 'Environment',
      dataIndex: 'userEnvironment',
      key: 'userEnvironment',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a, b) => a.userEnvironment.localeCompare(b.userEnvironment),
    },
    {
      title: (
          <Dropdown menu={{ items: dropdownItems }} trigger={'click'}>
            <div className={'cursor-pointer'}>
              <MoreOutlined />
            </div>
          </Dropdown>
      ),
      dataIndex: '$__opts__$',
      key: '$__opts__$',
      width: 50,
    },
  ];

  const shownCols = columns.map((col) => ({
    ...col,
    hidden: hiddenCols.includes(col.key),
  }));

  const page = 1;
  const limit = 100;
  const total = 3000;
  const testEv = new Event(
    'test ev',
    Date.now(),
    { userId: '123', userCity: 'NY', userEnvironment: 'Mac OS' },
    {},
    false
  );
  const testAutoEv = new Event(
    'test auto ev',
    Date.now(),
    { userId: '123', userCity: 'NY', userEnvironment: 'Mac OS' },
    {},
    true
  );
  const list = [testEv.toData(), testAutoEv.toData()];
  const onPageChange = () => {};
  return (
    <div
      className={'flex flex-col gap-2'}
      style={{ maxWidth: '1360px', margin: 'auto' }}
    >
      <div className={'shadow rounded-xl'}>
        <EventsList
          filter={appliedFilter}
          onAddFilter={onAddFilter}
          onUpdateFilter={onUpdateFilter}
          onRemoveFilter={onRemoveFilter}
          onChangeEventsOrder={onChangeEventsOrder}
          saveRequestPayloads={saveRequestPayloads}
          onFilterMove={onFilterMove}
          mergeDown
          heading={
            <div
              className={
                '-mx-4 px-4 border-b w-full py-2 font-semibold text-lg'
              }
              style={{ width: 'calc(100% + 2rem)' }}
            >
              Activity
            </div>
          }
        />
        <FilterList
          mergeUp
          filter={appliedFilter}
          onAddFilter={onAddFilter}
          onUpdateFilter={onUpdateFilter}
          onRemoveFilter={onRemoveFilter}
          onChangeEventsOrder={onChangeEventsOrder}
          saveRequestPayloads={saveRequestPayloads}
          onFilterMove={onFilterMove}
        />
      </div>
      <div
        className={
          'bg-white rounded-xl shadow border flex flex-col overflow-hidden'
        }
      >
        <div className={'px-4 py-2 font-semibold text-lg'}>
          All users activity
        </div>
        <Table dataSource={list} pagination={false} columns={shownCols} />
        <div className="flex items-center justify-between px-4 py-3 shadow-sm w-full bg-white rounded-lg mt-2">
          <div>
            {'Showing '}
            <span className="font-medium">{(page - 1) * limit + 1}</span>
            {' to '}
            <span className="font-medium">
              {(page - 1) * limit + list.length}
            </span>
            {' of '}
            <span className="font-medium">{numberWithCommas(total)}</span>
            {' events.'}
          </div>
          <Pagination
            page={page}
            total={total}
            onPageChange={onPageChange}
            limit={limit}
            debounceRequest={500}
          />
        </div>
      </div>
    </div>
  );
}

export default ActivityPage;
