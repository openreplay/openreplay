import React from 'react';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import { Button, Divider, Space, Card } from 'antd';
import { ChevronDown, ChevronUp, Trash, Plus } from 'lucide-react';
import SeriesName from './SeriesName';
import { useStore } from '@/mstore';
import { Filter } from '@/mstore/types/filterConstants';
import FilterSelection from 'Shared/Filters/FilterSelection';
import FilterListHeader from 'Shared/Filters/FilterList/FilterListHeader';
import UnifiedFilterList from 'Shared/Filters/FilterList/UnifiedFilterList';
import IFilterSeries from '@/mstore/types/filterSeries';
import FilterItem from '@/mstore/types/filterItem';
import { toast } from 'react-toastify';

const FilterCountLabels = observer(
  (props: { filters: any; toggleExpand: any }) => {
    const events = props.filters.filter((i: any) => i && i.isEvent).length;
    const filters = props.filters.filter((i: any) => i && !i.isEvent).length;
    return (
      <div className="flex items-center">
        <Space>
          {events > 0 && (
            <Button
              type="text"
              size="small"
              onClick={props.toggleExpand}
              className="btn-series-event-count"
            >
              {`${events} Event${events > 1 ? 's' : ''}`}
            </Button>
          )}

          {filters > 0 && (
            <Button
              type="text"
              size="small"
              onClick={props.toggleExpand}
              className="btn-series-filter-count"
            >
              {`${filters} Filter${filters > 1 ? 's' : ''}`}
            </Button>
          )}
        </Space>
      </div>
    );
  },
);

const FilterSeriesHeader = observer(
  (props: {
    expanded: boolean;
    hidden: boolean;
    seriesIndex: number;
    series: any;
    onRemove: (seriesIndex: any) => void;
    canDelete: boolean | undefined;
    toggleExpand: () => void;
    onChange: () => void;
    seriesNames: string[];
  }) => {
    const onUpdate = (name: any) => {
      if (props.seriesNames.includes(name)) {
        toast.warn('Series name must be unique');
        return false;
      }
      props.series.update('name', name);
      props.onChange();
      return true;
    };
    return (
      <div
        className={cn('flex items-center relative bg-white', {
          hidden: props.hidden,
        })}
      >
        <Space className="mr-auto" size={30}>
          <SeriesName
            seriesIndex={props.seriesIndex}
            name={props.series.name}
            onUpdate={onUpdate}
            onChange={() => null}
          />
        </Space>

        <Space>
          {!props.expanded && (
            <FilterCountLabels
              filters={props.series.filter.filters}
              toggleExpand={props.toggleExpand}
            />
          )}
          <Button
            onClick={props.onRemove}
            size="small"
            disabled={!props.canDelete}
            icon={<Trash size={14} />}
            type="text"
            className={cn('btn-delete-series', 'disabled:hidden')}
          />
          <Button
            onClick={props.toggleExpand}
            size="small"
            icon={
              props.expanded ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )
            }
            type="text"
            className="btn-toggle-series"
          />
        </Space>
      </div>
    );
  },
);

interface Props {
  seriesIndex: number;
  series: IFilterSeries;
  onRemoveSeries: (seriesIndex: any) => void;
  canDelete?: boolean;
  supportsEmpty?: boolean;
  hideHeader?: boolean;
  emptyMessage?: any;
  observeChanges?: () => void;
  excludeFilterKeys?: Array<string>;
  excludeCategory?: string[];
  canExclude?: boolean;
  expandable?: boolean;
  isHeatmap?: boolean;
  removeEvents?: boolean;
  collapseState: boolean;
  excludeEventOrder?: boolean;
  onToggleCollapse: () => void;
  seriesNames?: string[];
}

