import React from 'react';
import DataItemPage from '../DataItemPage';
import type { CommonProp } from './commonProp';

function EventPropsPage() {
  const evWithFields: CommonProp = {
    id: 'event_signed_up',
    name: 'sign_up_ev',
    fields: {
      displayName: { value: 'Sign Up Event', readonly: false },
      description: { value: 'Event when user signs up', readonly: false },
      volume: { value: '5,678', readonly: true },
      type: { value: 'Event', readonly: true },
    },
  };
  return (
    <DataItemPage
      type="event"
      item={evWithFields}
      backLink={{ name: 'Event Properties', to: '/data/events' }}
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
