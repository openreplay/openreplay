import React from 'react';
import { Segmented, Input } from 'antd';
import { X, List, Braces, Files, Code } from 'lucide-react';
import copy from 'copy-to-clipboard';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services';
import Event from '@/mstore/types/Analytics/Event';
import { session, withSiteId } from '@/routes';
import { Link } from 'react-router-dom';

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

const views = [
  {
    label: <List size={14} />,
    value: 'pretty',
  },
  {
    label: <Braces size={14} />,
    value: 'json',
  },
];

function EventDetailsModal({
  event_id,
  onClose,
  siteId,
}: {
  event_id: string;
  onClose: () => void;
  siteId: string;
}) {
  const [query, setQuery] = React.useState('');
  const [tab, setTab] = React.useState(tabs[0].value);
  const [view, setView] = React.useState(views[0].value);
  const { data: event } = useQuery<Event | null>({
    queryKey: ['event-details', event_id],
    queryFn: async () => {
      const data = await analyticsService.getEvent(event_id);
      return new Event(data);
    },
    initialData: null,
  });
  const tabProps = event
    ? {
        all: event.allProps,
        custom: event.customProps,
        default: event.defaultProps,
      }
    : {
        all: {},
        custom: {},
        default: {},
      };
  const dataFields = tabProps[tab];
  const fieldArr = Object.entries(dataFields);
  const filteredArr =
    view === 'json'
      ? []
      : fieldArr.filter(([key, value]) => {
          const qReg = new RegExp(query, 'ig');
          return qReg.test(key) || qReg.test(value);
        });
  const strProps = JSON.stringify(
    {
      event: event?.event_name ?? 'event',
      properties: dataFields,
    },
    null,
    4,
  );
  const highlightedJson =
    view === 'pretty'
      ? ''
      : query
        ? strProps.replace(
            new RegExp(query, 'ig'),
            (match) => `<mark>${match}</mark>`,
          )
        : strProps;

  const onCopy = () => {
    copy(strProps);
  };

  return (
    <div className={'h-screen w-full flex flex-col gap-4 p-4'}>
      <div className={'flex justify-between items-center'}>
        <div className={'font-semibold text-xl'}>Event</div>
        <div className={'p-2 cursor-pointer'} onClick={onClose}>
          <X size={16} />
        </div>
      </div>
      <div className={'p-2 rounded-lg bg-active-blue flex items-center gap-2'}>
        <div>
          <Code size={16} />
        </div>
        <div className={'font-semibold'}>{event?.event_name ?? 'event'}</div>
        <Link
          to={withSiteId(session(event?.session_id), siteId)}
          className={'link ml-auto flex gap-1 items-center'}
        >
          <span>Play Session</span>
          <Triangle size={10} color={'blue'} />
        </Link>
      </div>
      <div className="w-fit ml-auto">
        <Segmented options={tabs} value={tab} onChange={(v) => setTab(v)} />
      </div>
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
      {view === 'pretty' ? (
        <div
          className={'overflow-y-auto flex flex-col gap-2'}
          style={{ height: 'calc(100% - 200px)' }}
        >
          {filteredArr.map(([key, value]) => (
            <div key={key} className={'flex items-center border-b'}>
              <div className={'w-[200px]'}>{key}</div>
              <div className={'flex-1 text-disabled-text'}>{value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={'relative overflow-y-auto'}
          style={{ height: 'calc(100% - 200px)' }}
        >
          <div
            onClick={onCopy}
            className={'absolute right-0 top-0 cursor-pointer hover:text-blue'}
          >
            <Files size={16} />
          </div>
          <pre dangerouslySetInnerHTML={{ __html: highlightedJson }} />
        </div>
      )}
    </div>
  );
}

export function Triangle({ size = 16, color = 'currentColor' }) {
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