function FilterSeries(props: Props) {
  const {
    observeChanges = () => {},
    canDelete,
    hideHeader = false,
    canExclude = false,
    expandable = false,
    isHeatmap,
    removeEvents,
    collapseState,
    onToggleCollapse,
    series,
    seriesIndex,
    onRemoveSeries,
    seriesNames = [],
    excludeEventOrder,
  } = props;

  const { filterStore } = useStore();
  const expanded = isHeatmap || !collapseState;
  const setExpanded = onToggleCollapse;

  // preserve original indices
  const indexedFilters = series.filter.filters.map((f, i) => ({
    ...f,
    originalIndex: i,
  }));
  const actualEvents = indexedFilters.filter((f) => f.isEvent);
  const actualProperties = indexedFilters.filter((f) => !f.isEvent);

  const allFilterOptions: Filter[] = filterStore.getCurrentProjectFilters();
  const eventOptions: Filter[] = allFilterOptions.filter((i) => i.isEvent);
  const propertyOptions: Filter[] = allFilterOptions.filter((i) => !i.isEvent);

  const onUpdateFilter = (filterIndex: number, filter: FilterItem) => {
    series.filter.updateFilter(filterIndex, filter);
    observeChanges();
  };

  const onFilterMove = (draggedIndex: number, newPosition: number) => {
    series.filter.moveFilter(draggedIndex, newPosition);
    observeChanges();
  };

  const onChangeEventsOrder = (_: any, { name, value }: any) => {
    series.filter.updateKey(name, value);
    observeChanges();
  };

  const onRemoveFilter = (filterIndex: number) => {
    series.filter.removeFilter(filterIndex);
    observeChanges();
  };

  const onAddFilter = (filter: Filter) => {
    filter.filters = [];
    series.filter.addFilter(filter);
    observeChanges();
  };

  const disableEvents = series.maxEvents
    ? actualEvents.length >= series.maxEvents
    : false;


  const activeFilters = indexedFilters.map((f) => f.name);

  const showEventsOrder = actualEvents.length > 0 && !excludeEventOrder;
  return (
    <Card
      size="small"
      className="rounded-lg"
      classNames={{
        body: `${expanded ? 'p-4!' : 'p-0!'}`,
        header: 'px-4! py-2!',
      }}
      extra={
        !hideHeader && expandable ? (
          <Space
            className="justify-between w-full py-2 cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            <div>
              {!expanded && (
                <FilterCountLabels
                  filters={series.filter.filters}
                  toggleExpand={() => setExpanded(!expanded)}
                />
              )}
            </div>
            <Button
              size="small"
              icon={
                expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />
              }
            />
          </Space>
        ) : null
      }
      title={
        !hideHeader ? (
          <FilterSeriesHeader
            hidden={hideHeader}
            seriesIndex={seriesIndex}
            onChange={observeChanges}
            series={series}
            onRemove={onRemoveSeries}
            canDelete={canDelete}
            seriesNames={seriesNames}
            expanded={expanded}
            toggleExpand={() => setExpanded(!expanded)}
          />
        ) : null
      }
    >
      {expanded && (
        <>
          {removeEvents ? null : (
            <>
              <FilterListHeader
                title="Events"
                showEventsOrder={showEventsOrder}
                orderProps={{
                  eventsOrder: series.filter.eventsOrder,
                  eventsOrderSupport: ['then', 'and', 'or'],
                }}
                onChangeOrder={onChangeEventsOrder}
                filterSelection={
                  <FilterSelection
                    type="Events"
                    disabled={disableEvents}
                    activeFilters={activeFilters}
                    filters={eventOptions}
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
                filters={actualEvents}
                isDraggable={true}
                showIndices={true}
                className="mt-2"
                handleRemove={
                  disableEvents
                    ? undefined
                    : (idx) => onRemoveFilter(actualEvents[idx].originalIndex)
                }
                handleUpdate={(idx, filter) =>
                  onUpdateFilter(actualEvents[idx].originalIndex, filter)
                }
                handleAdd={onAddFilter}
                handleMove={(draggedIdx, newPos) => {
                  const dragged = actualEvents[draggedIdx];
                  const target = actualEvents[newPos];
                  onFilterMove(dragged.originalIndex, target.originalIndex);
                }}
              />

              <Divider className="my-2" />
            </>
          )}

          <FilterListHeader
            title="Filters"
            showEventsOrder={actualProperties.length > 0}
            filterSelection={
              <FilterSelection
                type="Filters"
                filters={propertyOptions}
                onFilterClick={onAddFilter}
                activeFilters={activeFilters}
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
            filters={actualProperties}
            isDraggable={false}
            showIndices={false}
            className="mt-2"
            isHeatmap={isHeatmap}
            handleRemove={(idx) =>
              onRemoveFilter(actualProperties[idx].originalIndex)
            }
            handleUpdate={(idx, filter) =>
              onUpdateFilter(actualProperties[idx].originalIndex, filter)
            }
            handleAdd={onAddFilter}
            handleMove={onFilterMove}
          />
        </>
      )}
    </Card>
  );
}

export default observer(FilterSeries);
