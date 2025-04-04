import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { FilterKey, FilterCategory, FilterType } from 'Types/filter/filterType';
import { debounce } from 'App/utils';
import { assist as assistRoute, isRoute } from 'App/routes';
import { observer } from 'mobx-react-lite';
import FilterDuration from '../FilterDuration';
import FilterValueDropdown from '../FilterValueDropdown';
import FilterAutoCompleteLocal from '../FilterAutoCompleteLocal';
import FilterAutoComplete from '../FilterAutoComplete';
import ValueAutoComplete from 'Shared/Filters/FilterValue/ValueAutoComplete';
import { Input, Select } from 'antd';

const ASSIST_ROUTE = assistRoute();

interface Props {
  filter: any;
  onUpdate: (filter: any) => void;
  isConditional?: boolean;
}

function BaseFilterLocalAutoComplete(props: any) {
  return (
    <FilterAutoCompleteLocal
      value={props.value}
      showCloseButton={props.showCloseButton}
      onApplyValues={props.onApplyValues}
      onRemoveValue={props.onRemoveValue}
      onSelect={props.onSelect}
      icon={props.icon}
      placeholder={props.placeholder}
      isAutoOpen={props.isAutoOpen}
      modalProps={props.modalProps}
      type={props.type}
      allowDecimals={props.allowDecimals}
      isMultiple={props.isMultiple}
    />
  );
}

function BaseDropDown(props: any) {
  return (
    <FilterValueDropdown
      value={props.value}
      isAutoOpen={props.isAutoOpen}
      placeholder={props.placeholder}
      options={props.options}
      onApplyValues={props.onApplyValues}
      search={props.search}
      onAddValue={props.onAddValue}
      onRemoveValue={props.onRemoveValue}
      showCloseButton={props.showCloseButton}
      showOrButton={props.showOrButton}
      isMultiple={props.isMultiple}
    />
  );
}


