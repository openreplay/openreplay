import React from 'react';
import FilterAutoComplete from '../FilterAutoComplete';

interface Props {
  index: number;
  value: any; // event/filter
  onRemoveValue?: () => void;
  onAddValue?: () => void;
  showOrButton: boolean;
  onSelect: (e, item) => void;
}
function FilterValue(props: Props) {
  const { index, value, showOrButton, onRemoveValue , onAddValue } = props;

  return (
    <FilterAutoComplete
      value={value}
      showOrButton={showOrButton}
      onAddValue={onAddValue}
      onRemoveValue={onRemoveValue}
      method={'GET'}
      endpoint='/events/search'
      params={undefined}
      headerText={''}
      placeholder={''}
      onSelect={props.onSelect}
    />
  );
}

export default FilterValue;