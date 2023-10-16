import React from 'react';
import { PageTitle } from 'UI';
import Select from 'Shared/Select';
import RecordingsSearch from './RecordingsSearch';
import RecordingsList from './RecordingsList';
import { useStore } from 'App/mstore';
import { connect } from 'react-redux';
import SelectDateRange from 'Shared/SelectDateRange/SelectDateRange';
import Period from 'Types/app/period';
import { observer } from 'mobx-react-lite';

interface Props {
  userId: string;
  filter: any;
}

function Recordings(props: Props) {
  const { userId } = props;
  const { recordingsStore } = useStore();

  const recordingsOwner = [
    { value: '0', label: 'All Videos' },
    { value: userId, label: 'My Videos' }
  ];

  const onDateChange = (e: any) => {
    recordingsStore.updateTimestamps(e);
  };

  return (
    <div style={{ maxWidth: '1360px', margin: 'auto' }} className='bg-white rounded py-4 border'>
      <div className='flex items-center mb-4 justify-between px-6'>
        <div className='flex items-baseline mr-3'>
          <PageTitle title='Recordings' />
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

export default connect((state: any) => ({
  userId: state.getIn(['user', 'account', 'id'])
}))(observer(Recordings));
