import React from 'react';
import { PageTitle } from 'UI';
import Select from 'Shared/Select';
import RecordingsSearch from './RecordingsSearch';
import RecordingsList from './RecordingsList';
import { useStore } from 'App/mstore';
import { connect } from 'react-redux';

function Recordings({ userId }: { userId: string }) {
  const { recordingsStore } = useStore();

  const recordingsOwner = [
    { value: '0', label: 'All Recordings' },
    { value: userId, label: 'My Recordings' },
  ];

  return (
    <div style={{ maxWidth: '1300px', margin: 'auto' }} className="bg-white rounded py-4 border">
      <div className="flex items-center mb-4 justify-between px-6">
        <div className="flex items-baseline mr-3">
          <PageTitle title="Recordings" />
        </div>
        <div className="ml-auto flex items-center">
          <Select
            name="recsOwner"
            plain
            right
            options={recordingsOwner}
            onChange={({ value }) => recordingsStore.setUserId(value.value)}
            defaultValue={recordingsOwner[0].value}
          />
          <div className="ml-4 w-1/4" style={{ minWidth: 300 }}>
            <RecordingsSearch />
          </div>
        </div>
      </div>
      <RecordingsList />
    </div>
  );
}

export default connect((state: any) => ({ userId: state.getIn(['user', 'account', 'id']) }))(
  Recordings
);