function FilterValue(props: Props) {
  const { filter, onUpdate, isConditional } = props; // Destructure props early
  const isAutoOpen = filter.autoOpen; // Assume parent now controls this correctly

  const [durationValues, setDurationValues] = useState(() => ({
    minDuration: filter.value?.[0],
    maxDuration: filter.value?.length > 1 ? filter.value[1] : filter.value?.[0]
  }));

  useEffect(() => {
    if (filter.type === FilterType.DURATION) {
      const incomingMin = filter.value?.[0];
      const incomingMax = filter.value?.length > 1 ? filter.value[1] : filter.value?.[0];
      if (durationValues.minDuration !== incomingMin || durationValues.maxDuration !== incomingMax) {
        setDurationValues({ minDuration: incomingMin, maxDuration: incomingMax });
      }
    }
  }, [filter.value, filter.type]);


  const showCloseButton = filter.value.length > 1;
  const showOrButton = filter.value.length > 1;

  const onAddValue = useCallback(() => {
    const newValue = filter.value.concat('');
    onUpdate({ ...filter, value: newValue });
  }, [filter, onUpdate]);

  const onApplyValues = useCallback((values: string[]) => {
    onUpdate({ ...filter, value: values });
  }, [filter, onUpdate]);

  const onRemoveValue = useCallback((valueIndex: any) => {
    const newValue = filter.value.filter(
      (_: any, index: any) => index !== valueIndex
    );
    onUpdate({ ...filter, value: newValue });
  }, [filter, onUpdate]);

  const stableOnChange = useCallback((e: any, item: any, valueIndex: any) => {
    const newValues = filter.value.map((val: any, _index: any) => {
      if (_index === valueIndex) {
        return item;
      }
      return val;
    });
    onUpdate({ ...filter, value: newValues });
  }, [filter, onUpdate]);

  const debounceOnSelect = useCallback(debounce(stableOnChange, 500), [stableOnChange]);

  const onDurationChange = useCallback((newValues: any) => {
    setDurationValues(current => ({ ...current, ...newValues }));
  }, []);

  const handleBlur = useCallback(() => {
    if (filter.type === FilterType.DURATION) {
      const currentMinInProp = filter.value?.[0];
      const currentMaxInProp = filter.value?.length > 1 ? filter.value[1] : filter.value?.[0];

      if (durationValues.minDuration !== currentMinInProp || durationValues.maxDuration !== currentMaxInProp) {
        onUpdate({
          ...filter,
          value: [durationValues.minDuration, durationValues.maxDuration]
        });
      }
    }
  }, [filter, onUpdate, filter.value, durationValues.minDuration, durationValues.maxDuration]); // Add durationValues dependency

  const params = useMemo(() => {
    let baseParams: any = {
      type: filter.key,
      name: filter.name,
      isEvent: filter.isEvent,
      id: filter.id
    };
    if (filter.category === FilterCategory.METADATA) {
      baseParams = { type: FilterKey.METADATA, key: filter.key };
    }
    if (isRoute(ASSIST_ROUTE, window.location.pathname)) {
      baseParams = { ...baseParams, live: true };
    }
    return baseParams;
  }, [filter.key, filter.name, filter.isEvent, filter.id, filter.category]);

  const value = filter.value;

  switch (filter.type) {
    case FilterType.DOUBLE:
      return (
        <Input
          type="number"
          value={value}
          size="small"
          className="rounded-lg"
          style={{ width: '80px' }}
          onChange={(e) => {
            const newValue = e.target.value;
            onUpdate({ ...filter, value: newValue });
          }}
          placeholder={filter.placeholder}
          onBlur={handleBlur}
        />
      );
    case FilterType.BOOLEAN:
      return (
        <Select
          value={value}
          size="small"
          style={{ width: '80px' }}
          onChange={(value: any) => onUpdate({ ...filter, value })}
          placeholder={filter.placeholder}
          options={[
            { label: 'True', value: true },
            { label: 'False', value: false }
          ]}
        />
      );
    case FilterType.NUMBER_MULTIPLE:
      return (
        <BaseFilterLocalAutoComplete
          value={value}
          showCloseButton={showCloseButton}
          onApplyValues={onApplyValues}
          onRemoveValue={onRemoveValue}
          onSelect={debounceOnSelect}
          icon={filter.icon}
          placeholder={filter.placeholder}
          isAutoOpen={isAutoOpen}
          modalProps={{ placeholder: '' }}
          type="number"
          isMultiple={true}
        />
      );
    case FilterType.NUMBER:
      return (
        <BaseFilterLocalAutoComplete
          value={value}
          showCloseButton={showCloseButton}
          onApplyValues={onApplyValues}
          onRemoveValue={onRemoveValue}
          onSelect={debounceOnSelect}
          icon={filter.icon}
          placeholder={filter.placeholder}
          isAutoOpen={isAutoOpen}
          modalProps={{ placeholder: '' }}
          type="number"
          allowDecimals={false}
          isMultiple={false}
        />
      );
    case FilterType.STRING:
      return <ValueAutoComplete
        initialValues={value}
        isAutoOpen={isAutoOpen}
        onApplyValues={onApplyValues}
        params={params}
        commaQuery={true}
      />;
    case FilterType.DROPDOWN:
      return <BaseDropDown
        value={value}
        isAutoOpen={isAutoOpen}
        placeholder={filter.placeholder}
        options={filter.options}
        onApplyValues={onApplyValues}
      />;
    case FilterType.ISSUE:
    case FilterType.MULTIPLE_DROPDOWN:
      return (
        <BaseDropDown
          value={value}
          isAutoOpen={isAutoOpen}
          placeholder={filter.placeholder}
          options={filter.options}
          onApplyValues={onApplyValues}
          search
          onAddValue={onAddValue}
          onRemoveValue={onRemoveValue}
          showCloseButton={showCloseButton}
          showOrButton={showOrButton}
        />
      );
    case FilterType.DURATION:
      return (
        <FilterDuration
          onChange={onDurationChange}
          onBlur={handleBlur}
          minDuration={durationValues.minDuration}
          maxDuration={durationValues.maxDuration}
          isConditional={isConditional}
        />
      );
    case FilterType.MULTIPLE:
      return (
        <FilterAutoComplete
          value={value}
          isAutoOpen={isAutoOpen}
          showCloseButton={showCloseButton}
          showOrButton={showOrButton}
          onApplyValues={onApplyValues}
          onRemoveValue={onRemoveValue}
          method="GET"
          endpoint="/PROJECT_ID/events/search" // TODO: Replace PROJECT_ID dynamically if needed
          params={params}
          headerText=""
          placeholder={filter.placeholder}
          onSelect={stableOnChange}
          icon={filter.icon}
          modalProps={{ placeholder: 'Search' }}
        />
      );
    default:
      console.warn('Unsupported filter type in FilterValue:', filter.type);
      return null;
  }
}

export default observer(FilterValue);
