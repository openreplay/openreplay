import React from 'react';
import Select from 'react-select';

interface Props {
    options: any[];
    isSearchable?: boolean;
    defaultValue?: string;
    plain?: boolean;
    [x:string]: any;
}
export default function({ plain = false, options, isSearchable = false, defaultValue = '', ...rest }: Props) {
    const customStyles = {
        option: (provided, state) => ({
          ...provided,
          whiteSpace: 'nowrap',
        }),
        menu: (provided, state) => ({
            ...provided,
            top: 31,
        }),
        control: (provided) => {
            const obj = {
                ...provided,
                border: 'solid thin #ddd'
            }
            if (plain) {
                obj['border'] = '1px solid transparent'
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
    const defaultSelected = defaultValue ? options.find(x => x.value === defaultValue) : options[0];
    return (
        <Select
            options={options}
            isSearchable={isSearchable}
            defaultValue={defaultSelected}
            components={{
                IndicatorSeparator: () => null
            }}
            styles={customStyles}
            theme={(theme) => ({
                ...theme,
                colors: {
                    ...theme.colors,
                    primary: '#394EFF',
                }
            })}
            {...rest}
        />
    );
}

// export default Select;