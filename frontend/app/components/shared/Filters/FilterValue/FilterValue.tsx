import React, { useState } from 'react';
import { FilterKey, FilterCategory, FilterType } from 'Types/filter/filterType';
import { debounce } from 'App/utils';
import { assist as assistRoute, isRoute } from 'App/routes';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import FilterDuration from '../FilterDuration';
import FilterValueDropdown from '../FilterValueDropdown';
import FilterAutoCompleteLocal from '../FilterAutoCompleteLocal';
import FilterAutoComplete from '../FilterAutoComplete';

const ASSIST_ROUTE = assistRoute();

interface Props {
  filter: any;
  onUpdate: (filter: any) => void;
  isConditional?: boolean;
}
function FilterValue(props: Props) {
  const { filter } = props;
  const isAutoOpen = filter.autoOpen;

  React.useEffect(() => {
    if (isAutoOpen) {
      setTimeout(() => {
        filter.autoOpen = false;
      }, 250);
    }
  }, [isAutoOpen]);
  const [durationValues, setDurationValues] = useState({
    minDuration: filter.value?.[0],
    maxDuration: filter.value.length > 1 ? filter.value[1] : filter.value[0],
  });
  const showCloseButton = filter.value.length > 1;

  const onAddValue = () => {
    const newValue = filter.value.concat('');
    props.onUpdate({ ...filter, value: newValue });
  };

  const onApplyValues = (values: string[]) => {
    props.onUpdate({ ...filter, value: values });
  };

  const onRemoveValue = (valueIndex: any) => {
    const newValue = filter.value.filter(
      (_: any, index: any) => index !== valueIndex,
    );
    props.onUpdate({ ...filter, value: newValue });
  };

  const onChange = (e: any, item: any, valueIndex: any) => {
    const newValues = filter.value.map((_: any, _index: any) => {
      if (_index === valueIndex) {
        return item;
      }
      return _;
    });
    props.onUpdate({ ...filter, value: newValues });
  };

  const debounceOnSelect = React.useCallback(debounce(onChange, 500), [
    onChange,
  ]);

  const onDurationChange = (newValues: any) => {
    setDurationValues({ ...durationValues, ...newValues });
  };

  const handleBlur = () => {
    if (filter.type === FilterType.DURATION) {
      const { maxDuration, minDuration } = filter;
      if (maxDuration || minDuration) return;
      if (
        maxDuration !== durationValues.maxDuration ||
        minDuration !== durationValues.minDuration
      ) {
        props.onUpdate({
          ...filter,
          value: [durationValues.minDuration, durationValues.maxDuration],
        });
      }
    }
  };

  const getParms = (key: any) => {
    let params: any = { type: filter.key };
    switch (filter.category) {
      case FilterCategory.METADATA:
        params = { type: FilterKey.METADATA, key };
    }

    if (isRoute(ASSIST_ROUTE, window.location.pathname)) {
      params = { ...params, live: true };
    }

    return params;
  };

  const renderValueFiled = (value: any[]) => {
    const showOrButton = filter.value.length > 1;
    function BaseFilterLocalAutoComplete(props) {
      return (
        <FilterAutoCompleteLocal
          value={value}
          showCloseButton={showCloseButton}
          onApplyValues={onApplyValues}
          onRemoveValue={(index) => onRemoveValue(index)}
          onSelect={(e, item, index) => debounceOnSelect(e, item, index)}
          icon={filter.icon}
          placeholder={filter.placeholder}
          isAutoOpen={isAutoOpen}
          modalProps={{ placeholder: '' }}
          {...props}
        />
      );
    }
    function BaseDropDown(props) {
      return (
        <FilterValueDropdown
          value={value}
          isAutoOpen={isAutoOpen}
          placeholder={filter.placeholder}
          options={filter.options}
          onApplyValues={onApplyValues}
          {...props}
        />
      );
    }
    switch (filter.type) {
      case FilterType.NUMBER_MULTIPLE:
        return (
          <BaseFilterLocalAutoComplete
            type="number"
            placeholder={filter.placeholder}
          />
        );
      case FilterType.NUMBER:
        return (
          <BaseFilterLocalAutoComplete
            type="number"
            allowDecimals={false}
            isMultiple={false}
            placeholder={filter.placeholder}
          />
        );
      case FilterType.STRING:
        return <BaseFilterLocalAutoComplete placeholder={filter.placeholder} />;
      case FilterType.DROPDOWN:
        return <BaseDropDown />;
      case FilterType.ISSUE:
      case FilterType.MULTIPLE_DROPDOWN:
        return (
          <BaseDropDown
            search
            onAddValue={onAddValue}
            onRemoveValue={(ind) => onRemoveValue(ind)}
            showCloseButton={showCloseButton}
            showOrButton={showOrButton}
            placeholder={filter.placeholder}
          />
        );
      case FilterType.DURATION:
        return (
          <FilterDuration
            onChange={onDurationChange}
            onBlur={handleBlur}
            minDuration={durationValues.minDuration}
            maxDuration={durationValues.maxDuration}
            isConditional={props.isConditional}
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
            onRemoveValue={(index) => onRemoveValue(index)}
            method="GET"
            endpoint="/PROJECT_ID/events/search"
            params={getParms(filter.key)}
            headerText=""
            placeholder={filter.placeholder}
            onSelect={(e, item, index) => onChange(e, item, index)}
            icon={filter.icon}
            modalProps={{ placeholder: 'Search' }}
          />
        );
    }
  };

  return (
    <div
      id="ignore-outside"
      className={cn('grid gap-3 w-fit flex-wrap my-1.5', {
        'grid-cols-2': filter.hasSource,
      })}
    >
      {renderValueFiled(filter.value)}
    </div>
  );
}

export default observer(FilterValue);
