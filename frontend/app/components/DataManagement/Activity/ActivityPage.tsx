import React from 'react';
import UnifiedFilterList from 'Shared/Filters/FilterList/UnifiedFilterList';
import FilterListHeader from 'Shared/Filters/FilterList/FilterListHeader';
import FilterSelection from 'Shared/Filters/FilterSelection';
import { Dropdown, Button, Divider } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import ColumnsModal from 'Components/DataManagement/Activity/ColumnsModal';
import { useModal } from 'App/components/Modal';
import EventDetailsModal from './EventDetailsModal';
import Select from 'Shared/Select';
import { Link } from 'react-router-dom';
import { dataManagement, withSiteId } from 'App/routes';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import FullPagination from 'Shared/FullPagination';
import AnimatedSVG from 'Shared/AnimatedSVG';
import DndTable from 'Shared/DNDTable';
import { Code, Plus } from 'lucide-react';
import { Filter } from '@/mstore/types/filterConstants';
import SelectDateRange from 'Shared/SelectDateRange/SelectDateRange';
import { resentOrDate } from 'App/date';
import { getSortingKey } from '@/mstore/types/Analytics/Event';

// TODO: ADD PERMISSION CHECK DATA_MANAGEMENT

const columnOrderKey = '$__activity_columns_order__$';

