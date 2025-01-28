import React from 'react'
import { EventData } from './data/Event'
import { Segmented, Input } from 'antd';
import { X, List, Braces, Files } from 'lucide-react';
import copy from 'copy-to-clipboard'

function EventDetailsModal({ ev, onClose }: { ev: EventData, onClose: () => void }) {
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

  const views = [
    {
      label: <List size={14} />,
      value: 'pretty',
    },
    {
      label: <Braces size={14} />,
      value: 'json',
    }
  ]
  const [query, setQuery] = React.useState('')
  const [tab, setTab] = React.useState(tabs[0].value)
  const [view, setView] = React.useState(views[0].value)
  const tabProps = {
    all: { ...ev.$_defaultFields, ...ev.$_customFields },
    custom: ev.$_customFields,
    default: ev.$_defaultFields,
  }
  const dataFields = tabProps[tab]
  const fieldArr = Object.entries(dataFields)
  const filteredArr = view === 'json' ? [] : fieldArr.filter(([key, value]) => {
    const qReg = new RegExp(query, 'ig')
    return qReg.test(key) || qReg.test(value)
  })
  const strProps = JSON.stringify({
    event: ev.name,
    properties: dataFields
  }, null, 4)
  const highlightedJson = view === 'pretty' ? '' : query ? strProps.replace(
    new RegExp(query, 'ig'),
    (match) => `<mark>${match}</mark>`
  ) : strProps

  const onCopy = () => {
    copy(strProps)
  }

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
        <div className={'font-semibold'}>{ev.name}</div>
        <div className={'link ml-auto flex gap-1 items-center'}>
          <span>Play Session</span>
          <Triangle size={10} color={'blue'} />
        </div>
      </div>
      <Segmented options={tabs} value={tab} onChange={(v) => setTab(v)} />
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
      {view === 'pretty' ?
        <div
          className={'overflow-y-auto flex flex-col gap-2'}
          style={{ height: 'calc(100% - 200px)' }}
        >
          {filteredArr.map(([key, value]) => (
            <div key={key} className={'flex items-center border-b'}>
              <div className={'flex-1'}>{key}</div>
              <div className={'flex-1 text-disabled-text'}>{value}</div>
            </div>
          ))}
        </div>
      : (
        <div className={'relative'}>
          <div onClick={onCopy} className={'absolute right-0 top-0 cursor-pointer hover:text-blue'}>
            <Files size={16} />
          </div>
        <pre dangerouslySetInnerHTML={{ __html: highlightedJson }} />
        </div>
       )}
    </div>
  );
}

function Triangle({ size = 16, color = 'currentColor' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color}
      className={'rotate-90'}
    >
      <path d="M0 0h24v24H0z" fill="none" />
      <path d="M12 2L1 21h22L12 2z" />
    </svg>
  );
}

export default EventDetailsModal;