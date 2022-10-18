import React, { useState } from 'react';
import FilterAutoComplete from '../FilterAutoComplete';
import FilterAutoCompleteLocal from '../FilterAutoCompleteLocal';
import { FilterKey, FilterCategory, FilterType } from 'Types/filter/filterType';
import FilterValueDropdown from '../FilterValueDropdown';
import FilterDuration from '../FilterDuration';
import { debounce } from 'App/utils';
import { assist as assistRoute, isRoute } from 'App/routes';
import cn from 'classnames';

const ASSIST_ROUTE = assistRoute();

interface Props {
    filter: any;
    onUpdate: (filter: any) => void;
}
function FilterValue(props: Props) {
    const { filter } = props;
    const [durationValues, setDurationValues] = useState({
        minDuration: filter.value[0],
        maxDuration: filter.value.length > 1 ? filter.value[1] : filter.value[0],
    });
    const showCloseButton = filter.value.length > 1;
    const lastIndex = filter.value.length - 1;

    const onAddValue = () => {
        const newValue = filter.value.concat('');
        props.onUpdate({ ...filter, value: newValue });
    };

    const onRemoveValue = (valueIndex: any) => {
        const newValue = filter.value.filter((_: any, index: any) => index !== valueIndex);
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

    const debounceOnSelect = React.useCallback(debounce(onChange, 500), [onChange]);

    const onDurationChange = (newValues: any) => {
        setDurationValues({ ...durationValues, ...newValues });
    };

    const handleBlur = (e: any) => {
        if (filter.type === FilterType.DURATION) {
            const { maxDuration, minDuration, key } = filter;
            if (maxDuration || minDuration) return;
            if (maxDuration !== durationValues.maxDuration || minDuration !== durationValues.minDuration) {
                props.onUpdate({ ...filter, value: [durationValues.minDuration, durationValues.maxDuration] });
            }
        }
    };

    const getParms = (key: any) => {
        let params: any = { type: filter.key };
        switch (filter.category) {
            case FilterCategory.METADATA:
                params = { type: FilterKey.METADATA, key: key };
        }

        if (isRoute(ASSIST_ROUTE, window.location.pathname)) {
            params = { ...params, live: true };
        }

        return params;
    };

    const renderValueFiled = (value: any, valueIndex: any) => {
        const showOrButton = valueIndex === lastIndex && filter.type !== FilterType.NUMBER;
        switch (filter.type) {
            case FilterType.STRING:
                return (
                    <FilterAutoCompleteLocal
                        value={value}
                        showCloseButton={showCloseButton}
                        showOrButton={showOrButton}
                        onAddValue={onAddValue}
                        onRemoveValue={() => onRemoveValue(valueIndex)}
                        onSelect={(e, item) => debounceOnSelect(e, item, valueIndex)}
                        icon={filter.icon}
                    />
                );
            case FilterType.DROPDOWN:
                return (
                    <FilterValueDropdown
                        // search={true}
                        value={value}
                        placeholder={filter.placeholder}
                        // filter={filter}
                        options={filter.options}
                        onChange={({ value }) => onChange(null, { value }, valueIndex)}
                    />
                );
            case FilterType.ISSUE:
            case FilterType.MULTIPLE_DROPDOWN:
                return (
                    <FilterValueDropdown
                        search={true}
                        // multiple={true}
                        value={value}
                        // filter={filter}
                        placeholder={filter.placeholder}
                        options={filter.options}
                        onChange={({ value }) => onChange(null, value, valueIndex)}
                        onAddValue={onAddValue}
                        onRemoveValue={() => onRemoveValue(valueIndex)}
                        showCloseButton={showCloseButton}
                        showOrButton={showOrButton}
                    />
                );
            case FilterType.DURATION:
                return (
                    <FilterDuration
                        onChange={onDurationChange}
                        // onEnterPress={ this.handleClose }
                        onBlur={handleBlur}
                        minDuration={durationValues.minDuration}
                        maxDuration={durationValues.maxDuration}
                    />
                );
            case FilterType.NUMBER_MULTIPLE:
                return (
                    <FilterAutoCompleteLocal
                        value={value}
                        showCloseButton={showCloseButton}
                        showOrButton={showOrButton}
                        onAddValue={onAddValue}
                        onRemoveValue={() => onRemoveValue(valueIndex)}
                        onSelect={(e, item) => debounceOnSelect(e, item, valueIndex)}
                        icon={filter.icon}
                        type="number"
                    />
                );
            case FilterType.NUMBER:
                return (
                    <FilterAutoCompleteLocal
                        value={value}
                        showCloseButton={showCloseButton}
                        showOrButton={showOrButton}
                        onAddValue={onAddValue}
                        onRemoveValue={() => onRemoveValue(valueIndex)}
                        onSelect={(e, item) => debounceOnSelect(e, item, valueIndex)}
                        icon={filter.icon}
                        type="number"
                        allowDecimals={false}
                        isMultilple={false}
                    />
                );
            case FilterType.MULTIPLE:
                return (
                    <FilterAutoComplete
                        value={value}
                        showCloseButton={showCloseButton}
                        showOrButton={showOrButton}
                        onAddValue={onAddValue}
                        onRemoveValue={() => onRemoveValue(valueIndex)}
                        method={'GET'}
                        endpoint="/events/search"
                        params={getParms(filter.key)}
                        headerText={''}
                        placeholder={filter.placeholder}
                        onSelect={(e, item) => onChange(e, item, valueIndex)}
                        icon={filter.icon}
                    />
                );
        }
    };

    return (
        // 
        <div className={cn("grid gap-3 w-full", { 'grid-cols-2': filter.hasSource, 'grid-cols-3' : !filter.hasSource })}>
            {filter.type === FilterType.DURATION
                ? renderValueFiled(filter.value, 0)
                : filter.value &&
                  filter.value.map((value: any, valueIndex: any) => <div key={valueIndex}>{renderValueFiled(value, valueIndex)}</div>)}
        </div>
    );
}

export default FilterValue;
