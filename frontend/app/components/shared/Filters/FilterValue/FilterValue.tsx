import React, { useState } from 'react';
import FilterAutoComplete from '../FilterAutoComplete';
import FilterAutoCompleteLocal from '../FilterAutoCompleteLocal';
import { FilterKey, FilterCategory, FilterType } from 'Types/filter/filterType';
import FilterValueDropdown from '../FilterValueDropdown';
import FilterDuration from '../FilterDuration';
import { debounce } from 'App/utils';

interface Props {
  filter: any;
  onUpdate: (filter) => void;
}
function FilterValue(props: Props) {
  const { filter } = props;
  const [durationValues, setDurationValues] = useState({ minDuration: filter.value[0], maxDuration: filter.value[1] });
  const showCloseButton = filter.value.length > 1;
  const lastIndex = filter.value.length - 1;

  const onAddValue = () => {
    const newValue = filter.value.concat('');
    props.onUpdate({ ...filter, value: newValue });
  }

  const onRemoveValue = (valueIndex) => {
    const newValue = filter.value.filter((_, index) => index !== valueIndex);
    props.onUpdate({ ...filter, value: newValue });
  }

  const onChange = (e, item, valueIndex) => {
    const newValues = filter.value.map((_, _index) => {
      if (_index === valueIndex) {
        return item.value;
      }
      return _;
    })
    props.onUpdate({ ...filter, value: newValues })
  }

  const debounceOnSelect = React.useCallback(debounce(onChange, 500), [onChange]);

  const onDurationChange = (newValues) => {
    setDurationValues({ ...durationValues, ...newValues });
  } 

  const handleBlur = (e) => {
    if (filter.type === FilterType.DURATION) {
      const { maxDuration, minDuration, key } = filter;
      if (maxDuration || minDuration) return;
      if (maxDuration !== durationValues.maxDuration || 
          minDuration !== durationValues.minDuration) {
        props.onUpdate({ ...filter, value: [durationValues.minDuration, durationValues.maxDuration] });
      }
    }
  }

  const getParms = (key) => {
    switch (filter.category) {
      case FilterCategory.METADATA:
        return { type: FilterKey.METADATA, key: key };
      default:
        return { type: filter.key };
    }
  }

  const renderValueFiled = (value, valueIndex) => {
    const showOrButton = valueIndex === lastIndex;
    switch(filter.type) {
      case FilterType.STRING:
        return (
          <FilterAutoCompleteLocal
            value={value}
            showCloseButton={showCloseButton}
            showOrButton={showOrButton}
            onAddValue={onAddValue}
            onRemoveValue={() => onRemoveValue(valueIndex)}
            onSelect={(e, item) => debounceOnSelect(e, item, valueIndex)}
            icon={filter.icon}
          />
        )
      case FilterType.DROPDOWN:
        return (
          <FilterValueDropdown
            search={true}
            value={value}
            filter={filter}
            options={filter.options}
            onChange={(e, { name, value }) => onChange(e, { value }, valueIndex)}
          />
        )
      case FilterType.ISSUE:
      case FilterType.MULTIPLE_DROPDOWN:
        return (
          <FilterValueDropdown
            search={true}
            multiple={true}
            value={value}
            filter={filter}
            options={filter.options}
            onChange={(e, { name, value }) => onChange(e, { value }, valueIndex)}
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
            minDuration={ durationValues.minDuration }
            maxDuration={ durationValues.maxDuration }
          />
        )
      case FilterType.NUMBER:
        return (
          <input
            className="w-full px-2 py-1 text-sm leading-tight text-gray-700 rounded-lg"
            type="number"
            name={`${filter.key}-${valueIndex}`}
            value={value}
            onChange={(e) => onChange(e, { value: e.target.value }, valueIndex)}
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
            params={getParms(filter.key)}
            headerText={''}
            // placeholder={''}
            onSelect={(e, item) => onChange(e, item, valueIndex)}
            icon={filter.icon}
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
          <div key={valueIndex}>
            {renderValueFiled(value, valueIndex)}
          </div>
        ))
      )}
    </div>
  );
}

export default FilterValue;