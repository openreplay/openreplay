import React from 'react';
import Select, { components, DropdownIndicatorProps } from 'react-select';
import { Icon } from 'UI';
import colors from 'App/theme/colors';

interface Props {
    options: any[];
    isSearchable?: boolean;
    defaultValue?: string;
    plain?: boolean;
    components?: any;
    styles?: any;
    onChange: (value: any) => void;
    name?: string;
    [x:string]: any;
}
export default function({ name = '', onChange, right = false, plain = false, options, isSearchable = false, components = {}, defaultValue = '', ...rest }: Props) {
    const customStyles = {
        option: (provided, state) => ({
            ...provided,
            whiteSpace: 'nowrap',
            transition: 'all 0.3s',
            backgroundColor: state.isFocused ? colors['active-blue'] : 'transparent',
            color: state.isFocused ? colors.teal : 'black',
            '&:hover': {
                transition: 'all 0.2s',
                backgroundColor: colors['active-blue'],
            },
            '&:focus': {
                transition: 'all 0.2s',
                backgroundColor: colors['active-blue'],
            }
        }),
        menu: (provided: any, state: any) => ({
            ...provided,
            top: 31,
            borderRadius: '3px',
            right: right ? 0 : undefined,
            border: `1px solid ${colors['gray-light']}`,
            borderRadius: '3px',
            backgroundColor: '#fff',
            boxShadow: '1px 1px 1px rgba(0, 0, 0, 0.1)',
            position: 'absolute',
            minWidth: 'fit-content',
            zIndex: 99,
            overflow: 'hidden',
            zIndex: 100,
            ...(alignRight && { right: 0 })
        }),
        menuList: (provided, state) => ({
            ...provided,
            padding: 0,
        }),
        control: (provided: any) => {
            const obj = {
                ...provided,
                border: 'solid thin #ddd',
                cursor: 'pointer',
                minHeight: '36px',
                transition: 'all 0.5s',
                ['&:hover']: {
                    backgroundColor: colors['gray-lightest'],
                    transition: 'all 0.2s ease-in-out'
                }
            }
            if (plain) {
                obj['backgroundColor'] = 'transparent';
                obj['border'] = '1px solid transparent'
                obj['backgroundColor'] = 'transparent'
                obj['&:hover'] = {
                    borderColor: 'transparent',
                    backgroundColor: colors['gray-light'],
                    transition: 'all 0.2s ease-in-out'
                }
                obj['&:focus'] = {
                    borderColor: 'transparent'
                }
                obj['&:active'] = {
                    borderColor: 'transparent'
                }
            }
            return obj;
        },
        indicatorsContainer: (provided: any) => ({
            ...provided,
            padding: 0,
        }),
        valueContainer: (provided: any) => ({
            ...provided,
            paddingRight: '0px',
        }),
        singleValue: (provided: any, state: { isDisabled: any; }) => {
          const opacity = state.isDisabled ? 0.5 : 1;
          const transition = 'opacity 300ms';
      
          return { ...provided, opacity, transition };
        },
        noOptionsMessage: (provided) => ({
            ...provided,
            whiteSpace: 'nowrap !important',
            // minWidth: 'fit-content',
        }),
    }


    return (
        <Select
            options={options}
            isSearchable={isSearchable}
            defaultValue={defaultSelected}
            components={{
                IndicatorSeparator: () => null,
                DropdownIndicator,
                ...components,
            }}
            onChange={(value) => onChange({ name, value: value })}
            styles={{ ...customStyles, ...styles }}
            theme={(theme) => ({
                ...theme,
                colors: {
                    ...theme.colors,
                    primary: '#394EFF',
                }
            })}
            blurInputOnSelect={true}
            // menuPosition="fixed"
            {...rest}
        />
    );
}

const DropdownIndicator = (
    props: DropdownIndicatorProps<true>
  ) => {
    return (
      <components.DropdownIndicator {...props}>
        <Icon name="chevron-down" size="16" />
      </components.DropdownIndicator>
    );
  };