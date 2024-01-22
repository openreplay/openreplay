import React, { useEffect } from 'react';
import { Button } from 'UI';
import { Radio } from 'antd';

import Select from 'Shared/Select';
import { useStore } from 'App/mstore';
import { Timezone } from 'App/mstore/types/sessionSettings';
import { useObserver } from 'mobx-react-lite';
import { toast } from 'react-toastify';

type TimezonesDropdown = Timezone[];

function DefaultTimezone() {
  const { settingsStore } = useStore();
  const sessionSettings = useObserver(() => settingsStore.sessionSettings);
  const [changed, setChanged] = React.useState(false);
  const [shownTimezone, setShownTimezone] = React.useState<'user' | 'local'>(sessionSettings.shownTimezone);
  const timezoneOptions: TimezonesDropdown = settingsStore.sessionSettings.defaultTimezones;
  const [timezone, setTimezone] = React.useState(settingsStore.sessionSettings.timezone);

  useEffect(() => {
    if (!timezone) setTimezone({ label: 'Local Timezone', value: 'system' });
  }, []);

  const getCurrentTimezone = () => {
    const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneOffset = new Date().getTimezoneOffset() / -60;
    const timezoneValue = `UTC${
      (timezoneOffset >= 0 ? '+' : '-') + timezoneOffset.toString().padStart(2, '0')
    }`;
    const selectedTimezone = timezoneOptions.find(
      (option) => option.label.includes(currentTimezone) || option.value === timezoneValue
    );
    return selectedTimezone ? selectedTimezone : null;
  };

  const setCurrentTimezone = () => {
    const selectedTimezone = getCurrentTimezone();
    if (selectedTimezone) {
      setTimezone(selectedTimezone);
      sessionSettings.updateKey('timezone', selectedTimezone);
      toast.success('Default timezone saved successfully');
    }
  };

  const onSelectChange = ({ value }: { value: Timezone }) => {
    setTimezone(value);
    setChanged(true);
  };

  const onTimezoneSave = () => {
    setChanged(false);
    sessionSettings.updateKey('timezone', timezone);
    toast.success('Default timezone saved successfully');
  };

  const updateDisplayedTZ = (value: 'user' | 'local') => {
    sessionSettings.updateKey('shownTimezone', value)
    setShownTimezone(value)
  }

  return (
    <>
      <h3 className="text-lg">Default Timezone</h3>
      <div className="my-1">
        Set the timezone for this project. All Sessions, Charts will be referenced to this.
      </div>
      <div>
        <Radio.Group
          onChange={(e) => {
            updateDisplayedTZ(e.target.value);
          }}
          value={shownTimezone}
        >
          <Radio.Button value={'local'}>Local Timezone</Radio.Button>
          <Radio.Button value={'user'}>End User's Timezone</Radio.Button>
        </Radio.Group>
      </div>
      {shownTimezone === 'local' ?
        <>
        <div className="mt-2 flex items-center" style={{ width: '265px' }}>
          <Select
            options={timezoneOptions}
            defaultValue={timezone.value}
            className="w-full"
            value={timezoneOptions.find((option) => option.value === timezone.value)}
            onChange={onSelectChange}
          />
          <div className="col-span-3 ml-3">
            <Button disabled={!changed} variant="outline" size="medium" onClick={onTimezoneSave}>
              Update
            </Button>
          </div>
        </div>
        <div onClick={setCurrentTimezone} className="mt-3 link">
          Apply my current timezone
        </div>
        </>
      : null}
    </>
  );
}

export default DefaultTimezone;
