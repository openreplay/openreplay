import React from 'react';
import FilterAutoComplete from '../FilterAutoComplete';

interface Props {
  index: number;
  value: any; // event/filter
  // type: string;
  key: string;
  onRemoveValue?: () => void;
  onAddValue?: () => void;
  showCloseButton: boolean;
  showOrButton: boolean;
  onSelect: (e, item) => void;
}
function FilterValue(props: Props) {
  const { index, value, key, showOrButton, showCloseButton, onRemoveValue , onAddValue } = props;

  return (
    <FilterAutoComplete
      value={value}
      showCloseButton={showCloseButton}
      showOrButton={showOrButton}
      onAddValue={onAddValue}
      onRemoveValue={onRemoveValue}
      method={'GET'}
      endpoint='/events/search'
      params={{ type: key  }}
      headerText={''}
      // placeholder={''}
      onSelect={props.onSelect}
    />
  );
}

export default FilterValue;