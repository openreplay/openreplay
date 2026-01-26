import React from 'react';
import UnifiedFilterList from 'Shared/Filters/FilterList/UnifiedFilterList';
import FilterListHeader from 'Shared/Filters/FilterList/FilterListHeader';
import FilterSelection from 'Shared/Filters/FilterSelection';
import { Dropdown, Button, Divider, Tooltip, TableProps } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import ColumnsModal from 'Components/DataManagement/Activity/ColumnsModal';
import { useModal } from 'App/components/Modal';
import { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import EventDetailsModal from './EventDetailsModal';
import { Link } from 'react-router-dom';
import { dataManagement, withSiteId } from 'App/routes';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import FullPagination from 'Shared/FullPagination';
import AnimatedSVG from 'Shared/AnimatedSVG';
import DndTable from 'Shared/DNDTable';
import { Plus } from 'lucide-react';
import { Filter } from '@/mstore/types/filterConstants';
import SelectDateRange from 'Shared/SelectDateRange/SelectDateRange';
import { formatTimeOrDate } from 'App/date';
import Event, { getSortingKey } from '@/mstore/types/Analytics/Event';
import withPermissions from 'HOCs/withPermissions';
import { getEventIcon } from './getEventIcon';
import NewEventsBadge from './NewEventsBadge';
import { Icon } from 'UI';
import { useHistory } from 'react-router';
import withPageTitle from '@/components/hocs/withPageTitle';

const columnOrderKey = '$__activity_columns_order__$';

function ActivityPage() {
  const history = useHistory();
  const searchParams = new URLSearchParams(window.location.search);
  const eventId = searchParams.get('event_id');
  const { projectsStore, filterStore, analyticsStore, settingsStore } =
    useStore();
  const { timezone } = settingsStore.sessionSettings;

  const siteId = projectsStore.activeSiteId;
  const allFilterOptions = filterStore.getScopedCurrentProjectFilters([
    'events',
  ]);
  const eventOptions = allFilterOptions.filter((i) => i.isEvent);
  const propertyOptions = allFilterOptions.filter((i) => !i.isEvent);
  const dropdownItems = [
    {
      label: 'Show/Hide Columns',
      key: 'edit-columns',
      onClick: () => setTimeout(() => setEditCols(true), 1),
    },
  ];

  const columns: TableProps<Event>['columns'] = [
    {
      title: 'Event Name',
      dataIndex: 'event_name',
      key: 'event_name',
      sorter: true,
      showSorterTooltip: false,
      className: 'cursor-pointer!',
      render: (_: string, row) => (
        <div
          className={'flex items-center gap-2 code-font fill-black color-black'}
        >
          {getEventIcon(row.isAutoCapture, row.event_name)}
          <span>{filterStore.getFilterDisplayName(row.event_name)}</span>
        </div>
      ),
    },
    {
      title: 'Time',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: true,
      showSorterTooltip: false,
      className: 'cursor-pointer!',
      render: (text) => formatTimeOrDate(text, timezone),
    },
    {
      title: 'Distinct ID',
      dataIndex: 'distinct_id',
      key: 'distinct_id',
      sorter: true,
      showSorterTooltip: false,
      className: 'cursor-pointer!',
      render: (text: string, r) => {
        const clickable = r.user_id;
        if (clickable) {
          return (
            <Link
              to={withSiteId(dataManagement.userPage(text), siteId)}
              className={'link'}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {text}
            </Link>
          );
        } else {
          return (
            <Tooltip title="This user was not identified yet">
              <span>{text}</span>
            </Tooltip>
          );
        }
      },
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
      sorter: true,
      showSorterTooltip: false,
      className: 'cursor-pointer!',
    },
    {
      title: 'Environment',
      dataIndex: 'environment',
      key: 'environment',
      sorter: true,
      showSorterTooltip: false,
      className: 'cursor-pointer!',
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
  const eventFiltersWithIndices = appliedFilter.filters
    .map((filter, originalIndex) => ({ filter, originalIndex }))
    .filter(({ filter }) => filter.isEvent);

  const attributeFiltersWithIndices = appliedFilter.filters
    .map((filter, originalIndex) => ({ filter, originalIndex }))
    .filter(({ filter }) => !filter.isEvent);
  const getOriginalEventIndex = (filteredIndex: number) => {
    return eventFiltersWithIndices[filteredIndex]?.originalIndex ?? -1;
  };

  const getOriginalAttributeIndex = (filteredIndex: number) => {
    return attributeFiltersWithIndices[filteredIndex]?.originalIndex ?? -1;
  };
  const onAddFilter = (filter: Filter) => {
    analyticsStore.addFilter(filter);
  };
  const onUpdateFilter = (
    filterIndex: number,
    filter: Filter,
    isEvent: boolean,
  ) => {
    const index = isEvent
      ? getOriginalEventIndex(filterIndex)
      : getOriginalAttributeIndex(filterIndex);
    if (index === -1) return;
    analyticsStore.updateFilter(index, filter);
    analyticsStore.fetchEvents();
  };
  const onRemoveFilter = (filterIndex: number, isEvent: boolean) => {
    const index = isEvent
      ? getOriginalEventIndex(filterIndex)
      : getOriginalAttributeIndex(filterIndex);
    if (index === -1) return;
    analyticsStore.removeFilter(index);
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
    const int = setInterval(() => {
      analyticsStore.checkLatest();
    }, 30000);
    return () => clearInterval(int);
  }, []);

  React.useEffect(() => {
    analyticsStore.fetchEvents();
  }, [analyticsStore.payloadFilters, analyticsStore.payloadFilters.filters]);
  React.useEffect(() => {
    analyticsStore.reset();
  }, [projectsStore.activeSiteId]);

  React.useEffect(() => {
    const onModalClose = () => {
      hideModal();
      history.replace({ search: undefined });
    };
    if (eventId) {
      showModal(
        <EventDetailsModal
          siteId={siteId!}
          event_id={eventId}
          onClose={onModalClose}
        />,
        {
          width: 620,
          right: true,
        },
        () => history.replace({ search: undefined }),
      );
    } else {
      hideModal();
    }
  }, [eventId]);

  const onOrderChange = (newCols) => {
    const order = newCols.map((col) => col.key).join(',');
    localStorage.setItem(columnOrderKey, order);

    setCols(newCols);
  };

  const onPageChange = (page: number) => {
    analyticsStore.editPayload({ page });
  };

  const onItemClick = (ev: { event_id: string }) => {
    if (!siteId) return;
    if (!eventId) {
      history.replace({ search: `?event_id=${ev.event_id}` });
    }
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
        sortBy: 'created_at',
      });
    } else {
      const fieldName = sorter.field === 'environment' ? '$os' : sorter.field;
      analyticsStore.editPayload({
        sortBy: getSortingKey(fieldName),
        sortOrder: sorter.order === 'ascend' ? 'asc' : 'desc',
      });
    }
  };
  return (
    <div
      className={'flex flex-col gap-2'}
      style={{ maxWidth: '1360px', margin: 'auto' }}
    >
      <div className={'flex justify-between items-center'}>
        <h2 className="text-2xl capitalize mr-4">Activity</h2>
        <Button
          type={'text'}
          onClick={analyticsStore.reset}
          disabled={!analyticsStore.payloadFilters.filters.length}
        >
          Clear
        </Button>
      </div>
      <div className={'shadow-sm rounded-lg bg-white p-4 border'}>
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
          handleRemove={(i) => onRemoveFilter(i, true)}
          handleUpdate={(i, filter) => onUpdateFilter(i, filter, true)}
          handleAdd={onAddFilter}
          scope={'events'}
        />

        <Divider className="my-3!" />

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
          handleRemove={(i) => onRemoveFilter(i, false)}
          handleUpdate={(i, filter) => onUpdateFilter(i, filter, false)}
          handleAdd={onAddFilter}
          scope="events"
        />
      </div>
      <div className={'relative'}>
        {editCols ? (
          <ColumnsModal
            columns={cols.filter((col) => col.key !== '$__opts__$')}
            onSelect={onUpdateVisibleCols}
            hiddenCols={hiddenCols}
            onClose={() => setEditCols(false)}
          />
        ) : null}

        <div
          className={
            'bg-white rounded-lg shadow-sm border flex flex-col overflow-hidden'
          }
        >
          <div className={'px-4 py-2 flex items-center gap-2'}>
            <div className={'font-semibold text-lg'}>All Events</div>
            <div className={'ml-auto'} />
            <SelectDateRange
              period={analyticsStore.period}
              onChange={analyticsStore.updateTimestamps}
              right
              isAnt
            />
          </div>
          {total === 0 && !analyticsStore.loading ? (
            <div
              className={'flex items-center justify-center flex-col gap-4 py-8'}
            >
              <AnimatedSVG name={ICONS.NO_RESULTS} size={60} />
              <div className={'flex items-center gap-2'}>
                <div className={'text-lg font-semibold'}>No results in the</div>
                <SelectDateRange
                  period={analyticsStore.period}
                  onChange={analyticsStore.updateTimestamps}
                  right
                  isAnt
                />
              </div>
              <Button
                onClick={analyticsStore.fetchEvents}
                icon={<Icon name={'arrow-repeat'} size={20} />}
              >
                Refresh
              </Button>
            </div>
          ) : (
            <>
              <NewEventsBadge />
              <DndTable
                loading={isPending}
                onRow={(record) => ({
                  onClick: () => onItemClick(record),
                })}
                rowClassName={'cursor-pointer'}
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

export default withPageTitle('Activity')(
  withPermissions(
    ['DATA_MANAGEMENT'],
    '',
    false,
    false,
  )(observer(ActivityPage)),
);
