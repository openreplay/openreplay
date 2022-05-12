import React from 'react'
import { Dropdown } from 'semantic-ui-react';
import { Icon } from 'UI';
import stl from './timezoneDropdown.css';
import { connect } from 'react-redux';
import { setTimezone } from 'Duck/sessions';

const localMachineFormat = new Date().toString().match(/([A-Z]+[\+-][0-9]+)/)[1]
const middlePoint = localMachineFormat.length - 2
const readableLocalTimezone = 
  `${localMachineFormat.substring(0, 3)} ${localMachineFormat.substring(3, middlePoint)}:${localMachineFormat.substring(middlePoint)}`

const timezoneOptions = {
  'local': readableLocalTimezone,
  'UTC': 'UTC'
};

function TimezoneDropdown({ local, setTimezone }) {
  const sortOptions = Object.entries(timezoneOptions)
    .map(([ value, text ]) => ({ value, text }));

  const writeOption = (e, { name, value }) => setTimezone(value);

  return (
    <div>
      <Dropdown
        name="sortSessions"
        className={ stl.dropdown }
        options={ sortOptions }
        onChange={ writeOption }
        defaultValue={ local || sortOptions[ 0 ].value }
        icon={ <Icon name="chevron-down" color="gray-dark" size="14" className={stl.dropdownIcon} /> }
      />
    </div>
  )
}

export default connect(state => ({
  local: state.getIn(['sessions', 'timezone']),
}), { setTimezone })(TimezoneDropdown)
