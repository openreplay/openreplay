import React from 'react';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import { Button, Divider, Space } from 'antd';
import { ChevronDown, ChevronUp, Trash } from 'lucide-react';
import ExcludeFilters from './ExcludeFilters';
import SeriesName from './SeriesName';
import FilterListHeader from 'Shared/Filters/FilterList/FilterListHeader';
import FilterSelection from 'Shared/Filters/FilterSelection';
import { Filter } from '@/mstore/types/filterConstants';
import { Plus } from '.store/lucide-react-virtual-9282d60eb0/package';
import UnifiedFilterList from 'Shared/Filters/FilterList/UnifiedFilterList';
import { useStore } from '@/mstore';

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
  }
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
  }) => {
    const onUpdate = (name: any) => {
      props.series.update('name', name);
      props.onChange();
    };
    return (
      <div
        className={cn(
          'px-4 ps-2  h-12 flex items-center relative bg-white border-gray-lighter border-t border-l border-r rounded-t-xl',
          {
            hidden: props.hidden,
            'rounded-b-xl': !props.expanded
          }
        )}
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
  }
);

interface Props {
  seriesIndex: number;
  series: any;
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
  onToggleCollapse: () => void;
}

function FilterSeries(props: Props) {
  const {
    observeChanges = () => {
    },
    canDelete,
    hideHeader = false,
    emptyMessage = 'Add an event or filter step to define the series.',
    supportsEmpty = true,
    excludeFilterKeys = [],
    canExclude = false,
    expandable = false,
    isHeatmap,
    removeEvents,
    collapseState,
    onToggleCollapse,
    excludeCategory
  } = props;
  const { filterStore } = useStore();
  const expanded = isHeatmap || !collapseState;
  const setExpanded = onToggleCollapse;
  const { series, seriesIndex } = props;

  const allFilterOptions: Filter[] = filterStore.getCurrentProjectFilters();
  const eventOptions: Filter[] = allFilterOptions.filter((i) => i.isEvent);
  const propertyOptions: Filter[] = allFilterOptions.filter((i) => !i.isEvent);

  const onUpdateFilter = (filterIndex: any, filter: any) => {
    series.filter.updateFilter(filterIndex, filter);
    observeChanges();
  };

  const onFilterMove = (newFilters: any) => {
    series.filter.replaceFilters(newFilters);
    observeChanges();
  };

  const onChangeEventsOrder = (_: any, { name, value }: any) => {
    series.filter.updateKey(name, value);
    observeChanges();
  };

  const onRemoveFilter = (filterIndex: any) => {
    series.filter.removeFilter(filterIndex);
    observeChanges();
  };

  const onAddFilter = (filter: any) => {
    filter.autoOpen = true;
    series.filter.addFilter(filter);
    observeChanges();
  };

  console.log('series.filter.filters', series.filter.filters);

  return (
    <div>
      {canExclude && <ExcludeFilters filter={series.filter} />}

      {!hideHeader && (
        <FilterSeriesHeader
          hidden={hideHeader}
          seriesIndex={seriesIndex}
          onChange={observeChanges}
          series={series}
          onRemove={props.onRemoveSeries}
          canDelete={canDelete}
          expanded={expanded}
          toggleExpand={() => setExpanded(!expanded)}
        />
      )}

      {!hideHeader && expandable && (
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
      )}

      {expanded ? (
        <>
          {removeEvents ? null : (
            <div className="bg-white rounded-b-xl border p-4">
              <FilterListHeader
                title={'Events'}
                showEventsOrder={series.filter.filters.filter((f: any) => f.isEvent).length > 0}
                orderProps={{
                  eventsOrder: series.filter.eventsOrder,
                  eventsOrderSupport: ['then', 'and', 'or']
                }}
                onChangeOrder={onChangeEventsOrder}
                filterSelection={
                  <FilterSelection
                    filters={eventOptions}
                    onFilterClick={(newFilter: Filter) => {
                      onAddFilter(newFilter);
                    }}
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
                filters={series.filter.filters.filter((f: any) => f.isEvent)}
                isDraggable={true}
                showIndices={true}
                className="mt-2"
                handleRemove={onRemoveFilter}
                handleUpdate={onUpdateFilter}
                handleAdd={onAddFilter}
                handleMove={onFilterMove}
              />

              <Divider className="my-2" />

              <FilterListHeader
                title={'Filters'}
                showEventsOrder={series.filter.filters.map((f: any) => !f.isEvent).length > 0}
                filterSelection={
                  <FilterSelection
                    filters={propertyOptions}
                    onFilterClick={(newFilter: Filter) => {
                      onAddFilter(newFilter);
                    }}
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
                filters={series.filter.filters.filter((f: any) => !f.isEvent)}
                isDraggable={false}
                showIndices={false}
                className="mt-2"
                handleRemove={onRemoveFilter}
                handleUpdate={onUpdateFilter}
                handleAdd={onAddFilter}
                handleMove={onFilterMove}
              />
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

export default observer(FilterSeries);
