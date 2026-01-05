import React from 'react';
import DataItemPage from '../DataItemPage';
import type { CommonProp } from './commonProp';

function UserPropsPage() {
  const userWithFields: CommonProp = {
    id: 'user_loc',
    name: 'User_loc',
    fields: {
      displayName: { value: 'User Location', readonly: false },
      description: { value: 'Location of the user', readonly: false },
      volume: { value: '1,234', readonly: true },
      type: { value: 'String', readonly: true },
    },
  };
  return (
    <DataItemPage
      type="user"
      item={userWithFields}
      backLink={{ name: 'Event Properties', to: '/data/events' }}
      footer={
        <div className={'rounded-lg border bg-white'}>
          <UsersWithProp />
        </div>
      }
    />
  );
}

function UsersWithProp() {
  return (
    <div className="py-4 flex flex-col gap-2">
      <span className="text-xl font-semibold px-4">Users with this property</span>
      <div>table</div>
    </div>
  );
}

export default UserPropsPage;
