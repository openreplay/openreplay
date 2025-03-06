import React, { useState, useEffect } from 'react';
import { Icon } from 'UI';
import { Input } from 'antd';
import {
  AutocompleteModal,
  AutoCompleteContainer,
} from 'Shared/Filters/FilterAutoComplete/AutocompleteModal';
import stl from './FilterAutoCompleteLocal.module.css';

interface Props {
  showOrButton?: boolean;
  showCloseButton?: boolean;
  onRemoveValue?: (index: number) => void;
  onAddValue?: (index: number) => void;
  placeholder?: string;
  onSelect: (e: any, item: Record<string, any>, index: number) => void;
  value: any;
  icon?: string;
  type?: string;
  isMultiple?: boolean;
  allowDecimals?: boolean;
  modalProps?: Record<string, any>;
  onApplyValues: (values: string[]) => void;
  isAutoOpen?: boolean;
}

function FilterAutoCompleteLocal(props: {
  params: any;
  values: string[];
  onClose: () => void;
  onApply: (values: string[]) => void;
  placeholder?: string;
}) {
  const {
    params = {},
    onClose,
    onApply,
    placeholder = 'Enter',
    values,
  } = props;
  const [options, setOptions] = useState<{ value: string; label: string }[]>(
    values
      .filter((val) => val.length)
      .map((value) => ({ value, label: value })),
  );

  const onApplyValues = (values: string[]) => {
    setOptions(values.map((value) => ({ value, label: value })));
    onApply(values);
  };

  const splitValues = (value: string) => {
    const values = value.split(',').filter((v) => v.length);
    setOptions(values.map((value) => ({ value, label: value })));
  };

  return (
    <AutocompleteModal
      values={values}
      onClose={onClose}
      onApply={onApplyValues}
      loadOptions={splitValues}
      options={options}
      isLoading={false}
      placeholder={placeholder}
      commaQuery
    />
  );
}

function FilterLocalController(props: Props) {
  return (
    <AutoCompleteContainer {...props} modalRenderer={FilterAutoCompleteLocal} />
  );
}

export default FilterLocalController;
