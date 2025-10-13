import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { debounce } from 'App/utils';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { searchService } from 'App/services';
import {
  AutoCompleteContainer,
  AutocompleteModal,
  Props,
} from './AutocompleteModal';
import { TopValue } from '@/mstore/filterStore';

interface FilterParams {
  id: string;
  type: string;
  name?: string;
  possibleValues?: Array<any>;
  isPredefined?: boolean;
  // ... other potential properties
  [key: string]: any; // Keep flexible if needed, but prefer specific types
}

interface OptionType {
  value: string;
  label: string;
}

function processMetadataValues(input: FilterParams): FilterParams {
  const result: Partial<FilterParams> = {}; // Use Partial if creating a subset initially
  const isMetadata = input.type === 'metadata';

  for (const key in input) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      const value = input[key];
      if (isMetadata && typeof value === 'string' && value.startsWith('_')) {
        result[key] = value.substring(1);
      } else {
        result[key] = value;
      }
    }
  }
  return result as FilterParams; // Cast back if confident, or adjust logic
}

const FilterAutoComplete = observer(
  ({
    params, // Expect FilterParams type here
    values,
    onClose,
    onApply,
    placeholder,
  }: {
    params: FilterParams;
    values: string[];
    onClose: () => void;
    onApply: (values: string[]) => void;
    placeholder?: string;
  }) => {
    const [options, setOptions] = useState<OptionType[]>(
      params.isPredefined ? (params.possibleValues ?? []) : [],
    );
    const [loading, setLoading] = useState(false);
    const { filterStore, projectsStore } = useStore();

    const filterKey = `${projectsStore.siteId}_${params.id}`;
    const topValues: TopValue[] = filterStore.topValues[filterKey] || [];

    // Memoize the mapped top values
    const mappedTopValues = useMemo(() => {
      console.log('Recalculating mappedTopValues'); // For debugging memoization
      return topValues.map((i) => ({ value: i.value, label: i.value }));
    }, [topValues]);

    useEffect(() => {
      setOptions([]);
    }, [projectsStore.siteId]);

    const loadTopValues = useCallback(async () => {
      if (projectsStore.siteId && params.id) {
        setLoading(true);
        try {
          await filterStore.fetchTopValues(params.id);
        } catch (error) {
          console.error('Failed to load top values', error);
          // Handle error state if needed
        } finally {
          setLoading(false); // Ensure loading is set false even on error
        }
      } else {
        setOptions([]);
      }
    }, [filterStore, params.id, projectsStore.siteId]);

    useEffect(() => {
      if (params.isPredefined) return;
      void loadTopValues();
    }, [loadTopValues]);

    useEffect(() => {
      setOptions(mappedTopValues);
    }, [mappedTopValues]);

    const loadOptions = useCallback(
      async (inputValue: string) => {
        if (!inputValue.length) {
          setOptions(mappedTopValues);
          return;
        }

        setLoading(true);
        try {
          const searchType = params.name?.toLowerCase();
          if (!searchType) {
            console.warn('Search type (params.name) is missing.');
            setOptions([]);
            return;
          }

          const data: { value: string }[] =
            await searchService.fetchAutoCompleteValues({
              type: searchType,
              q: inputValue,
            });
          const _options =
            data.map((i) => ({ value: i.value, label: i.value })) || [];
          setOptions(_options);
        } catch (e) {
          console.error('Failed to fetch autocomplete values:', e);
          setOptions(mappedTopValues);
        } finally {
          setLoading(false);
        }
      },
      [mappedTopValues, params.name, searchService.fetchAutoCompleteValues],
    );

    const debouncedLoadOptions = useCallback(debounce(loadOptions, 500), [
      loadOptions,
    ]);

    const handleInputChange = (newValue: string) => {
      if (params.isPredefined) return;
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
