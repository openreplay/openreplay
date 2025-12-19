import React from 'react';
import { Segmented, Input, Button } from 'antd';
import { X, List, Braces, Files, Code } from 'lucide-react';
import copy from 'copy-to-clipboard';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services';
import Event from 'App/mstore/types/Analytics/Event';
import { session, withSiteId } from '@/routes';
import { Link } from 'react-router-dom';
import { Icon, TextEllipsis } from 'UI';
import { getEventIcon } from './getEventIcon';
import Tabs from 'Components/shared/Tabs';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import AnimatedSVG, { ICONS } from '@/components/shared/AnimatedSVG';

const tabs = [
  {
    label: 'All Properties',
    value: 'all',
    key: 'all',
  },
  {
    label: 'OpenReplay Properties',
    value: 'default',
    key: 'default',
  },
  {
    label: 'Your Properties',
    value: 'custom',
    key: 'custom',
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
  const { filterStore } = useStore();
  const [query, setQuery] = React.useState('');
  const [tab, setTab] = React.useState(tabs[0].value);
  const [view, setView] = React.useState(views[0].value);
  const {
    data: event,
    error,
    isPending,
  } = useQuery<Event | null>({
    queryKey: ['event-details', event_id],
    retry: false,
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

  const isCustomProp = (key: string) => {
    if (!event) return false;
    return !(key in event.defaultProps);
  };

  const header = (
    <div className={'flex justify-between items-center'}>
      <div className={'font-semibold text-xl'}>Event</div>
      <div className={'p-2 cursor-pointer'} onClick={onClose}>
        <X size={16} />
      </div>
    </div>
  );
  console.log(isPending, error);
  if (isPending || !event) {
    return (
      <div className={'h-screen w-full flex flex-col gap-4 p-4'}>
        {header}
        <div className="flex flex-col w-full items-center justify-center mt-8 gap-4">
          <AnimatedSVG name={ICONS.LOADER} size={72} />
          <div className="font-semibold">Loading event details...</div>
        </div>
      </div>
    );
  }
  if (!isPending && error) {
    return (
      <div className={'h-screen w-full flex flex-col gap-4 p-4'}>
        {header}
        <div className="flex flex-col w-full items-center justify-center mt-8 gap-4">
          <AnimatedSVG name={ICONS.EMPTY_STATE} size={72} />
          <div className="font-semibold">Error loading event details.</div>
        </div>
      </div>
    );
  }
  return (
    <div className={'h-screen w-full flex flex-col gap-4 p-4'}>
      {header}
      <div className={'flex items-center justify-between'}>
        <div
          className={
            'px-2 py-1 rounded-lg bg-gray-lighter flex items-center gap-2'
          }
        >
          <div
            className={
              'flex items-center gap-2 code-font fill-black color-black'
            }
          >
            {event ? getEventIcon(event.isAutoCapture, event.event_name) : null}
          </div>
          <div className={'font-semibold'}>
            {filterStore.getFilterDisplayName(event?.event_name ?? 'Event')}
          </div>
          {event?.isAutoCapture ? (
            <div>({event?.event_name ?? 'event'})</div>
          ) : null}
        </div>
        <Link
          to={withSiteId(session(event?.session_id), siteId)}
          className={'ml-auto'}
        >
          <Button className={'flex gap-2 items-center'}>
            <span>Play Session</span>
            <Triangle size={10} color={'blue'} />
          </Button>
        </Link>
      </div>
      <div className="w-full">
        <Tabs items={tabs} activeKey={tab} onChange={setTab} />
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
              <div className={'mr-2 fill-black color-black'}>
                {isCustomProp(key) ? (
                  <Code size={12} />
                ) : (
                  <Icon name={'logo-small'} size={12} />
                )}
              </div>
              <TextEllipsis
                text={key}
                maxWidth={'150'}
                className={'w-[150px]'}
              />
              <TextEllipsis
                text={value}
                maxWidth={'420'}
                className={'text-disabled-text flex-1'}
              />
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

export default observer(EventDetailsModal);
