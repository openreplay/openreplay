import React from 'react'
import stl from './DropdownPlain.module.css';
import { Dropdown, Icon } from 'UI';

interface Props {
    name?: string;
    options: any[];
    onChange: (e, { name, value }) => void;
    icon?: string;
    direction?: string;
    value?: any;
    multiple?: boolean;
}

export default function DropdownPlain(props: Props) {
    const { name = "sort", value, options, icon = "chevron-down", direction = "right", multiple = false } = props;
    return (
        <div>
            <Dropdown
                value={value}
                name={name}
                className={ stl.dropdown }
                direction={direction}
                options={ options }
                onChange={ props.onChange }
                // floating
                scrolling
                multiple={ multiple }
                selectOnBlur={ false }
                // defaultValue={ value }
                icon={ icon ? <Icon name="chevron-down" color="gray-dark" size="14" className={stl.dropdownIcon} /> : null }
            />
        </div>
    )
}
