import { Radio, Button } from 'antd';
import { useObserver } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { toast } from 'react-toastify';

import { useStore } from 'App/mstore';
import { Timezone } from 'App/mstore/types/sessionSettings';
import { Icon } from 'UI';
import Select from 'Shared/Select';
import { useTranslation } from 'react-i18next';

type TimezonesDropdown = Timezone[];

function DefaultTimezone() {
  const { t } = useTranslation();
  const { settingsStore } = useStore();
  const sessionSettings = useObserver(() => settingsStore.sessionSettings);
  const [changed, setChanged] = React.useState(false);
  const [shownTimezone, setShownTimezone] = React.useState<'user' | 'local'>(
    sessionSettings.shownTimezone,
  );
  const timezoneOptions: TimezonesDropdown =
    settingsStore.sessionSettings.defaultTimezones;
  const [timezone, setTimezone] = React.useState(
    settingsStore.sessionSettings.timezone,
  );
  const [isLocal, setIsLocal] = React.useState(
    settingsStore.sessionSettings.usingLocal,
  );

  useEffect(() => {
    if (!timezone) setTimezone({ label: 'Local Timezone', value: 'system' });
  }, []);

  const getCurrentTimezone = () => {
    const timezoneOffset = Math.floor(new Date().getTimezoneOffset() / -60);
    const remainingVal = Math.abs(new Date().getTimezoneOffset() % 60);
    const sign = timezoneOffset > 0 ? '+' : '-';
    const tzOffsHrs = Math.abs(timezoneOffset).toString().padStart(2, '0');
    const tzOffsMins = remainingVal
      ? `:${remainingVal.toString().padStart(2, '0')}`
      : '';
    const timezoneValue = `UTC${sign}${tzOffsHrs}${tzOffsMins}`;
    const selectedTimezone = timezoneOptions.find(
      (option) => option.value === timezoneValue,
    );
    return selectedTimezone || null;
  };

  const setCurrentTimezone = () => {
    const selectedTimezone = getCurrentTimezone();
    if (selectedTimezone) {
      setTimezone(selectedTimezone);
      setIsLocal(true);
      sessionSettings.updateTimezone(selectedTimezone, true);
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
    setIsLocal(false);
    toast.success('Default timezone saved successfully');
  };

  const updateDisplayedTZ = (value: 'user' | 'local') => {
    sessionSettings.updateKey('shownTimezone', value);
    setShownTimezone(value);
  };

  return (
    <>
      <h3 className="text-lg">{t('Default Timezone')}</h3>
      <div className="my-1">
        {t(
          'Set the timezone for this project. All Sessions, Charts will be referenced to this.',
        )}
      </div>
      <div>
        <Radio.Group
          onChange={(e) => {
            updateDisplayedTZ(e.target.value);
          }}
          value={shownTimezone}
        >
          <Radio.Button value="local">{t('Local Timezone')}</Radio.Button>
          <Radio.Button value="user">{t("End User's Timezone")}</Radio.Button>
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
                (option) => option.value === timezone.value,
              )}
              onChange={onSelectChange}
            />
            <div className="col-span-3 ml-3">
              <Button
                disabled={!changed}
                type="default"
                onClick={onTimezoneSave}
              >
                {t('Update')}
              </Button>
            </div>
          </div>
          <div className="mt-3 flex gap-1 items-center">
            <div onClick={setCurrentTimezone} className="link">
              {t('Apply my current timezone')}
            </div>
            {isLocal ? <Icon name="check" size={18} /> : null}
          </div>
        </>
      ) : null}
    </>
  );
}

export default DefaultTimezone;
