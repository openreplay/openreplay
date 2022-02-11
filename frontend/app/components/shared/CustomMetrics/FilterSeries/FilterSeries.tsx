import React, { useState } from 'react';
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
import { IconButton, Icon } from 'UI';
import FilterSelection from '../../Filters/FilterSelection';
import SeriesName from './SeriesName';
import cn from 'classnames';

interface Props {
  seriesIndex: number;
  series: any;
  edit: typeof edit;
  updateSeries: typeof updateSeries;
  onRemoveSeries: (seriesIndex) => void;
  canDelete?: boolean; 
  addSeriesFilterFilter: typeof addSeriesFilterFilter;
  editSeriesFilterFilter: typeof editSeriesFilterFilter;
  editSeriesFilter: typeof editSeriesFilter;
  removeSeriesFilterFilter: typeof removeSeriesFilterFilter;
}

function FilterSeries(props: Props) {
  const { canDelete } = props;
  const [expanded, setExpanded] = useState(true)
  const { series, seriesIndex } = props;

  const onAddFilter = (filter) => {
    filter.value = [""]
    props.addSeriesFilterFilter(seriesIndex, filter);
  }

  const onUpdateFilter = (filterIndex, filter) => {
    props.editSeriesFilterFilter(seriesIndex, filterIndex, filter);
  }

  const onChangeEventsOrder = (e, { name, value }) => {
    props.editSeriesFilter(seriesIndex, { eventsOrder: value });
  }

  const onRemoveFilter = (filterIndex) => {
    props.removeSeriesFilterFilter(seriesIndex, filterIndex);
  }

  return (
    <div className="border rounded bg-white">
      <div className="border-b px-5 h-12 flex items-center relative">
        <div className="mr-auto">
          <SeriesName name={series.name} onUpdate={(name) => props.updateSeries(seriesIndex, { name }) } />
        </div>    
    
        <div className="flex items-center cursor-pointer" >
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
            { series.filter.filters.size > 0 ? (
              <FilterList
                filter={series.filter}
                onUpdateFilter={onUpdateFilter}
                onRemoveFilter={onRemoveFilter}
                onChangeEventsOrder={onChangeEventsOrder}
              />
            ): (
              <div className="color-gray-medium">Add user event or filter to define the series by clicking Add Step.</div>
            )}
          </div>
          <div className="px-5 border-t h-12 flex items-center">
            <FilterSelection
              filter={undefined}
              onFilterClick={onAddFilter}
            >
              <IconButton primaryText label="ADD STEP" icon="plus" />
            </FilterSelection>
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
})(FilterSeries);