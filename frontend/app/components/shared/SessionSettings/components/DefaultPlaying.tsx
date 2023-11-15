import React from 'react';
import { Switch } from 'antd';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import { toast } from 'react-toastify';

function DefaultPlaying() {
  const { settingsStore } = useStore();
  const sessionSettings = useObserver(() => settingsStore.sessionSettings);

  const toggleSkipToIssue = () => {
    sessionSettings.updateKey('skipToIssue', !sessionSettings.skipToIssue);
    toast.success('Default playing option saved successfully');
  };


  return useObserver(() => (
    <>
      <h3 className='text-lg'>Default Playing Option</h3>
      <div className='my-1'>Always start playing the session from the first issue</div>
      <div className='mt-2'>
        <Switch
          checked={sessionSettings.skipToIssue}
          onChange={toggleSkipToIssue}
        />
      </div>
    </>
  ));
}

export default DefaultPlaying;
