import React, { useState } from 'react';
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
  const [durationValues, setDurationValues] = useState({ minDuration: 0, maxDuration: 0 });

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

  const onDurationChange = (newValues) => {
    console.log('durationValues', durationValues)
    // setDurationValues({ ...durationValues });
    setDurationValues({ ...durationValues, ...newValues });
  } 

  const handleBlur = (e) => {
    // const { filter, onChange } = props;
    if (filter.type === FilterType.DURATION) {
      const { maxDuration, minDuration, key } = filter;
      if (maxDuration || minDuration) return;
      if (maxDuration !== durationValues.maxDuration || 
          minDuration !== durationValues.minDuration) {
        // onChange(e, { name: 'value', value: [this.state.minDuration, this.state.maxDuration] });
        props.onUpdate({ ...filter, value: [durationValues.minDuration, durationValues.maxDuration] });
      }
    }
  }

  const renderValueFiled = (value, valueIndex) => {
    const showCloseButton = filter.value.length > 1;
    const showOrButton = valueIndex === filter.value.length - 1;
    switch(filter.type) {
      case FilterType.DROPDOWN:
        return (
          <FilterValueDropdown
            value={value}
            filter={filter}
            options={filter.options}
            onChange={(e, { name, value }) => onSelect(e, { value }, valueIndex)}
          />
        )
      case FilterType.ISSUE:
      case FilterType.MULTIPLE_DROPDOWN:
        return (
          <FilterValueDropdown
            multiple={true}
            value={value}
            filter={filter}
            options={filter.options}
            onChange={(e, { name, value }) => onSelect(e, { value }, valueIndex)}
            onAddValue={onAddValue}
            onRemoveValue={() => onRemoveValue(valueIndex)}
            showCloseButton={showCloseButton}
            showOrButton={showOrButton}
          />
        )
      case FilterType.DURATION:
        return (
          <FilterDuration
            onChange={ onDurationChange }
            // onEnterPress={ this.handleClose }
            onBlur={handleBlur}
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
            showCloseButton={showCloseButton}
            showOrButton={showOrButton}
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
    <div className="grid grid-cols-3 gap-3 w-full">
      { filter.type === FilterType.DURATION ? (
          renderValueFiled(filter.value, 0)
      ) : (
        filter.value && filter.value.map((value, valueIndex) => (
          renderValueFiled(value, valueIndex)
        ))
      )}
    </div>
  );
}

export default FilterValue;