import React, { useState, useEffect } from 'react';
import { Icon } from 'UI';
import APIClient from 'App/api_client';
import { debounce } from 'App/utils';
import stl from './FilterAutoComplete.module.css';
import { components, DropdownIndicatorProps } from 'react-select';
import AsyncCreatableSelect from 'react-select/async-creatable';

const dropdownStyles = {
    control: (provided: any) => {
        const obj = {
            ...provided,
            border: 'solid thin transparent !important',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            height: '26px',
            minHeight: '26px',
            borderRadius: '3px',
            boxShadow: 'none !important',
        };
        return obj;
    },
    valueContainer: (provided: any) => ({
        ...provided,
        // paddingRight: '0px',
        width: 'fit-content',
        alignItems: 'center',
        height: '26px',
        padding: '0 3px',
    }),
    // placeholder: (provided: any) => ({
    //   ...provided,
    // }),
    indicatorsContainer: (provided: any) => ({
        ...provided,
        padding: '0px',
        height: '26px',
    }),
    option: (provided: any, state: any) => ({
        ...provided,
        whiteSpace: 'nowrap',
    }),
    menu: (provided: any, state: any) => ({
        ...provided,
        top: 20,
        left: 0,
        minWidth: 'fit-content',
        overflow: 'hidden',
    }),
    container: (provided: any) => ({
        ...provided,
        width: '100%',
    }),
    input: (provided: any) => ({
        ...provided,
        height: '22px',
        '& input:focus': {
            border: 'none !important',
        },
    }),
    singleValue: (provided: any, state: { isDisabled: any }) => {
        const opacity = state.isDisabled ? 0.5 : 1;
        const transition = 'opacity 300ms';

        return {
            ...provided,
            opacity,
            transition,
            display: 'flex',
            alignItems: 'center',
            height: '20px',
        };
    },
};

interface Props {
    showOrButton?: boolean;
    showCloseButton?: boolean;
    onRemoveValue?: () => void;
    onAddValue?: () => void;
    endpoint?: string;
    method?: string;
    params?: any;
    headerText?: string;
    placeholder?: string;
    onSelect: (e: any, item: any) => void;
    value: any;
    icon?: string;
}

function FilterAutoComplete(props: Props) {
    const {
        showCloseButton = false,
        placeholder = 'Type to search',
        method = 'GET',
        showOrButton = false,
        onRemoveValue = () => null,
        onAddValue = () => null,
        endpoint = '',
        params = {},
        value = '',
    } = props;
    const [options, setOptions] = useState<any>(value ? [{ label: value, value }] : []);
    const [query, setQuery] = useState(value);

    useEffect(() => {
        setQuery(value);
    }, [value, options])

    const loadOptions = (inputValue: string, callback: (options: []) => void) => {
        new APIClient()
            [method?.toLocaleLowerCase()](endpoint, { ...params, q: inputValue })
            .then((response: any) => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error(response.statusText);
            })
            .then(({ data }: any) => {
                const _options = data.map((i: any) => ({ value: i.value, label: i.value })) || [];
                setOptions(_options);
                callback(_options);
            })
    };

    const debouncedLoadOptions = React.useCallback(debounce(loadOptions, 1000), [params]);

    const handleInputChange = (newValue: string) => {
        const inputValue = newValue.replace(/\W/g, '');
        setQuery(inputValue);
        return inputValue;
    };

    return (
        <div className="relative flex items-center">
            <div className={stl.wrapper}>
                <AsyncCreatableSelect
                    cacheOptions
                    defaultOptions={options}
                    loadOptions={debouncedLoadOptions}
                    onInputChange={handleInputChange}
                    onChange={(obj: any) => props.onSelect(null, obj)}
                    styles={dropdownStyles}
                    placeholder={placeholder}
                    value={value ? options.find((i: any) => i.value === query) : null}
                    components={{
                        IndicatorSeparator: () => null,
                        DropdownIndicator,
                    }}
                />
                <div className={stl.right}>
                    {showCloseButton && (
                        <div onClick={props.onRemoveValue}>
                            <Icon name="close" size="12" />
                        </div>
                    )}
                    {showOrButton && (
                        <div onClick={props.onAddValue} className="color-teal">
                            <span className="px-1">or</span>
                        </div>
                    )}
                </div>
            </div>

            {!showOrButton && <div className="ml-3">or</div>}
        </div>
    );
}

export default FilterAutoComplete;

const DropdownIndicator = (props: DropdownIndicatorProps<true>) => {
    return (
        <components.DropdownIndicator {...props}>
            <Icon name="chevron-down" size="16" />
        </components.DropdownIndicator>
    );
};
