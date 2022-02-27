import React from 'react'
import stl from './DropdownPlain.css';
import { Dropdown, Icon } from 'UI';

interface Props {
    name?: string;
    options: any[];
    onChange: (e, { name, value }) => void;
    icon?: string;
    direction?: string;
    value: any;
}

export default function DropdownPlain(props: Props) {
    const { name = "sort", value, options, icon = "chevron-down", direction = "left" } = props;
    return (
        <div>
            <Dropdown
                value={value}
                name={name}
                className={ stl.dropdown }
                direction={direction}
                options={ options }
                onChange={ props.onChange }
                floating
                scrolling
                selectOnBlur={ false }
                // defaultValue={ value }
                icon={ icon ? <Icon name="chevron-down" color="gray-dark" size="14" className={stl.dropdownIcon} /> : null }
            />
        </div>
    )
}
