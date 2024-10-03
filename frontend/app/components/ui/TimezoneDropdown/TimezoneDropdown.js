import React from 'react'
import Select from 'Shared/Select';
import { observer } from 'mobx-react-lite';
import { useStore } from "App/mstore";

const localMachineFormat = new Date().toString().match(/([A-Z]+[\+-][0-9]+)/)[1]
const middlePoint = localMachineFormat.length - 2
const readableLocalTimezone = 
  `${localMachineFormat.substring(0, 3)} ${localMachineFormat.substring(3, middlePoint)}:${localMachineFormat.substring(middlePoint)}`

const timezoneOptions = {
  'local': readableLocalTimezone,
  'UTC': 'UTC'
};

function TimezoneDropdown() {
  const { sessionStore } = useStore();
  const local = sessionStore.timezone;
  const setTimezone = sessionStore.setTimezone;
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

export default observer(TimezoneDropdown)
