import React from 'react'
import Select from 'Shared/Select';
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
    .map(([ value, label ]) => ({ value, label }));

  const writeOption = ({ value }) => setTimezone(value);

  return (
    <div>
      <Select
        plain
        right
        name="sortSessions"
        options={ sortOptions }
        onChange={ writeOption }
        defaultValue={ local || sortOptions[ 0 ].value }
      />
    </div>
  )
}

export default connect(state => ({
  local: state.getIn(['sessions', 'timezone']),
}), { setTimezone })(TimezoneDropdown)
