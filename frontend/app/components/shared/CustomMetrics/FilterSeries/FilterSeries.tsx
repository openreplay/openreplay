import React, { useState } from 'react';
import FilterList from 'Shared/Filters/FilterList';
import { edit, updateSeries } from 'Duck/customMetrics';
import { connect } from 'react-redux';
import { IconButton, Button, Icon } from 'UI';
import FilterSelection from '../../Filters/FilterSelection';

interface Props {
  seriesIndex: number;
  series: any;
  edit: typeof edit;
  updateSeries: typeof updateSeries;
  onRemoveSeries: (seriesIndex) => void;
}

function FilterSeries(props: Props) {
  const { series, seriesIndex } = props;

  const onAddFilter = (filter) => {
    filter.value = [""]
    const newFilters = series.filter.filters.concat(filter);
    props.updateSeries(seriesIndex, {
      ...series,
      filter: {
        ...series.filter,
        filters: newFilters,
      }
    });
  }

  const onUpdateFilter = (filterIndex, filter) => {
    const newFilters = series.filter.filters.map((_filter, i) => {
      if (i === filterIndex) {
        return filter;
      } else {
        return _filter;
      }
    });

    props.updateSeries(seriesIndex, {
      ...series.toData(),
      filter: {
        ...series.filter,
        filters: newFilters,
      }
    });
  }

  const onRemoveFilter = (filterIndex) => {
    const newFilters = series.filter.filters.filter((_filter, i) => {
      return i !== filterIndex;
    });

    props.updateSeries(seriesIndex, {
      ...series,
      filter: {
        ...series.filter,
        filters: newFilters,
      }
    });
  }

  return (
    <div className="border rounded bg-white">
      <div className="border-b px-5 h-12 flex items-center">
        <span className="mr-auto">{ series.name }</span>
        <div className="flex items-center cursor-pointer" onClick={props.onRemoveSeries}>
          <Icon name="trash" size="16" />
        </div>
      </div>
      <div className="p-5">
        { series.filter.filters.size > 0 ? (
          <FilterList
            filters={series.filter.filters.toJS()}
            onUpdateFilter={onUpdateFilter}
            onRemoveFilter={onRemoveFilter}
          />
        ): (
          <div>Add user event or filter to build the series.</div>
        )}
      </div>
      <div className="px-5 border-t h-12 flex items-center">
        <FilterSelection
          filter={undefined}
          onFilterClick={onAddFilter}
        >
          {/* <Button className="flex items-center">
            <Icon name="plus" size="16" />
            <span>Add Step</span>
          </Button> */}
          <IconButton primaryText label="ADD STEP" icon="plus" />
        </FilterSelection>
      </div>
    </div>
  );
}

export default connect(null, { edit, updateSeries })(FilterSeries);