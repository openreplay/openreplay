import React, { useState, useEffect } from 'react';
import { Icon } from 'UI';
import APIClient from 'App/api_client';
import { debounce } from 'App/utils';
import stl from './FilterAutoComplete.module.css';
import { components, DropdownIndicatorProps } from 'react-select';
import colors from 'App/theme/colors';
import Select from 'react-select';
import cn from 'classnames';

const dropdownStyles = {
    option: (provided: any, state: any) => ({
        ...provided,
        whiteSpace: 'nowrap',
        transition: 'all 0.3s',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        backgroundColor: state.isFocused ? colors['active-blue'] : 'transparent',
        color: state.isFocused ? colors.teal : 'black',
        fontSize: '14px',
        '&:hover': {
            transition: 'all 0.2s',
            backgroundColor: colors['active-blue'],
        },
        '&:focus': {
            transition: 'all 0.2s',
            backgroundColor: colors['active-blue'],
        },
    }),
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
    indicatorsContainer: (provided: any) => ({
        ...provided,
        padding: '0px',
        height: '26px',
    }),
    menu: (provided: any, state: any) => ({
        ...provided,
        top: 0,
        borderRadius: '3px',
        border: `1px solid ${colors['gray-light']}`,
        backgroundColor: '#fff',
        boxShadow: '1px 1px 1px rgba(0, 0, 0, 0.1)',
        position: 'absolute',
        width: 'unset',
        maxWidth: '300px',
        overflow: 'hidden',
        zIndex: 100,
    }),
    menuList: (provided: any, state: any) => ({
        ...provided,
        padding: 0,
    }),
    noOptionsMessage: (provided: any) => ({
        ...provided,
        whiteSpace: 'nowrap !important',
        // minWidth: 'fit-content',
    }),
    container: (provided: any) => ({
        ...provided,
        top: '18px',
        position: 'absolute',
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
    hideOrText?: boolean
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
        hideOrText = false,
    } = props;
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<any>([]);
    const [query, setQuery] = useState(value);
    const [menuIsOpen, setMenuIsOpen] = useState(false);
    const [initialFocus, setInitialFocus] = useState(false);
    let selectRef: any = null;
    let inputRef: any = null;

    useEffect(() => {
        setQuery(value);
    }, [value])

    const loadOptions = (inputValue: string, callback: (options: []) => void) => {
        // remove underscore from params
        const _params: Record<string, string> = {}
        const keys = Object.keys(params);
        keys.forEach((key) => {
            _params[key.replace('_', '')] = params[key];
        })

        new APIClient()
            [method?.toLocaleLowerCase()](endpoint, { ..._params, q: inputValue })
            .then((response: any) => {
                    return response.json();
            })
            .then(({ data }: any) => {
                const _options = data.map((i: any) => ({ value: i.value, label: i.value })) || [];
                setOptions(_options);
                callback(_options);
                setLoading(false);
            })
          .catch((e) => {
              throw new Error(e);
          })
    };

    const debouncedLoadOptions = React.useCallback(debounce(loadOptions, 1000), [params]);

    const handleInputChange = (newValue: string) => {
        // const inputValue = newValue.replace(/\W/g, '');
        setLoading(true);
        setInitialFocus(true);
        setQuery(newValue);
        debouncedLoadOptions(newValue, (opt: any) => {
            selectRef?.focus();
        });
    };

    const onChange = (item: any) => {
        setMenuIsOpen(false);
        setQuery(item);
        props.onSelect(null, item);
        // inputRef?.blur();
    };

    const onFocus = () => {
        setMenuIsOpen(true);
    };

    const onBlur = () => {
        setMenuIsOpen(false);
        props.onSelect(null, query);
    };

    const selected = value ? options.find((i: any) => i.value === query) : null;

    return (
        <div className="relative flex items-center">
            <div className={cn(stl.wrapper, 'relative')}>
                <input
                    ref={(ref: any) => (inputRef = ref)}
                    className="w-full rounded px-2 no-focus"
                    value={query}
                    onChange={({ target: { value } }: any) => handleInputChange(value)}
                    onClick={onFocus}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    onKeyDown={(e: any) => {
                        if (e.key === 'Enter') {
                            inputRef?.blur();
                        }
                    }}
                />
                {loading && (
                    <div className="absolute top-0 right-0" style={{ marginTop: '5px', marginRight: !showCloseButton || (showCloseButton && !showOrButton) ? '34px' : '62px'}}>
                        <Icon name="spinner" className="animate-spin" size="14" />
                    </div>
                )}
                <Select
                    ref={(ref: any) => {
                        selectRef = ref;
                    }}
                    options={options}
                    value={selected}
                    onChange={(e: any) => onChange(e.value)}
                    menuIsOpen={initialFocus && menuIsOpen}
                    menuPlacement="auto"
                    noOptionsMessage={() => loading ? 'Loading...' : 'No results found'}
                    styles={dropdownStyles}
                    components={{
                        Control: ({ children, ...props }: any) => <></>,
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

            {!showOrButton && !hideOrText && <div className="ml-3">or</div>}
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
