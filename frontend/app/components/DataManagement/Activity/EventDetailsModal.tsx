import React from 'react'
import { EventData } from './data/Event'
import { Segmented, Input } from 'antd';
import { X } from 'lucide-react';

function EventDetailsModal({ ev, onClose }: { ev: EventData, onClose: () => void }) {
  const tabs = [
    {
      label: 'All Properties',
    },
    {
      label: 'Custom Properties',
    },
    {
      label: 'Default Properties',
    }
  ]

  const views = [
    {
      label: 'icn1',
      value: 'pretty',
    },
    {
      label: 'icn2',
      value: 'json',
    }
  ]
  const [query, setQuery] = React.useState('')
  const [view, setView] = React.useState(views[0].value)
  const dataFields = { ...ev.$_defaultFields, ...ev.$_customFields }
  const fieldArr = Object.entries(dataFields)
  const filteredArr = fieldArr.filter(([key, value]) => {
    const qReg = new RegExp(query, 'ig')
    return qReg.test(key) || qReg.test(value)
  })

  return (
    <div className={'h-screen w-full flex flex-col gap-4 p-4'}>
      <div className={'flex justify-between items-center'}>
        <div className={'font-semibold text-lg'}>Event</div>
        <div className={'p-2 cursor-pointer'} onClick={onClose}>
          <X size={16} />
        </div>
      </div>
      <div className={'p-2 rounded-lg bg-active-blue flex items-center gap-2'}>
        <div>icn</div>
        <div>{ev.name}</div>
        <div className={'link ml-auto'}>Play Session</div>
      </div>
      <Segmented options={tabs} />
      <div className={'flex items-center gap-2'}>
        <Segmented
          value={view}
          options={views}
          size={'small'}
          onChange={(v) => setView(v)}
        />
        <Input.Search
          size={'small'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={'Find Property'}
        />
      </div>
      <div className={'overflow-y-auto flex flex-col gap-2'} style={{ height: 'calc(100% - 200px)' }}>
      {filteredArr.map(([key, value]) => (
        <div key={key} className={'flex items-center border-b'}>
          <div className={'flex-1'}>{key}</div>
          <div className={'flex-1 text-disabled-text'}>{value}</div>
        </div>
      ))}
      </div>
    </div>
  )
}

export default EventDetailsModal;