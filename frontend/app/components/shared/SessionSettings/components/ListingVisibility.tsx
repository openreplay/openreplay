import React from 'react';
import Select from 'Shared/Select';
import { Input } from 'UI';
import { Button } from 'antd';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

function ListingVisibility() {
  const { t } = useTranslation();
  const [changed, setChanged] = React.useState(false);
  const { settingsStore } = useStore();
  const { sessionSettings } = settingsStore;
  const [durationSettings, setDurationSettings] = React.useState(
    sessionSettings.durationFilter,
  );

  const numberOptions = [
    { label: t('Less than'), value: '<' },
    { label: t('Greater than'), value: '>' },
  ];
  const periodOptions = [
    { label: t('Mins'), value: 'min' },
    { label: t('Secs'), value: 'sec' },
  ];

  const changeSettings = (changes: any) => {
    setDurationSettings({ ...durationSettings, ...changes });
    setChanged(true);
  };
  const saveSettings = () => {
    sessionSettings.updateKey('durationFilter', durationSettings);
    setChanged(false);
    toast.success(t('Listing visibility settings saved successfully'));
  };

  return (
    <>
      <h3 className="text-lg">{t('Listing Visibility')}</h3>
      <div className="my-1">{t('Do not show sessions with duration:')}</div>
      <div className="grid grid-cols-12 gap-2 mt-2">
        <div className="col-span-4">
          <Select
            options={numberOptions.map((o) => ({ ...o, label: t(o.label) }))}
            defaultValue={durationSettings.operator || numberOptions[0].value}
            onChange={({ value }) => {
              changeSettings({ operator: value.value });
            }}
          />
        </div>
        <div className="col-span-2">
          <Input
            value={durationSettings.count}
            type="number"
            name="count"
            min={0}
            placeholder="E.g 10"
            onChange={({ target: { value } }: any) => {
              changeSettings({ count: value > 0 ? value : '' });
            }}
          />
        </div>
        <div className="col-span-3">
          <Select
            defaultValue={durationSettings.countType || periodOptions[0].value}
            options={periodOptions}
            onChange={({ value }) => {
              changeSettings({ countType: value.value });
            }}
          />
        </div>
        <div className="col-span-3">
          <Button type="default" disabled={!changed} onClick={saveSettings}>
            {t('Update')}
          </Button>
        </div>
      </div>
    </>
  );
}

export default observer(ListingVisibility);
