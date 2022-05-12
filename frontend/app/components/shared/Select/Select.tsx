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
    [x:string]: any;
}
export default function({ styles= {}, alignRight = false, plain = false, options, isSearchable = false, components = {}, defaultValue = '', ...rest }: Props) {
    const defaultSelected = defaultValue ? options.find(x => x.value === defaultValue) : null;

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
        menu: (provided, state) => ({
            ...provided,
            top: 31,
            border: `1px solid ${colors['gray-light']}`,
            borderRadius: '3px',
            backgroundColor: '#fff',
            boxShadow: '1px 1px 1px rgba(0, 0, 0, 0.1)',
            position: 'absolute',
            minWidth: 'fit-content',
            overflow: 'hidden',
            ...(alignRight && { right: 0 })
        }),
        menuList: (provided, state) => ({
            ...provided,
            padding: 0,
        }),
        control: (provided) => {
            const obj = {
                ...provided,
                border: 'solid thin #ddd',
                cursor: 'pointer',
                transition: 'all 0.5s',
            }
            if (plain) {
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
        valueContainer: (provided) => ({
            ...provided,
            paddingRight: '0px',
        }),
        singleValue: (provided, state) => {
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
        <Icon name="chevron-down" size="18" />
      </components.DropdownIndicator>
    );
  };