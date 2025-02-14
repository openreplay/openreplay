import React from 'react';
import { Button, Input, Segmented, Table } from 'antd';
import Breadcrumb from 'Shared/Breadcrumb';
import Event from 'Components/DataManagement/Activity/data/Event';
import { Triangle } from '../Activity/EventDetailsModal';
import cn from 'classnames';
import { EditOutlined } from '@ant-design/icons';

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
      label: 'Custom Properties',
      value: 'custom',
    },
    {
      label: 'Default Properties',
      value: 'default',
    }
  ]
  return (
    <div
      className={'flex flex-col gap-2 mx-auto w-full'}
      style={{ maxWidth: 1360 }}
    >
      <Breadcrumb
        items={[
          { label: 'Events', to: '/data-management/events' },
          { label: testAutoEv.name },
        ]}
      />
      <div className={'rounded-lg border bg-white flex flex-col'}>
        <div
          className={
            'p-4 border-b w-full flex items-center justify-between'
          }
        >
          <div
            className={'bg-gray-lighter rounded-xl px-2 font-semibold text-lg'}
          >
            {testAutoEv.name}
          </div>
          <div className={'link flex gap-1 items-center'}>
            <span>Play Sessions</span>
            <Triangle size={10} color={'blue'} />
          </div>
        </div>
        <EditableField onSave={() => null} fieldName={'Display Name'} value={testAutoEv.displayName} />
        <EditableField onSave={() => null} fieldName={'Description'} value={testAutoEv.description} />
        <EditableField onSave={() => null} fieldName={'30 Day Volume'} value={testAutoEv.monthVolume} />
      </div>

      <div className={'rounded-lg border bg-white'}>
        <div className={'flex items-center gap-2 p-4'}>
          <div className={'font-semibold text-lg'}>Event Properties</div>
          <Segmented options={tabs} value={tab} onChange={(v) => setTab(v)} />
        </div>
      </div>
    </div>
  );
}

function EditableField({
  onSave,
  fieldName,
  value,
}: {
  onSave: (value: string) => void
  fieldName: string
  value: string
}) {
  const [isEdit, setIsEdit] = React.useState(false);
  return (
    <div
      className={cn(
        'flex border-b last:border-b-0 items-center px-4 py-2 gap-2',
        isEdit ? 'bg-active-blue' : 'hover:bg-active-blue'
      )}
    >
      <div className={'font-semibold'} style={{ flex: 1 }}>
        {fieldName}
      </div>
      <div style={{ flex: 6 }}>
        {isEdit ? (
          <div className={'flex items-center gap-2'}>
            <Input size={'small'} defaultValue={value} />
            <div className={'ml-auto'} />
            <Button
              size={'small'}
              type={'text'}
              onClick={() => setIsEdit(false)}
            >
              Cancel
            </Button>
            <Button size={'small'} type={'primary'}>
              Save
            </Button>
          </div>
        ) : (
          <div className={'flex items-center justify-between'}>
            <span>{value}</span>
            <div className={'cursor-pointer text-main'} onClick={() => setIsEdit(true)}>
              <EditOutlined size={16} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EventPage