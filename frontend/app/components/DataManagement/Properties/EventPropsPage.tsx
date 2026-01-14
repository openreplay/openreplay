import React from 'react';
import DataItemPage from '../DataItemPage';
import type { CommonProp } from './commonProp';
import { dataManagement, withSiteId } from '@/routes';
import { updateProperty } from './api';
import type { DistinctProperty } from './api';
import { toast } from 'react-toastify';
import EventsWithProp from './EventsWithProp';

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
      const updatedEvent = { ...raw };
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
      footer={<EventsWithProp propName={raw.name} />}
    />
  );
}

export default EventPropsPage;
