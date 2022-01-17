import React from 'react';
import FilterOperator from '../FilterOperator/FilterOperator';
import FilterSelection from '../FilterSelection';
import FilterValue from '../FilterValue';
import { Icon } from 'UI';

interface Props {
  filterIndex: number;
  filter: any; // event/filter
  onUpdate: (filter) => void;
  onRemoveFilter: () => void;
}
function FitlerItem(props: Props) {
  const { filterIndex, filter, onUpdate } = props;

  const replaceFilter = (filter) => {
    onUpdate(filter);
  };

  const onAddValue = () => {
    const newValues = filter.value.concat("")
    onUpdate({ ...filter, value: newValues })
  }

  const onRemoveValue = (valueIndex) => {
    const newValues = filter.value.filter((_, _index) => _index !== valueIndex)
    onUpdate({ ...filter, value: newValues })
  }

  const onSelect = (e, item, valueIndex) => {
    const newValues = filter.value.map((_, _index) => {
      if (_index === valueIndex) {
        return item.value;
      }
      return _;
    })
    onUpdate({ ...filter, value: newValues })
  }

  console.log('filter', filter);

  const onOperatorChange = (e, { name, value }) => {
    onUpdate({ ...filter, operator: value })
  }

  return (
    <div className="flex items-center mb-3">
      <div className="flex items-start mr-auto">
        <div className="mt-1 w-6 h-6 text-xs flex justify-center rounded-full bg-gray-light-shade mr-2">{filterIndex+1}</div>
        <FilterSelection filter={filter} onFilterClick={replaceFilter} />
        <FilterOperator filter={filter} onChange={onOperatorChange} className="mx-2"/>
        <div className="grid grid-cols-3 gap-3">
          {filter.value && filter.value.map((value, valueIndex) => (
            <FilterValue
              showOrButton={valueIndex === filter.value.length - 1}
              key={valueIndex}
              value={value}
              index={valueIndex}
              onAddValue={onAddValue}
              onRemoveValue={() => onRemoveValue(valueIndex)}
              onSelect={(e, item) => onSelect(e, valueIndex, item)}
            />
          ))}
        </div>
      </div>
      <div className="flex">
        <div
          className="cursor-pointer"
          onClick={props.onRemoveFilter}
        > 
          <Icon name="close" size="18" />
        </div>
      </div>
    </div>
  );
}

export default FitlerItem;