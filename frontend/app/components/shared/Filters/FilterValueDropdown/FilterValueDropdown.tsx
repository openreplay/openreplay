import React from 'react';
import {
  AutoCompleteContainer,
  AutocompleteModal,
} from '../FilterAutoComplete/AutocompleteModal';

interface Props {
  options: any[];
  onApply: (values: string[]) => void;
  onClose: () => void;
  values: string[];
}
function FilterValueDropdown(props: Props) {
  const { options, onApply, onClose, values } = props;
  const [query, setQuery] = React.useState('');

  const filteredOptions = query.length
    ? options.filter((option) =>
        option.label.toLowerCase().includes(query.toLowerCase()),
      )
    : options;
  return (
    <AutocompleteModal
      values={values}
      onClose={onClose}
      onApply={onApply}
      loadOptions={setQuery}
      options={filteredOptions}
      isLoading={false}
    />
  );
}

interface MainProps {
  placeholder?: string;
  value: string[];
  onApplyValues: (values: string[]) => void;
  className?: string;
  options: any[];
  search?: boolean;
  showCloseButton?: boolean;
  showOrButton?: boolean;
  onRemoveValue?: (ind: number) => void;
  onAddValue?: (ind: number) => void;
  isMultiple?: boolean;
}

function FilterDropdownController(props: MainProps) {
  const mapValues = (value: string) =>
    props.options.find((option) => option.value === value)?.label || value;

  return (
    <AutoCompleteContainer
      value={props.value}
      onApplyValues={props.onApplyValues}
      modalRenderer={FilterValueDropdown}
      modalProps={{ options: props.options }}
      mapValues={mapValues}
    />
  );
}

export default FilterDropdownController;
