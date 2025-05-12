import React, { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from 'App/utils';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { searchService } from 'App/services';
import { AutocompleteModal, AutoCompleteContainer } from './AutocompleteModal';

type FilterParam = { [key: string]: any };

function processKey(input: FilterParam): FilterParam {
  const result: FilterParam = {};
  for (const key in input) {
    if (
      input.type === 'metadata' &&
      typeof input[key] === 'string' &&
      input[key].startsWith('_')
    ) {
      result[key] = input[key].substring(1);
    } else {
      result[key] = input[key];
    }
  }
  return result;
}

interface Props {
  showOrButton?: boolean;
  showCloseButton?: boolean;
  onRemoveValue?: (ind: number) => void;
  onAddValue?: (ind: number) => void;
  endpoint?: string;
  method?: string;
  params?: any;
  headerText?: string;
  placeholder?: string;
  onSelect: (e: any, item: any, index: number) => void;
  value: any;
  icon?: string;
  hideOrText?: boolean;
  onApplyValues: (values: string[]) => void;
  modalProps?: Record<string, any>;
  isAutoOpen?: boolean;
}

const FilterAutoComplete = observer(
  ({
    params = {},
    onClose,
    onApply,
    values,
    placeholder,
  }: {
    params: any;
    values: string[];
    onClose: () => void;
    onApply: (values: string[]) => void;
    placeholder?: string;
  }) => {
    const [options, setOptions] = useState<{ value: string; label: string }[]>(
      [],
    );
    const [initialFocus, setInitialFocus] = useState(false);
    const [loading, setLoading] = useState(false);
    const { filterStore, projectsStore } = useStore();
    const _params = processKey(params);
    const filterKey = `${projectsStore.siteId}_${_params.type}${_params.key || ''}`;
    const topValues = filterStore.topValues[filterKey] || [];

    React.useEffect(() => {
      setOptions([])
    }, [projectsStore.siteId])

    const loadTopValues = async () => {
      setLoading(true)
      if (projectsStore.siteId) {
        await filterStore.fetchTopValues(_params.type, projectsStore.siteId, _params.key);
      }
      setLoading(false)
    };

    useEffect(() => {
      if (topValues.length > 0) {
        const mappedValues = topValues.map((i) => ({
          value: i.value,
          label: i.value,
        }));
        setOptions(mappedValues);
      }
    }, [topValues, initialFocus]);

    useEffect(() => {
      void loadTopValues();
    }, [_params.type]);

    const loadOptions = async (inputValue: string) => {
      if (!inputValue.length) {
        const mappedValues = topValues.map((i) => ({
          value: i.value,
          label: i.value,
        }));
        setOptions(mappedValues);
        return;
      }
      setLoading(true);
      try {
        const data = await searchService.fetchAutoCompleteValues({
          ..._params,
          q: inputValue,
        });
        const _options =
          data.map((i: any) => ({ value: i.value, label: i.value })) || [];
        setOptions(_options);
      } catch (e) {
        throw new Error(e);
      } finally {
        setLoading(false);
      }
    };

    const debouncedLoadOptions = useCallback(debounce(loadOptions, 500), [
      params,
      topValues,
    ]);

    const handleInputChange = (newValue: string) => {
      setInitialFocus(true);
      debouncedLoadOptions(newValue);
    };

    const handleFocus = () => {
      if (!initialFocus) {
        setOptions(topValues.map((i) => ({ value: i.value, label: i.value })));
      }
      setInitialFocus(true);
    };

    return (
      <AutocompleteModal
        values={values}
        onClose={onClose}
        onApply={onApply}
        handleFocus={handleFocus}
        loadOptions={handleInputChange}
        options={options}
        isLoading={loading}
        placeholder={placeholder}
      />
    );
  },
);

function AutoCompleteController(props: Props) {
  return (
    <AutoCompleteContainer {...props} modalRenderer={FilterAutoComplete} />
  );
}

export default AutoCompleteController;