function ActivityPage() {
  const { projectsStore, filterStore, analyticsStore } = useStore();
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
      dataIndex: 'event_name',
      key: 'event_name',
      showSorterTooltip: { target: 'full-header' },
      sorter: true,
      render: (text, row) => (
        <div className={'flex items-center gap-2 code-font'}>
          <Code size={16} />
          {row.isAutoCapture && <span className={'text-gray-500'}>[a]</span>}
          <span>{row.event_name}</span>
        </div>
      ),
    },
    {
      title: 'Time',
      dataIndex: 'created_at',
      key: 'created_at',
      showSorterTooltip: { target: 'full-header' },
      sorter: true,
      render: (text) => resentOrDate(text),
    },
    {
      title: 'Distinct ID',
      dataIndex: 'distinct_id',
      key: 'distinct_id',
      showSorterTooltip: { target: 'full-header' },
      sorter: true,
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
      dataIndex: 'city',
      key: 'city',
      showSorterTooltip: { target: 'full-header' },
      sorter: true,
    },
    {
      title: 'Environment',
      dataIndex: 'environment',
      key: 'environment',
      showSorterTooltip: { target: 'full-header' },
      sorter: true,
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

  const page = analyticsStore.payloadFilters.page;
  const list = analyticsStore.events.events;
  const total = analyticsStore.events.total;
  const limit = analyticsStore.payloadFilters.limit;
  const isPending = analyticsStore.loading;
  const [cols, setCols] = React.useState(columns);
  const [hiddenCols, setHiddenCols] = React.useState([]);

  const appliedFilter = analyticsStore.payloadFilters;
  const appliedEvents = appliedFilter.filters.filter((f) => f.isEvent);
  const activeFilters = appliedFilter.filters.map((f) => f.name);
  const onAddFilter = (filter: Filter) => {
    analyticsStore.addFilter(filter);
  };
  const onUpdateFilter = (filterIndex: number, filter: Filter) => {
    analyticsStore.updateFilter(filterIndex, filter);
    analyticsStore.fetchEvents();
  };
  const onRemoveFilter = (filterIndex: number) => {
    analyticsStore.removeFilter(filterIndex);
    analyticsStore.fetchEvents();
  };

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

  React.useEffect(() => {
    analyticsStore.fetchEvents();
  }, [analyticsStore.payloadFilters, analyticsStore.payloadFilters.filters]);

  const onOrderChange = (newCols) => {
    const order = newCols.map((col) => col.key).join(',');
    localStorage.setItem(columnOrderKey, order);

    setCols(newCols);
  };

  const onPageChange = (page: number) => {
    analyticsStore.editPayload({ page });
  };

  const onItemClick = (ev: { event_id: string }) => {
    showModal(
      <EventDetailsModal
        siteId={siteId!}
        event_id={ev.event_id}
        onClose={hideModal}
      />,
      {
        width: 620,
        right: true,
      },
    );
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

  const onColumnSort = (sorter: {
    field: string;
    order: 'ascend' | 'descend';
  }) => {
    if (!sorter.field) {
      analyticsStore.editPayload({
        sortOrder: 'desc',
        sortBy: 'time',
      });
    } else {
      analyticsStore.editPayload({
        sortBy: getSortingKey(sorter.field),
        sortOrder: sorter.order === 'ascend' ? 'asc' : 'desc',
      });
    }
  };

  // const onSortOrderChange = (sortOrder: 'asc' | 'desc' | 'time-asc' | 'time-desc') => {
  //   if (sortOrder.startsWith('time-')) {
  //     analyticsStore.editPayload({
  //       sortOrder: sortOrder.endsWith('asc') ? 'asc' : 'desc',
  //       sortBy: 'time',
  //     });
  //   } else {
  //     analyticsStore.editPayload({
  //       sortOrder,
  //       sortBy: 'time',
  //     });
  //   }
  // };
  // const timeSortOptions =
  //   analyticsStore.payloadFilters.sortBy !== 'time'
  //     ? [
  //         {
  //           label:
  //             columns.find(
  //               (c) => c.key === analyticsStore.payloadFilters.sortBy,
  //             )?.title ?? 'Custom',
  //           value: 'desc',
  //         },
  //         {
  //           label:
  //             columns.find(
  //               (c) => c.key === analyticsStore.payloadFilters.sortBy,
  //             )?.title ?? 'Custom',
  //           value: 'asc',
  //         },
  //         { label: 'Newest', value: 'time-desc' },
  //         { label: 'Oldest', value: 'time-asc' },
  //       ]
  //     : [
  //         { label: 'Newest', value: 'desc' },
  //         { label: 'Oldest', value: 'asc' },
  //       ];
  // const timeSortDefault =
  //   analyticsStore.payloadFilters.sortBy !== 'time' ? 'custom' : 'desc';

  const sortedBy = columns.find(
    (c) => c.key === analyticsStore.payloadFilters.sortBy,
  )?.title;
  const sortedAs =
    analyticsStore.payloadFilters.sortOrder === 'asc'
      ? 'ascending'
      : 'descending';

  const sortStr =
    analyticsStore.payloadFilters.sortBy === 'time'
      ? analyticsStore.payloadFilters.sortOrder === 'asc'
        ? 'Oldest'
        : 'Newest'
      : `${sortedBy} (${sortedAs})`;
  const sortDisabled = analyticsStore.payloadFilters.sortBy !== 'time';
  const onQuickSort = () => {
    const newSortOrder = analyticsStore.payloadFilters.sortOrder === 'asc' ? 'desc' : 'asc';
    analyticsStore.editPayload({
      sortBy: 'time',
      sortOrder: newSortOrder,
    });
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
          orderProps={appliedFilter}
          filterSelection={
            <FilterSelection
              filters={eventOptions}
              activeFilters={activeFilters}
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
        />

        <Divider className="my-3" />

        <FilterListHeader
          title="Filters"
          filterSelection={
            <FilterSelection
              filters={propertyOptions}
              activeFilters={activeFilters}
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
              columns={cols.filter((col) => col.key !== '$__opts__$')}
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
            <Button onClick={onQuickSort} disabled={sortDisabled}>{sortStr}</Button>
            <SelectDateRange
              period={analyticsStore.period}
              onChange={analyticsStore.updateTimestamps}
              right
            />
            {/* <Select
              options={timeSortOptions}
              defaultValue={timeSortDefault}
              value={analyticsStore.payloadFilters.sortOrder}
              plain
              onChange={({ value }) => {
                onSortOrderChange(value.value);
              }}
            /> */}
          </div>
          {total === 0 ? (
            <div
              className={'flex items-center justify-center flex-col gap-4 py-8'}
            >
              <AnimatedSVG name={'no-results'} size={56} />
              <div className={'flex items-center gap-2'}>
                <div className={'text-lg font-semibold'}>No results in the</div>
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
              <Button type={'text'} onClick={analyticsStore.fetchEvents}>
                Refresh
              </Button>
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
                onChange={(a1, a2, sorter) => {
                  onColumnSort(sorter);
                }}
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
