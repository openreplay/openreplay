import React, { useEffect, useState } from 'react';
import { EventsList, FilterList } from 'Shared/Filters/FilterList';
import SeriesName from './SeriesName';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import ExcludeFilters from './ExcludeFilters';
import { Button, Space } from 'antd';
import { ChevronDown, ChevronUp, Trash } from 'lucide-react';

const FilterCountLabels = observer(
  (props: { filters: any; toggleExpand: any }) => {
    const events = props.filters.filter((i: any) => i && i.isEvent).length;
    const filters = props.filters.filter((i: any) => i && !i.isEvent).length;
    return (
      <div className="flex items-center">
        <Space>
          {events > 0 && (
            <Button
              type="primary"
              ghost
              size="small"
              onClick={props.toggleExpand}
            >
              {`${events} Event${events > 1 ? 's' : ''}`}
            </Button>
          )}

          {filters > 0 && (
            <Button
              type="primary"
              ghost
              size="small"
              onClick={props.toggleExpand}
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
  }) => {
    const onUpdate = (name: any) => {
      props.series.update('name', name);
    };
    return (
      <div
        className={cn('px-4 h-12 flex items-center relative bg-white border-gray-lighter border-t border-l border-r rounded-t-xl', {
          hidden: props.hidden,
          'rounded-b-xl': !props.expanded,
        })}
      >
        <Space className="mr-auto" size={30}>
          <SeriesName
            seriesIndex={props.seriesIndex}
            name={props.series.name}
            onUpdate={onUpdate}
          />
          {!props.expanded && (
            <FilterCountLabels
              filters={props.series.filter.filters}
              toggleExpand={props.toggleExpand}
            />
          )}
        </Space>

        <Space>
          <Button
            onClick={props.onRemove}
            size="small"
            disabled={!props.canDelete}
            icon={<Trash size={14} />}
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
  canExclude?: boolean;
  expandable?: boolean;
}

function FilterSeries(props: Props) {
  const {
    observeChanges = () => {},
    canDelete,
    hideHeader = false,
    emptyMessage = 'Add an event or filter step to define the series.',
    supportsEmpty = true,
    excludeFilterKeys = [],
    canExclude = false,
    expandable = false,
  } = props;
  const [expanded, setExpanded] = useState(hideHeader || !expandable);
  const { series, seriesIndex } = props;
  const [prevLength, setPrevLength] = useState(0);

  useEffect(() => {
    if (
      series.filter.filters.length === 1 &&
      prevLength === 0 &&
      seriesIndex === 0
    ) {
      setExpanded(true);
    }
    setPrevLength(series.filter.filters.length);
  }, [series.filter.filters.length]);

  const onUpdateFilter = (filterIndex: any, filter: any) => {
    series.filter.updateFilter(filterIndex, filter);
    observeChanges();
  };

  const onFilterMove = (newFilters: any) => {
    series.filter.replaceFilters(newFilters.toArray());
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
    series.filter.addFilter(filter);
    observeChanges();
  }

  return (
    <div>
      {canExclude && <ExcludeFilters filter={series.filter} />}

      {!hideHeader && (
        <FilterSeriesHeader
          hidden={hideHeader}
          seriesIndex={seriesIndex}
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
        <EventsList
          filter={series.filter}
          onUpdateFilter={onUpdateFilter}
          onRemoveFilter={onRemoveFilter}
          onChangeEventsOrder={onChangeEventsOrder}
          supportsEmpty={supportsEmpty}
          onFilterMove={onFilterMove}
          excludeFilterKeys={excludeFilterKeys}
          onAddFilter={onAddFilter}
          mergeUp={!hideHeader}
          mergeDown
        />
        <FilterList
          filter={series.filter}
          onUpdateFilter={onUpdateFilter}
          onRemoveFilter={onRemoveFilter}
          onChangeEventsOrder={onChangeEventsOrder}
          supportsEmpty={supportsEmpty}
          onFilterMove={onFilterMove}
          excludeFilterKeys={excludeFilterKeys}
          onAddFilter={onAddFilter}
          mergeUp
        />
        </>
      ) : null}
    </div>
  );
}

export default observer(FilterSeries);
