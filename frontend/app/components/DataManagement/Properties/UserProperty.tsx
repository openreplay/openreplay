import React from 'react';
import DataItemPage from '../DataItemPage';
import type { CommonProp } from './commonProp';
import { dataManagement, withSiteId } from '@/routes';
import { updateProperty } from './api';
import type { DistinctProperty } from './api';
import { toast } from 'react-toastify';

function UserPropsPage({
  properties,
  siteId,
  raw,
}: {
  properties: CommonProp;
  siteId: string;
  raw: DistinctProperty;
}) {
  const backLink = withSiteId(dataManagement.properties(), siteId);

  const onSave = async (property: { key: string; value: string }) => {
    try {
      const updatedEvent = raw;
      updatedEvent[property.key.toLocaleLowerCase()] = property.value;
      await updateProperty({ ...updatedEvent, source: 'users' });
      toast.success('Property updated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update property');
    }
  };
  return (
    <DataItemPage
      type="user"
      onSave={onSave}
      item={properties}
      backLink={{ name: 'User Properties', to: backLink }}
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
      <span className="text-xl font-semibold px-4">
        Users with this property
      </span>
      <div>table</div>
    </div>
  );
}

export default UserPropsPage;
