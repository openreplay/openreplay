import React, { useEffect, useState } from 'react';
import FilterList from 'Shared/Filters/FilterList';
import { 
  edit,
  updateSeries,
  addSeriesFilterFilter,
  removeSeriesFilterFilter,
  editSeriesFilterFilter,
  editSeriesFilter,
} from 'Duck/customMetrics';
import { connect } from 'react-redux';
import { Button, Icon } from 'UI';
import FilterSelection from 'Shared/Filters/FilterSelection';
import SeriesName from './SeriesName';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';

interface Props {
  seriesIndex: number;
  series: any;
  edit: typeof edit;
  updateSeries: typeof updateSeries;
  onRemoveSeries: (seriesIndex: any) => void;
  canDelete?: boolean; 
  addSeriesFilterFilter: typeof addSeriesFilterFilter;
  editSeriesFilterFilter: typeof editSeriesFilterFilter;
  editSeriesFilter: typeof editSeriesFilter;
  removeSeriesFilterFilter: typeof removeSeriesFilterFilter;
  hideHeader?: boolean;
  emptyMessage?: any;
  observeChanges?: () => void;
}

function FilterSeries(props: Props) {
  const { observeChanges = () => {}, canDelete, hideHeader = false, emptyMessage = 'Add user event or filter to define the series by clicking Add Step.' } = props;
  const [expanded, setExpanded] = useState(true)
  const { series, seriesIndex } = props;

  const onAddFilter = (filter: any) => {
    series.filter.addFilter(filter)
    observeChanges()
  }

  const onUpdateFilter = (filterIndex: any, filter: any) => {
    series.filter.updateFilter(filterIndex, filter)
    observeChanges()
  }

  const onChangeEventsOrder = (e, { name, value }: any) => {
    series.filter.updateKey(name, value)
    observeChanges()
  }

  const onRemoveFilter = (filterIndex: any) => {
    series.filter.removeFilter(filterIndex)
    observeChanges()
  }

  return (
    <div className="border rounded bg-white">
      <div className={cn("border-b px-5 h-12 flex items-center relative", { 'hidden': hideHeader })}>
        <div className="mr-auto">
          <SeriesName seriesIndex={seriesIndex} name={series.name} onUpdate={(name) => series.update('name', name) } />
        </div>
    
        <div className="flex items-center cursor-pointer">
          <div onClick={props.onRemoveSeries} className={cn("ml-3", {'disabled': !canDelete})}>
            <Icon name="trash" size="16" />
          </div>

          <div onClick={() => setExpanded(!expanded)} className="ml-3">
            <Icon name="chevron-down" size="16" />
          </div>
        </div>
      </div>
      { expanded && (
        <>
          <div className="p-5">
            { series.filter.filters.length > 0 ? (
              <FilterList
                filter={series.filter}
                onUpdateFilter={onUpdateFilter}
                onRemoveFilter={onRemoveFilter}
                onChangeEventsOrder={onChangeEventsOrder}
              />
            ): (
              <div className="color-gray-medium">{emptyMessage}</div>
            )}
          </div>
          <div className="border-t h-12 flex items-center">
            <div className="-mx-4 px-6">
              <FilterSelection
                filter={undefined}
                onFilterClick={onAddFilter}
              >
                <Button variant="text-primary" icon="plus">ADD STEP</Button>
              </FilterSelection>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default connect(null, { 
  edit,
  updateSeries,
  addSeriesFilterFilter,
  editSeriesFilterFilter,
  editSeriesFilter,
  removeSeriesFilterFilter,
})(observer(FilterSeries));