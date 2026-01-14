import React from 'react';
import type { DistinctEvent } from './api';
import { dataManagement, withSiteId } from '@/routes';
import DataItemPage from '../DataItemPage';
import { toast } from 'react-toastify';
import { updateEventProperty } from './api';
import DistinctEventPropsList from './DistinctEventPropsList';

function DistinctEventPage({
  event,
  siteId,
}: {
  event: DistinctEvent;
  siteId: string;
}) {
  const backLink = withSiteId(dataManagement.eventsList(), siteId);

  const onSave = async (property: { key: string; value: string }) => {
    try {
      const updatedEvent = event;
      event[property.key.toLocaleLowerCase()] = property.value;
      await updateEventProperty(updatedEvent);
      toast.success('Property updated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update property');
    }
  };
  return (
    <DataItemPage
      onSave={onSave}
      item={{
        name: event.name,
        fields: {
          displayName: { value: event.displayName, readonly: false },
          description: { value: event.description, readonly: false },
          volume: { value: event.count.toString(), readonly: true },
        },
      }}
      backLink={{
        name: 'Events',
        to: backLink,
      }}
      type="distinct_event"
      footer={<DistinctEventPropsList eventName={event.name} />}
    />
  );
}

export default DistinctEventPage;
