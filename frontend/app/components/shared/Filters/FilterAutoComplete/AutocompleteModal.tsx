import React, { useRef, useState } from 'react';
import { Button, Checkbox, Input } from 'antd';
import cn from 'classnames';

export function AutocompleteModal({
  onClose,
  onApply,
  values,
  handleFocus,
  loadOptions,
  options,
  isLoading,
}: {
  values: string[];
  onClose: () => void;
  onApply: (values: string[]) => void;
  handleFocus: () => void;
  loadOptions: (query: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  isLoading?: boolean;
}) {
  const [query, setQuery] = React.useState('');
  const [selectedValues, setSelectedValues] = React.useState<string[]>(
    values.filter((i) => i.length > 0)
  );

  const handleInputChange = (value: string) => {
    setQuery(value);
    loadOptions(value);
  };
  const onSelectOption = (item: { value: string; label: string }) => {
    const selected = isSelected(item);
    if (!selected) {
      setSelectedValues([...selectedValues, item.value]);
    } else {
      setSelectedValues(selectedValues.filter((i) => i !== item.value));
    }
  };
  const isSelected = (item: { value: string; label: string }) => {
    return selectedValues.includes(item.value);
  };

  const applyValues = () => {
    onApply(selectedValues);
  };

  const sortedOptions = React.useMemo(() => {
    if (values[0] && values[0].length) {
      const sorted = options.sort((a, b) => {
        return values.includes(a.value) ? -1 : 1;
      });
      return sorted;
    }
    return options;
  }, [options.length]);
  return (
    <div
      className={cn(
        'absolute left-0 mt-2 p-4 bg-white rounded-xl shadow border-gray-light z-10'
      )}
      style={{ minWidth: 320, minHeight: 100, top: '100%' }}
    >
      <Input.Search
        value={query}
        onFocus={handleFocus}
        loading={isLoading}
        onChange={(e) => handleInputChange(e.target.value)}
      />

      <div
        className={'flex flex-col gap-2 overflow-y-auto py-2'}
        style={{ maxHeight: 200 }}
      >
        {sortedOptions.map((item) => (
          <div
            onClick={() => onSelectOption(item)}
            className={
              'cursor-pointer w-full py-1 hover:bg-active-blue rounded px-2'
            }
          >
            <Checkbox checked={isSelected(item)} /> {item.label}
          </div>
        ))}
      </div>
      {query.length ? (
        <div className={'border-y border-y-gray-light py-2'}>
          <div
            className={
              'rounded cursor-pointer text-blue hover:bg-active-blue px-2 py-1'
            }
            onClick={() => onApply([query])}
          >
            Apply "{query}"
          </div>
        </div>
      ) : null}
      <div className={'flex gap-2 items-center pt-2'}>
        <Button type={'primary'} onClick={applyValues}>
          Apply
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

interface Props {
  value: string[];
  params?: any;
  onApplyValues: (values: string[]) => void;
  modalRenderer: (props: any) => React.ReactElement;
  placeholder?: string;
  modalProps?: any;
  mapValues?: (value: string) => string;
}

export function AutoCompleteContainer(props: Props) {
  const filterValueContainer = useRef<HTMLDivElement>(null);
  const [showValueModal, setShowValueModal] = useState(false);
  const isEmpty = props.value.length === 0 || !props.value[0].length;
  const onClose = () => setShowValueModal(false);
  const onApply = (values: string[]) => {
    props.onApplyValues(values);
    setShowValueModal(false);
  };
  return (
    <div
      className={
        'rounded border border-gray-light px-2 relative w-fit whitespace-nowrap flex items-center'
      }
      style={{ height: 26 }}
      ref={filterValueContainer}
    >
      <div
        onClick={() => setShowValueModal(true)}
        className={'flex items-center gap-2 cursor-pointer'}
      >
        {!isEmpty ? (
          <>
            <div
              className={'rounded-xl bg-gray-lighter leading-none px-1 py-0.5'}
            >
              {props.mapValues
                ? props.mapValues(props.value[0])
                : props.value[0]}
            </div>
            {props.value.length > 1 ? (
              props.value.length === 2 ? (
                <>
                  or
                  <div
                    className={
                      'rounded-xl bg-gray-lighter leading-none px-1 py-0.5'
                    }
                  >
                    {props.mapValues
                      ? props.mapValues(props.value[1])
                      : props.value[1]}
                  </div>
                </>
              ) : (
                <div
                  className={
                    'rounded-xl bg-gray-lighter leading-none px-1 py-0.5'
                  }
                >
                  + {props.value.length - 1} More
                </div>
              )
            ) : null}
          </>
        ) : (
          <div className={'text-disabled-text'}>
            {props.placeholder ? props.placeholder : 'Select values'}
          </div>
        )}
      </div>
      {showValueModal ? (
        <props.modalRenderer
          {...props.modalProps}
          params={props.params}
          onClose={onClose}
          onApply={onApply}
          values={props.value}
        />
      ) : null}
    </div>
  );
}
