import React from 'react';
import UnifiedFilterList from 'Shared/Filters/FilterList/UnifiedFilterList';
import FilterListHeader from 'Shared/Filters/FilterList/FilterListHeader';
import FilterSelection from 'Shared/Filters/FilterSelection';
import { Dropdown, Button, Divider } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import ColumnsModal from 'Components/DataManagement/Activity/ColumnsModal';
import Event from './data/Event';
import { useModal } from 'App/components/Modal';
import EventDetailsModal from './EventDetailsModal';
import { useQuery } from '@tanstack/react-query';
import Select from 'Shared/Select';
import { Link } from 'react-router-dom';
import { dataManagement, withSiteId } from 'App/routes';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import FullPagination from 'Shared/FullPagination';
import AnimatedSVG from 'Shared/AnimatedSVG';
import DndTable from 'Shared/DNDTable';
import { Code, Plus } from 'lucide-react';

const limit = 100;

// TODO: ADD PERMISSION CHECK DATA_MANAGEMENT

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
  page: number,
): Promise<{ list: any[]; total: number }> => {
  const total = 3000;
  return new Promise((resolve) => {
    resolve({ list, total });
  });
};

const columnOrderKey = '$__activity_columns_order__$';

function ActivityPage() {
  const { projectsStore, filterStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const allFilterOptions = filterStore.getCurrentProjectFilters();
  const eventOptions = allFilterOptions.filter((i) => i.isEvent);
  const propertyOptions = allFilterOptions.filter((i) => !i.isEvent);
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
        <div className={'flex items-center gap-2 code-font'}>
          <Code size={16} />
          {row.$_isAutoCapture && <span className={'text-gray-500'}>[a]</span>}
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

  const [page, setPage] = React.useState(1);
  const [cols, setCols] = React.useState(columns);
  const [hiddenCols, setHiddenCols] = React.useState([]);
  const { data, isPending } = useQuery({
    queryKey: ['data', 'events', page],
    queryFn: () => fetcher(page),
    initialData: { list: [], total: 0 },
  });
  const { list, total } = data;
  const appliedFilter = { filters: [] };
  const appliedEvents = appliedFilter.filters.filter(f => f.isEvent)
  const onAddFilter = () => {};
  const onUpdateFilter = () => {};
  const onRemoveFilter = () => {};
  const onChangeEventsOrder = () => {};
  const saveRequestPayloads = () => {};
  const onFilterMove = () => {};
  const [editCols, setEditCols] = React.useState(false);
  const { showModal, hideModal } = useModal();

  React.useEffect(() => {
    if (hiddenCols.length) {
      setCols((cols) =>
        cols.map((col) => ({
          ...col,
          hidden: hiddenCols.includes(col.key),
        })),
      );
    }
  }, [hiddenCols]);
  React.useEffect(() => {
    const savedColumnOrder = localStorage.getItem(columnOrderKey);
    if (savedColumnOrder) {
      const keys = savedColumnOrder.split(',');
      setCols((cols) => {
        return cols.sort((a, b) => {
          return keys.indexOf(a.key) - keys.indexOf(b.key);
        });
      });
    }
  }, []);

  const onOrderChange = (newCols) => {
    const order = newCols.map((col) => col.key).join(',');
    localStorage.setItem(columnOrderKey, order);

    setCols(newCols);
  };

  const onPageChange = (page: number) => {
    setPage(page);
  };

  const onItemClick = (ev: Event) => {
    showModal(<EventDetailsModal ev={ev} onClose={hideModal} />, {
      width: 420,
      right: true,
    });
  };

  const onUpdateVisibleCols = (cols: string[]) => {
    setHiddenCols((_) => {
      return columns
        .map((col) =>
          cols.includes(col.key) || col.key === '$__opts__$' ? null : col.key,
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
      <h2 className="text-2xl capitalize mr-4">Activity</h2>
      <div className={'shadow rounded-lg bg-white p-4 border'}>
        <FilterListHeader
          title="Events"
          showEventsOrder={appliedEvents.length > 0}
          orderProps={appliedFilter}
          onChangeOrder={onChangeEventsOrder}
          filterSelection={
            <FilterSelection
              filters={eventOptions}
              activeFilters={appliedFilter.filters}
              onFilterClick={onAddFilter}
            >
              <Button type="default" size="small">
                <div className="flex items-center gap-1">
                  <Plus size={16} strokeWidth={1} />
                  <span>Add</span>
                </div>
              </Button>
            </FilterSelection>
          }
        />

        <UnifiedFilterList
          title="Events"
          filters={appliedEvents}
          isDraggable={true}
          showIndices={true}
          className="mt-2"
          handleRemove={onRemoveFilter}
          handleUpdate={onUpdateFilter}
          handleAdd={onAddFilter}
          handleMove={onFilterMove}
        />

        <Divider className="my-3" />

        <FilterListHeader
          title="Filters"
          filterSelection={
            <FilterSelection
              filters={propertyOptions}
              activeFilters={appliedFilter.filters}
              onFilterClick={onAddFilter}
            >
              <Button type="default" size="small">
                <div className="flex items-center gap-1">
                  <Plus size={16} strokeWidth={1} />
                  <span>Add</span>
                </div>
              </Button>
            </FilterSelection>
          }
        />

        <UnifiedFilterList
          title="Filters"
          filters={appliedFilter.filters.filter((f) => !f.isEvent)}
          className="mt-2"
          isDraggable={false}
          showIndices={false}
          handleRemove={onRemoveFilter}
          handleUpdate={onUpdateFilter}
          handleAdd={onAddFilter}
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
            'bg-white rounded-lg shadow border flex flex-col overflow-hidden'
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
          {total === 0 ? (
            <div className={'flex items-center justify-center flex-col gap-4'}>
              <AnimatedSVG name={'no-results'} size={56} />
              <div className={'flex items-center gap-2'}>
                <div className={'text-lg font-semibold'}>
                  No results in the{' '}
                </div>
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
              </div>
              <Button type={'text'}>Refresh</Button>
            </div>
          ) : (
            <>
              <DndTable
                loading={isPending}
                onRow={(record) => ({
                  onClick: () => onItemClick(record),
                })}
                dataSource={list}
                pagination={false}
                columns={cols}
                onOrderChange={onOrderChange}
              />
              <FullPagination
                page={page}
                limit={limit}
                total={total}
                listLen={list.length}
                onPageChange={onPageChange}
                entity={'events'}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default observer(ActivityPage);
