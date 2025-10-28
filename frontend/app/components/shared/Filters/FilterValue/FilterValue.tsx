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
  isLast?: boolean;
  isLive?: boolean;
  isDurationFilter?: boolean;
}

function FilterValue(props: Props) {
  const {
    filter,
    onUpdate,
    isConditional,
    eventName = '',
    isLast,
    isDurationFilter,
  } = props;
  const isAutoOpen =
    isLast && (!filter.value?.length || filter.value?.[0] === '');
  const { searchStore } = useStore();
  // const isDurationFilter = filter.name === 'duration' && filter.autoCaptured;

  const [durationValues, setDurationValues] = useState(() => ({
    minDuration: filter.value?.[0],
    maxDuration: filter.value?.length > 1 ? filter.value[1] : filter.value?.[0],
  }));

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
    if (isDurationFilter) {
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
      autoCaptured: filter.autoCaptured,
      possibleValues: filter.possibleValues,
      isPredefined: filter.isPredefined,
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
    filter.isPredefined,
    filter.possibleValues,
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
      if (filter.operator === 'regex') {
        const filterValue = Array.isArray(filter.value)
          ? filter.value[0]
          : filter.value;
        return (
          <Input
            type="text"
            defaultValue={filterValue}
            size="small"
            className="rounded-lg"
            style={{ width: '120px' }}
            placeholder={`/example/i`}
            onBlur={handleNumberInputBlur}
          />
        );
      }
      return (
        <ValueAutoComplete
          initialValues={filter.value}
          isAutoOpen={isAutoOpen}
          onApplyValues={onApplyValues}
          params={params}
          commaQuery={true}
          isLive={props.isLive}
        />
      );

    case FilterType.NUMBER:
      return isDurationFilter ? (
        <FilterDuration
          onChange={onDurationChange}
          onBlur={handleBlur}
          minDuration={durationValues.minDuration}
          maxDuration={durationValues.maxDuration}
          isConditional={isConditional}
        />
      ) : (
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
