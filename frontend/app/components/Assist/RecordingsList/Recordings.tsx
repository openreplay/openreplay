import React from 'react';
import { PageTitle } from 'UI';
import Select from 'Shared/Select';
import RecordingsSearch from './RecordingsSearch';
import RecordingsList from './RecordingsList';
import { useStore } from 'App/mstore';
import SelectDateRange from 'Shared/SelectDateRange/SelectDateRange';
import { observer } from 'mobx-react-lite';

function Recordings() {
  const { recordingsStore, userStore } = useStore();
  const userId = userStore.account.id;

  const recordingsOwner = [
    { value: '0', label: 'All Videos' },
    { value: userId, label: 'My Videos' }
  ];

  const onDateChange = (e: any) => {
    recordingsStore.updateTimestamps(e);
  };

  return (
    <div style={{ maxWidth: '1360px', margin: 'auto' }} className='bg-white rounded-lg py-4 border h-screen overflow-y-scroll'>
      <div className='flex items-center mb-4 justify-between px-6'>
        <div className='flex items-baseline mr-3'>
          <PageTitle title='Training Videos' />
        </div>
        <div className='ml-auto flex items-center gap-4'>
          <SelectDateRange period={recordingsStore.period} onChange={onDateChange} right={true} />
          <Select
            name='recsOwner'
            plain
            right
            options={recordingsOwner}
            onChange={({ value }) => recordingsStore.setUserId(value.value)}
            defaultValue={recordingsOwner[0].value}
          />
          <div className='w-1/4' style={{ minWidth: 300 }}>
            <RecordingsSearch />
          </div>
        </div>
      </div>
      <RecordingsList />
    </div>
  );
}

export default observer(Recordings);
