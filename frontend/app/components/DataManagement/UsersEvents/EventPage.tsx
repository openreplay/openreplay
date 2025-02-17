import React from 'react';
import { Button, Input, Segmented, Table } from 'antd';
import Breadcrumb from 'Shared/Breadcrumb';
import Event from 'Components/DataManagement/Activity/data/Event';
import { Triangle } from '../Activity/EventDetailsModal';
import cn from 'classnames';
import { EditOutlined } from '@ant-design/icons';
import DataItemPage from '../DataItemPage';

const testAutoEv = new Event({
  name: 'auto test ev',
  time: Date.now(),
  defaultFields: {
    userId: '123',
    userLocation: 'NY',
    userEnvironment: 'Mac OS',
  },
  customFields: {},
  isAutoCapture: true,
  sessionId: '123123',
  displayName: 'Test Auto Event',
  description: 'This is A test Auto Event',
  monthQuery: 100,
  monthVolume: 1000,
});

function EventPage() {
  const [tab, setTab] = React.useState('all');
  const tabs = [
    {
      label: 'All Properties',
      value: 'all',
    },
    {
      label: 'Openreplay Properties',
      value: 'default',
    },
    {
      label: 'Custom Properties',
      value: 'custom',
    },
  ];

  const evWithFields = {
    ...testAutoEv,
    fields: [
      { name: 'User ID', value: testAutoEv.defaultFields.userId },
      { name: 'User Location', value: testAutoEv.defaultFields.userLocation },
      {
        name: 'User Environment',
        value: testAutoEv.defaultFields.userEnvironment,
      },
    ],
  };
  return (
    <DataItemPage
      item={evWithFields}
      backLink={{ name: 'Events', to: '/data/events' }}
      footer={
        <div className={'rounded-lg border bg-white'}>
          <div className={'flex items-center gap-2 p-4'}>
            <div className={'font-semibold text-lg'}>Event Properties</div>
            <Segmented options={tabs} value={tab} onChange={(v) => setTab(v)} />
          </div>
        </div>
      }
    />
  );
}

export default EventPage;
