import { Radio } from 'antd';
import { toJS } from 'mobx';
import { useObserver } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { toast } from 'react-toastify';

import { useStore } from 'App/mstore';
import { Timezone } from 'App/mstore/types/sessionSettings';
import { Button } from 'UI';

import Select from 'Shared/Select';

type TimezonesDropdown = Timezone[];

function DefaultTimezone() {
  const { settingsStore } = useStore();
  const sessionSettings = useObserver(() => settingsStore.sessionSettings);
  const [changed, setChanged] = React.useState(false);
  const [shownTimezone, setShownTimezone] = React.useState<'user' | 'local'>(
    sessionSettings.shownTimezone
  );
  const timezoneOptions: TimezonesDropdown =
    settingsStore.sessionSettings.defaultTimezones;
  const [timezone, setTimezone] = React.useState(
    settingsStore.sessionSettings.timezone
  );

  useEffect(() => {
    if (!timezone) setTimezone({ label: 'Local Timezone', value: 'system' });
  }, []);

  const getCurrentTimezone = () => {
    const timezoneOffset = Math.floor(new Date().getTimezoneOffset() / -60);
    const remainingVal = Math.abs(new Date().getTimezoneOffset() % 60);
    const sign = timezoneOffset > 0 ? '+' : '-';
    const tzOffsHrs = Math.abs(timezoneOffset)
      .toString()
      .padStart(2, '0');
    const tzOffsMins = remainingVal ? `:${remainingVal.toString().padStart(2, '0')}` : '';
    const timezoneValue = `UTC${sign}${tzOffsHrs}${tzOffsMins}`;
    const selectedTimezone = timezoneOptions.find(
      (option) => option.value === timezoneValue
    );
    return selectedTimezone ? selectedTimezone : null;
  };

  const setCurrentTimezone = () => {
    const selectedTimezone = getCurrentTimezone();
    if (selectedTimezone) {
      setTimezone(selectedTimezone);
      sessionSettings.updateTimezone(selectedTimezone);
      toast.success('Default timezone saved successfully');
    }
  };

  const onSelectChange = ({ value }: { value: Timezone }) => {
    setTimezone(value);
    setChanged(true);
  };

  const onTimezoneSave = () => {
    setChanged(false);
    sessionSettings.updateTimezone(timezone);
    toast.success('Default timezone saved successfully');
  };

  const updateDisplayedTZ = (value: 'user' | 'local') => {
    sessionSettings.updateKey('shownTimezone', value);
    setShownTimezone(value);
  };

  return (
    <>
      <h3 className="text-lg">Default Timezone</h3>
      <div className="my-1">
        Set the timezone for this project. All Sessions, Charts will be
        referenced to this.
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
      {shownTimezone === 'local' ? (
        <>
          <div className="mt-2 flex items-center" style={{ width: '265px' }}>
            <Select
              options={timezoneOptions}
              defaultValue={timezone.value}
              className="w-full"
              value={timezoneOptions.find(
                (option) => option.value === timezone.value
              )}
              onChange={onSelectChange}
            />
            <div className="col-span-3 ml-3">
              <Button
                disabled={!changed}
                variant="outline"
                size="medium"
                onClick={onTimezoneSave}
              >
                Update
              </Button>
            </div>
          </div>
          <div onClick={setCurrentTimezone} className="mt-3 link">
            Apply my current timezone
          </div>
        </>
      ) : null}
    </>
  );
}

export default DefaultTimezone;
