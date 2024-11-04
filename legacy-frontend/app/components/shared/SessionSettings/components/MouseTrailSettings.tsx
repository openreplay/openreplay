import React from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { Switch } from 'UI';

function MouseTrailSettings() {
  const { settingsStore } = useStore();
  const sessionSettings = settingsStore.sessionSettings;
  const mouseTrail = sessionSettings.mouseTrail;

  const updateSettings = (checked: boolean) => {
    settingsStore.sessionSettings.updateKey('mouseTrail', !mouseTrail);
  };

  return (
    <>
      <h3 className='text-lg'>Mouse Trail</h3>
      <div className='my-1'>See mouse trail to easily spot user activity.</div>
      <div className='mt-2'>
        <Switch onChange={updateSettings} checked={mouseTrail} />
      </div>
    </>
  );
}

export default observer(MouseTrailSettings);
