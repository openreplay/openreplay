import React from 'react'
import { Dropdown } from 'semantic-ui-react'
import { Icon } from 'UI';
import stl from './dropdownPlain.css'

const sessionSortOptions = {
  'latest': 'Newest',
  'editedAt': 'Last Modified'
};
const sortOptions = Object.entries(sessionSortOptions)
  .map(([ value, text ]) => ({ value, text }));

function DropdownPlain({ name, label, options, onChange, defaultValue, wrapperStyle = {}, disabled = false }) {
  return (
    <div className="flex items-center" style={wrapperStyle}>
      { label &&  <span className="mr-2 color-gray-medium">{label}</span> }
      <Dropdown
        name={name}
        className={ stl.dropdown }
        // pointing="top right"
        options={ options }
        onChange={ onChange }
        defaultValue={ defaultValue || options[ 0 ].value }
        icon={null}
        disabled={disabled}
        icon={ <Icon name="chevron-down" color="gray-dark" size="14" className={stl.dropdownIcon} /> }
      />
    </div>
  )
}

export default DropdownPlain
