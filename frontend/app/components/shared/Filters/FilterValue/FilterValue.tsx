import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { FilterKey, FilterCategory, FilterType } from 'Types/filter/filterType';
import { assist as assistRoute, isRoute } from 'App/routes';
import { observer } from 'mobx-react-lite';
import FilterDuration from '../FilterDuration';
import ValueAutoComplete from 'Shared/Filters/FilterValue/ValueAutoComplete';
import { Input, Select } from 'antd';
import { useStore } from '@/mstore';

const ASSIST_ROUTE = assistRoute();

interface Props {
  filter: any;
  onUpdate: (filter: any) => void;
  isConditional?: boolean;
  eventName?: string;
}

function FilterValue(props: Props) {
  const { filter, onUpdate, isConditional, eventName = '' } = props;
  const isAutoOpen = filter.autoOpen;
  const { searchStore } = useStore();

  const [durationValues, setDurationValues] = useState(() => ({
    minDuration: filter.value?.[0],
    maxDuration: filter.value?.length > 1 ? filter.value[1] : filter.value?.[0],
  }));

  // Update duration values when filter changes
  useEffect(() => {
    if (filter.name === FilterType.DURATION) {
      const incomingMin = filter.value?.[0];
      const incomingMax =
        filter.value?.length > 1 ? filter.value[1] : filter.value?.[0];

      if (
        durationValues.minDuration !== incomingMin ||
        durationValues.maxDuration !== incomingMax
      ) {
        setDurationValues({
          minDuration: incomingMin,
          maxDuration: incomingMax,
        });
      }
    }
  }, [
    filter.value,
    filter.name,
    durationValues.minDuration,
    durationValues.maxDuration,
  ]);

  const onApplyValues = useCallback(
    (values: string[]) => {
      onUpdate({ ...filter, value: values });
      void searchStore.fetchSessions();
    },
    [filter, onUpdate, searchStore],
  );

  const onDurationChange = useCallback((newValues: any) => {
    setDurationValues((current) => ({ ...current, ...newValues }));
  }, []);

  const handleBlur = useCallback(() => {
    if (filter.name === FilterType.DURATION) {
      const currentMinInProp = filter.value?.[0];
      const currentMaxInProp =
        filter.value?.length > 1 ? filter.value[1] : filter.value?.[0];

      if (
        durationValues.minDuration !== currentMinInProp ||
        durationValues.maxDuration !== currentMaxInProp
      ) {
        onUpdate({
          ...filter,
          value: [durationValues.minDuration, durationValues.maxDuration],
        });
      }
    }
  }, [
    filter,
    onUpdate,
    durationValues.minDuration,
    durationValues.maxDuration,
  ]);

  const params = useMemo(() => {
    let baseParams: any = {
      type: filter.key,
      name: filter.name,
      isEvent: filter.isEvent,
      id: filter.id,
    };

    if (filter.isEvent || eventName) {
      baseParams.eventName = eventName;
    }

    if (!filter.isEvent) {
      baseParams.propertyName = filter.name;
      if (filter.eventName) {
        baseParams.eventName = filter.eventName;
      }
    }

    if (filter.category === FilterCategory.METADATA) {
      baseParams = { type: FilterKey.METADATA, key: filter.key };
    }

    if (isRoute(ASSIST_ROUTE, window.location.pathname)) {
      baseParams = { ...baseParams, live: true };
    }

    return baseParams;
  }, [
    filter.key,
    filter.name,
    filter.isEvent,
    filter.id,
    filter.category,
    filter.eventName,
    eventName,
  ]);

  const handleNumberInputBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onUpdate({ ...filter, value: [newValue] });
    },
    [filter, onUpdate],
  );

  const handleBooleanChange = useCallback(
    (value: boolean) => {
      onUpdate({ ...filter, value });
    },
    [filter, onUpdate],
  );

  // Render different input types based on filter data type
  switch (filter.dataType) {
    case FilterType.STRING:
      return (
        <ValueAutoComplete
          initialValues={filter.value}
          isAutoOpen={isAutoOpen}
          onApplyValues={onApplyValues}
          params={params}
          commaQuery={true}
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

    case FilterType.NUMBER:
    case FilterType.INTEGER:
    case FilterType.DOUBLE:
      return (
        <Input
          type="number"
          defaultValue={filter.value}
          size="small"
          className="rounded-lg"
          style={{ width: '80px' }}
          placeholder={filter.placeholder}
          onBlur={handleNumberInputBlur}
        />
      );

    case FilterType.BOOLEAN:
      return (
        <Select
          value={filter.value}
          size="small"
          style={{ width: '80px' }}
          onChange={handleBooleanChange}
          placeholder={filter.placeholder}
          options={[
            { label: 'True', value: true },
            { label: 'False', value: false },
          ]}
        />
      );

    default:
      console.warn('Unsupported filter type in FilterValue:', filter.dataType);
      return null;
  }
}

export default observer(FilterValue);
