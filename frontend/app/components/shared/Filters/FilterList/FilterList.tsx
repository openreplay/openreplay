import React, { useState} from 'react';
import FilterItem from '../FilterItem';

interface Props {
  filters: any[]; // event/filter
  onUpdateFilter: (filterIndex, filter) => void;
  onRemoveFilter: (filterIndex) => void;
}
function FilterList(props: Props) {
  const { filters } = props;

  const onRemoveFilter = (filterIndex) => {
    const newFilters = filters.filter((_filter, i) => {
      return i !== filterIndex;
    });

    props.onRemoveFilter(filterIndex);
  }

  return (
    <div className="flex flex-col">
      {filters.map((filter, filterIndex) => (
        <FilterItem
          filterIndex={filterIndex}
          filter={filter}
          onUpdate={(filter) => props.onUpdateFilter(filterIndex, filter)}
          onRemoveFilter={() => onRemoveFilter(filterIndex) }
        />
      ))}
    </div>
  );
}

export default FilterList;