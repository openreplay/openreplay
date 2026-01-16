import React from 'react';
import DataItemPage from '../DataItemPage';
import type { CommonProp } from './commonProp';
import { dataManagement, withSiteId } from '@/routes';
import { updateProperty } from './api';
import type { DistinctProperty } from './api';
import { toast } from 'react-toastify';
import UsersWithProp from './UsersWithProp';

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
      const updatedEvent = { ...raw };
      updatedEvent[property.key] = property.value;
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
          <UsersWithProp propName={raw.name} />
        </div>
      }
    />
  );
}

export default UserPropsPage;
