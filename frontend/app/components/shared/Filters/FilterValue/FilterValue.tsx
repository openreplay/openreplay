import React from 'react';
import FilterAutoComplete from '../FilterAutoComplete';
import { FilterType } from 'Types/filter/filterType';
import FilterValueDropdown from '../FilterValueDropdown';
import FilterDuration from '../FilterDuration';

interface Props {
  filter: any;
  onUpdate: (filter) => void;
}
function FilterValue(props: Props) {
  const { filter } = props;

  const onAddValue = () => {
    const newValues = filter.value.concat("")
    props.onUpdate({ ...filter, value: newValues })
  }

  const onRemoveValue = (valueIndex) => {
    const newValues = filter.value.filter((_, _index) => _index !== valueIndex)
    props.onUpdate({ ...filter, value: newValues })
  }

  const onSelect = (e, item, valueIndex) => {
    const newValues = filter.value.map((_, _index) => {
      if (_index === valueIndex) {
        return item.value;
      }
      return _;
    })
    props.onUpdate({ ...filter, value: newValues })
  }

  const renderValueFiled = (value, valueIndex) => {
    switch(filter.type) {
      case FilterType.ISSUE:
        return (
          <FilterValueDropdown
            value={value}
            filter={filter}
            options={filter.options}
            onChange={(e, { name, value }) => onSelect(e, { value }, valueIndex)}
          />
        )
      case FilterType.DURATION:
        return (
          <FilterDuration
            // onChange={ this.onDurationChange }
            // onEnterPress={ this.handleClose }
            // onBlur={this.handleClose}
            minDuration={ filter.value[0] }
            maxDuration={ filter.value[1] }
          />
        )
      case FilterType.NUMBER:
        return (
          <input
            className="w-full px-2 py-1 text-sm leading-tight text-gray-700 rounded-lg"
            type="number"
            name={`${filter.key}-${valueIndex}`}
            value={value}
            onChange={(e) => onSelect(e, { value: e.target.value }, valueIndex)}
          />
        )
      case FilterType.MULTIPLE:
        return (
          <FilterAutoComplete
            value={value}
            showCloseButton={filter.value.length > 1}
            showOrButton={valueIndex === filter.value.length - 1}
            onAddValue={onAddValue}
            onRemoveValue={() => onRemoveValue(valueIndex)}
            method={'GET'}
            endpoint='/events/search'
            params={{ type: filter.key  }}
            headerText={''}
            // placeholder={''}
            onSelect={(e, item) => onSelect(e, item, valueIndex)}
          />
        )
    }
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {filter.value && filter.value.map((value, valueIndex) => (
        renderValueFiled(value, valueIndex)
      ))}
    </div>
  );
}

export default FilterValue;