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
export default function({ right = false, plain = false, options, isSearchable = false, components = {}, defaultValue = '', ...rest }: Props) {
    const customStyles = {
        option: (provided, state) => ({
          ...provided,
          whiteSpace: 'nowrap',
        }),
        menu: (provided, state) => ({
            ...provided,
            top: 31,
            right: right ? 0 : undefined,
            minWidth: 'fit-content',
        }),
        control: (provided) => {
            const obj = {
                ...provided,
                border: 'solid thin #ddd',
                cursor: 'pointer',
            }
            if (plain) {
                obj['backgroundColor'] = 'transparent';
                obj['border'] = '1px solid transparent'
                obj['&:hover'] = {
                    borderColor: 'transparent',
                    backgroundColor: colors['gray-light']
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
    const defaultSelected = defaultValue ? options.find(x => x.value === defaultValue) : null;
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