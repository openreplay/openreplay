import React from 'react';
import DataItemPage from '../DataItemPage';
import type { CommonProp } from './commonProp';
import { dataManagement, withSiteId } from '@/routes';
import { updateProperty } from './api';
import type { DistinctProperty } from './api';
import { toast } from 'react-toastify';

function EventPropsPage({
  event,
  siteId,
  raw,
}: {
  event: CommonProp;
  siteId: string;
  raw: DistinctProperty;
}) {
  const backLink = withSiteId(dataManagement.properties(), siteId);

  const onSave = async (property: { key: string; value: string }) => {
    try {
      const updatedEvent = raw;
      updatedEvent[property.key.toLocaleLowerCase()] = property.value;
      await updateProperty({ ...updatedEvent, source: 'events' });
      toast.success('Property updated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update property');
    }
  };
  return (
    <DataItemPage
      type="event"
      item={event}
      onSave={onSave}
      backLink={{ name: 'Event Properties', to: backLink }}
      footer={
        <div className={'rounded-lg border bg-white'}>
          <EventsWithProp />
        </div>
      }
    />
  );
}

function EventsWithProp() {
  return (
    <div className="py-4 flex flex-col gap-2">
      <span className="text-xl font-semibold px-4">
        Events with this property
      </span>
      <div>table</div>
    </div>
  );
}

export default EventPropsPage;
