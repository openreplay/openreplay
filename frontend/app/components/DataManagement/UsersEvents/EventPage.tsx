import React from 'react';
import { Button, Input, Segmented, Table } from 'antd';
import Breadcrumb from 'Shared/Breadcrumb';
import { Triangle } from '../Activity/EventDetailsModal';
import cn from 'classnames';
import { EditOutlined } from '@ant-design/icons';
import DataItemPage from '../DataItemPage';

function EventPage() {
  const [tab, setTab] = React.useState('all');
  const tabs = [
    {
      label: 'All Properties',
      value: 'all',
    },
    {
      label: 'Openreplay',
      value: 'default',
    },
    {
      label: 'Custom',
      value: 'custom',
    },
  ];

  const evWithFields = {
    // ...testAutoEv,
    // fields: [
    //   { name: 'User ID', value: testAutoEv.defaultFields.userId },
    //   { name: 'User Location', value: testAutoEv.defaultFields.userLocation },
    //   {
    //     name: 'User Environment',
    //     value: testAutoEv.defaultFields.userEnvironment,
    //   },
    // ],
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
