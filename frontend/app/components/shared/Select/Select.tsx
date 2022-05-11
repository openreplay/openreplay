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
    [x:string]: any;
}
export default function({ alignRight = false, plain = false, options, isSearchable = false, components = {}, defaultValue = '', ...rest }: Props) {
    const defaultSelected = defaultValue ? options.find(x => x.value === defaultValue) : null;

    const customStyles = {
        option: (provided, state) => ({
          ...provided,
          whiteSpace: 'nowrap',
        }),
        menu: (provided, state) => ({
            ...provided,
            top: 31,
            border: 'solid thin #ccc',
            borderRadius: '3px',
            backgroundColor: '#fff',
            boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
            position: 'absolute',
            minWidth: 'fit-content',
            ...(alignRight && { right: 0 })
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
        }
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
            styles={customStyles}
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