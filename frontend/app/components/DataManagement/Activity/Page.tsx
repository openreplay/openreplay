import React from 'react';
import { EventsList, FilterList } from 'Shared/Filters/FilterList';
import { Table, Dropdown } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import { numberWithCommas } from 'App/utils';
import { Pagination } from 'UI';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import ColumnsModal from 'Components/DataManagement/Activity/ColumnsModal';
import Event from './data/Event';
import { useModal } from 'App/components/Modal';
import EventDetailsModal from './EventDetailsModal';
import { useQuery } from '@tanstack/react-query';
import Select from 'Shared/Select';
import { Link } from 'react-router-dom';
import { dataManagement, withSiteId } from 'App/routes'
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';

const limit = 100;

const testEv = new Event({
  name: 'test ev #',
  time: Date.now(),
  defaultFields: {
    userId: '123',
    userLocation: 'NY',
    userEnvironment: 'Mac OS',
  },
  customFields: {},
  isAutoCapture: false,
  sessionId: '123123',
  displayName: 'Test Event',
  description: 'This is A test Event',
  monthQuery: 100,
  monthVolume: 1000,
});
const testAutoEv = new Event({
  name: 'auto test ev',
  time: Date.now(),
  defaultFields: {
    userId: '123',
    userLocation: 'NY',
    userEnvironment: 'Mac OS',
  },
  customFields: {},
  isAutoCapture: true,
  sessionId: '123123',
  displayName: 'Test Auto Event',
  description: 'This is A test Auto Event',
  monthQuery: 100,
  monthVolume: 1000,
});
export const list = [testEv.toData(), testAutoEv.toData()];

const fetcher = async (
  page: number
): Promise<{ list: any[]; total: number }> => {
  const total = 3000;
  return new Promise((resolve) => {
    resolve({ list, total });
  });
};

function ActivityPage() {
  const { projectsStore } = useStore()
  const siteId = projectsStore.activeSiteId;

  const [page, setPage] = React.useState(1);
  const [hiddenCols, setHiddenCols] = React.useState([]);
  const { data, isPending } = useQuery({
    queryKey: ['data', 'events', page],
    queryFn: () => fetcher(page),
    initialData: { list: [], total: 0 },
  });
  const { list, total } = data;
  const appliedFilter = { filters: [] };
  const onAddFilter = () => {};
  const onUpdateFilter = () => {};
  const onRemoveFilter = () => {};
  const onChangeEventsOrder = () => {};
  const saveRequestPayloads = () => {};
  const onFilterMove = () => {};
  const [editCols, setEditCols] = React.useState(false);
  const { showModal, hideModal } = useModal();

  const dropdownItems = [
    {
      label: 'Show/Hide Columns',
      key: 'edit-columns',
      onClick: () => setTimeout(() => setEditCols(true), 1),
    },
  ];

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
      render: (text) => (
        <Link
          to={withSiteId(dataManagement.userPage(text), siteId)}
          className={'link'}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {text}
        </Link>
      ),
    },
    {
      title: 'City',
      dataIndex: 'userLocation',
      key: 'userLocation',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a, b) => a.userLocation.localeCompare(b.userLocation),
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
        <Dropdown
          menu={{ items: dropdownItems }}
          trigger={'click'}
          placement={'bottomRight'}
        >
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



  const onPageChange = (page: number) => {
    setPage(page);
  };

  const onItemClick = (ev: Event) => {
    showModal(<EventDetailsModal ev={ev} onClose={hideModal} />, {
      width: 420,
      right: true,
    });
  };

  const shownCols = columns.map((col) => ({
    ...col,
    hidden: hiddenCols.includes(col.key),
  }));
  const onUpdateVisibleCols = (cols: string[]) => {
    setHiddenCols((_) => {
      return columns
        .map((col) =>
          cols.includes(col.key) || col.key === '$__opts__$' ? null : col.key
        )
        .filter(Boolean);
    });
    setEditCols(false);
  };
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
      <div className={'relative'}>
        {editCols ? (
          <OutsideClickDetectingDiv onClickOutside={() => setEditCols(false)}>
            <ColumnsModal
              columns={shownCols.filter((col) => col.key !== '$__opts__$')}
              onSelect={onUpdateVisibleCols}
              hiddenCols={hiddenCols}
            />
          </OutsideClickDetectingDiv>
        ) : null}

        <div
          className={
            'bg-white rounded-xl shadow border flex flex-col overflow-hidden'
          }
        >
          <div className={'px-4 py-2 flex items-center gap-2'}>
            <div className={'font-semibold text-lg'}>All users activity</div>
            <div className={'ml-auto'} />
            <Select
              options={[
                { label: 'Past 24 Hours', value: 'DESC' },
                { label: 'Weekly', value: 'ASC' },
                { label: 'Other', value: 'Stuff' },
              ]}
              defaultValue={'DESC'}
              plain
              onChange={({ value }) => {
                console.log(value);
              }}
            />
            <Select
              options={[
                { label: 'Newest', value: 'DESC' },
                { label: 'Oldest', value: 'ASC' },
              ]}
              defaultValue={'DESC'}
              plain
              onChange={({ value }) => {
                console.log(value);
              }}
            />
          </div>
          <Table
            loading={isPending}
            onRow={(record) => ({
              onClick: () => onItemClick(record),
            })}
            dataSource={list}
            pagination={false}
            columns={shownCols}
          />
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
    </div>
  );
}

export default observer(ActivityPage);
