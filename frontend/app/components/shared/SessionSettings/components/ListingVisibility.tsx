import React from 'react';
import Select from 'Shared/Select';
import { Input } from 'UI';
import { Button } from 'antd';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { toast } from 'react-toastify';

const numberOptions = [
  { label: 'Less than', value: '<' },
  { label: 'Greater than', value: '>' },
];
const periodOptions = [
  { label: 'Mins', value: 'min' },
  { label: 'Secs', value: 'sec' },
];

function ListingVisibility() {
  const [changed, setChanged] = React.useState(false);
  const { settingsStore } = useStore();
  const { sessionSettings } = settingsStore;
  const [durationSettings, setDurationSettings] = React.useState(sessionSettings.durationFilter);

  const changeSettings = (changes: any) => {
    setDurationSettings({ ...durationSettings, ...changes });
    setChanged(true);
  };
  const saveSettings = () => {
    sessionSettings.updateKey('durationFilter', durationSettings);
    setChanged(false);
    toast.success('Listing visibility settings saved successfully');
  };

  return (
    <>
      <h3 className="text-lg">Listing Visibility</h3>
      <div className="my-1">Do not show sessions with duration:</div>
      <div className="grid grid-cols-12 gap-2 mt-2">
        <div className="col-span-4">
          <Select
            options={numberOptions}
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
          <Button type="default" disabled={!changed} onClick={saveSettings}>Update</Button>
        </div>
      </div>
    </>
  );
}

export default observer(ListingVisibility);
